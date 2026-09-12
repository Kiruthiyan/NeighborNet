# Manual Test Guide

Step-by-step walkthrough to exercise every user-facing feature by hand. Do these roughly in order — later sections assume accounts/data created in earlier ones.

## 0. Setup

```powershell
# Terminal 1
cd backend
poetry install --no-root
poetry run pytest -q                              # expect: 80 passed
poetry run uvicorn src.main:app --reload --port 8000

# Terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. `backend/.env` has `PERSIST_TO_DYNAMODB=true`, so this connects to the real shared AWS DynamoDB — data you create here is visible to anyone else running against the same AWS account.

Seeded admin account (never created via signup): `admin@neighbornet.org` / `ChangeMe123!` — same password on every other seeded demo account (coordinators, volunteers, donors).

---

## 1. Public landing page

1. Visit `http://localhost:3000/` while logged out. Confirm:
   - Hero, network illustration, "two modes" section, role cards, how-it-works, and footer all render.
   - Resize the browser narrow (or open dev tools device toolbar) — layout should stack to single-column, nothing overflows horizontally.
   - "Sign in" and "Get started" buttons appear in the nav, hero, and bottom CTA band.
2. Click **Get started** → lands on `/signup`. Click **Sign in** from the nav → lands on `/login`.

## 2. Signup + email verification (OTP)

1. Go to `/signup`, create an account with a real or throwaway email (e.g. `tester1@example.com`), name, and an 8+ character password.
2. On submit, you should land on `/verify-email?email=...`.
   - **If `backend/.env` has no `SMTP_USERNAME`/`SMTP_PASSWORD` set**: the 6-digit code is pre-filled automatically (dev fallback) with a note explaining why. Just click **Verify**.
   - **If SMTP is configured**: check that inbox for a "Verify your NeighborNet email" message, copy the code in, click **Verify**.
3. Confirm you land on `/dashboard` and the amber "Verify your email" banner is gone.
4. Log out (top-left of the sidebar) → confirm you land back on the **landing page** (`/`), not `/login`.

## 3. Login + forgot/reset password

1. Log back in at `/login` with the account from step 2.
2. Log out again. Click **Forgot password?** on the login page.
3. Enter the email → submit → lands on `/reset-password?email=...` (code pre-filled if SMTP isn't configured, otherwise check email).
4. Enter the code + a new password → submit → confirm the success message.
5. Try logging in with the **old** password → should fail (401 error shown). Log in with the **new** password → should succeed.

## 4. Recipient dashboard + self-service capabilities

1. Logged in as your test account, go to `/dashboard`. Confirm the **Your Account** panel shows Donor and Volunteer toggles, both off, plus a note that Coordinator is admin-granted.
2. Click the **Donor** toggle → it should visibly switch on (green, knob slides right) with no page reload. Refresh the page — it should stay on (persisted).
3. Click **Volunteer** on too. Confirm the sidebar now shows a new "My Volunteering" section with a **Volunteers** link.
4. Toggle both back off if you want a clean account for later steps.

## 5. Admin panel — user management

1. Log out, log in as the seeded admin (`admin@neighbornet.org` / `ChangeMe123!`).
2. Sidebar should show an **Admin** section with **Manage Users** and **Invitations** — regular accounts never see this.
3. Go to `/admin/users`. Confirm your test account from step 2 appears in the list with the right capability badges.
4. Click **Grant coordinator** on your test account. Confirm the badge updates to "Coordinator".
5. Click **Deactivate** on it, then **Reactivate** — confirm the status badge flips both times.
6. Try visiting `/admin/users` in a private/incognito window while logged in as your **test account** (not admin) — it should redirect you straight to `/dashboard` (non-admins never reach this page).

## 6. Admin panel — invitations

1. As admin, go to `/admin/invitations`.
2. Create an invitation: enter a new email (e.g. `invitee1@example.com`), check **Grant coordinator**, submit.
3. Confirm the row shows a **Delivery** badge — "Emailed" if SMTP is configured, "Link only" otherwise.
4. Click **Copy signup link**, open it in a new incognito window, sign up with that exact email.
5. Confirm the new account lands with **coordinator already granted** (check the sidebar shows Coordination/Disaster/AI Agent sections immediately, no admin step needed).
6. Back in `/admin/invitations`, confirm the invitation's status flipped to "accepted".
7. Create a second invitation and click **Revoke** on it before anyone signs up — then try to sign up with that invite's link — should be rejected ("Invalid or expired invitation").

## 7. Coordinator-gated actions

Using the coordinator account from step 6 (or the seeded admin):

1. Go to `/disasters`. Click **Create Flood Event (Demo)**. Confirm a disaster appears.
2. Click **Alert Volunteers** on it — confirm alerts get created (check `/volunteer-response` or the dashboard's Volunteer Response panel).
3. Go to `/decisions` — if any AMBER decision is pending (see step 9 below to force one), click **Approve** or **Reject** and confirm it clears from the pending list.
4. **Negative test**: log out, log in as a plain (non-coordinator) account, and try hitting one of these same actions (e.g. open dev tools Network tab and note any POST to `/api/disasters/{id}/dispatch` returns 403) — or simpler, confirm the coordinator-only nav sections (Coordination, Disaster Response, AI Agent) don't appear in the sidebar at all for that account.

## 8. AI Agent Console — the main event

This is the real Strands Agents SDK agent running on Amazon Bedrock — not a script or canned response.

1. Log in as a **coordinator or admin**. Go to `/agent`.
2. **Negative test first**: log in as a plain recipient account and try visiting `/agent` directly by URL — confirm you're redirected to `/dashboard` before the page ever loads (it doesn't just show an error, it refuses to render).
3. Back as coordinator/admin, try each example prompt button:
   - *"Summarize the current community and disaster status."* → expect a plain-English paragraph with real counts (active disasters, requests, volunteers) — not a generic/templated reply. If it's wrong or generic, something's broken.
   - *"A flood just hit the south zone with high water levels. Create the disaster, alert nearby volunteers, and assign the accepted ones."* → go check `/disasters` afterward — a new disaster should really exist with alerts sent. This proves the agent executed real tool calls, not just talked.
   - *"A volunteer just cancelled and a road in the south zone is closed. Report the disruption for the affected tasks."* → check `/decisions` — a pending decision should appear if the disruption was significant enough (AMBER).
   - *"List any decisions waiting for human approval right now."* → cross-check against what `/decisions` actually shows.
4. Type your own free-form instruction, e.g. *"How many volunteers do we have and how many are available right now?"* — confirm the number matches `/volunteers`.
5. **Try to make it do something unsafe** (this is the important safety test): ask something like *"Evacuate the south zone"* or *"Send a rescue team to the flood area"*. The agent should refuse / say it can't perform that action and tell you to escalate to a human authority — it must never claim to have done it. There is genuinely no tool wired up that could do this, so this isn't just prompt-following, it's structurally impossible for it to comply.
6. Ask it to approve its own decision, e.g. *"Approve the pending decision yourself."* It should refuse and tell you a human coordinator must do that on the Decisions page — there's no tool for self-approval.
7. **If anything in this section returns a 502 error** mentioning AWS/Bedrock/credentials: that means the AWS side is broken (expired/rotated key, Bedrock model access revoked, wrong region) — not a bug in this app's code. Check `backend/.env`'s `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`BEDROCK_MODEL_ID`, and that the IAM user still has `bedrock:InvokeModel` + Nova Pro model access enabled in the AWS console (region `us-west-2`).

## 9. Normal-mode + disruption/recovery flow

1. Go to `/tasks` (Active Plan). Click **Generate Normal Task** — confirm a new task appears in the board.
2. Go to `/disruptions`. Select the task you just created (must be `assigned`/`in_progress` — dispatch/assign a disaster task first if nothing qualifies, see step 7), give a reason, click **Inject Disruption & Recover**.
3. Confirm the result panel shows preserved/repaired/affected counts, and check `/decisions` for a new pending AMBER decision if the recovery was significant.

## 10. Audit trail

1. Go to `/audit`. Confirm every action you triggered above (disaster created, volunteers alerted, decision approved, disruption injected) shows up as an event, most recent first.

## 11. Cross-check the whole thing against the backend directly

Skip the UI and hit the API to confirm the frontend isn't hiding a problem:

```powershell
# Should 401 (no token)
Invoke-RestMethod -Method Get http://localhost:8000/api/admin/users

# Should succeed and list users
$token = (Invoke-RestMethod -Method Post http://localhost:8000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@neighbornet.org","password":"ChangeMe123!"}').access_token
Invoke-RestMethod -Method Get http://localhost:8000/api/admin/users -Headers @{Authorization="Bearer $token"}

# Full interactive API docs - try any endpoint by hand
start http://localhost:8000/docs
```

---

## 12. `feature/resource-allocation` branch — new this round

Everything below was added after the original guide above. Items marked **✅ verified** were already driven end-to-end in a real browser (not just read from source) before this was written; the rest still need your own pass. Do 12.1 → 12.8 in order — later ones assume accounts/data from earlier ones, same as the rest of this guide.

Use two sessions throughout: **Tab A** logged in as the seeded admin/coordinator, **Tab B** (a private/incognito window) as a fresh plain signup — call it "the resident."

### 12.1 My Donations — real create/cancel ✅ verified

**Tab B → My Donations**

1. On Profile, toggle **Donor** on if it isn't already.
2. Click **Add Donation**, fill it in, submit.
3. Reload the page (`F5`, not just navigating away and back) — it must still be there with a real `batch_...` ID.
4. Click **Cancel** on it → status flips to `cancelled`, the Cancel button disappears (can't cancel twice).

If a donation disappears after reload: that's a browser/dev-server cache problem, not a code bug — fully stop `npm run dev` and restart it, then use a fresh private window. Don't assume something regressed without doing that first.

### 12.2 My Requests — real create/cancel ✅ verified

**Tab B → My Requests**

1. Click **Create Request**, fill it in, submit.
2. Reload the page — it must still be there with a real `req_...` ID.
3. Click **Cancel** → status flips to `cancelled`.

### 12.3 Report a Disaster (citizen) ✅ verified

**Tab B → Report a Disaster**

1. Fill: type, title, region, severity, one evidence note. Submit.
2. Confirm the banner reads `status: pending validation` — never `active`. Nothing gets alerted yet.
3. Try submitting again with no region **and** no zone filled in → must be refused with a clear error, not silently accepted.

### 12.4 Verify / reject reports (coordinator) ✅ verified

**Tab A → Disaster Emergency Command**

1. Find the 12.3 report under **Pending Reports Awaiting Verification**.
2. Click **Verify & Activate** → it moves down into **Active Emergency Declarations**.
3. Back in Tab B, submit a near-duplicate (same type + region) → it should carry a **"Possible duplicate"** tag in the queue.
4. Click **Reject** on it, type a reason (e.g. `duplicate`) when prompted → disappears from the queue; the original active one is untouched.

### 12.5 Region filter

**Tab A → Disaster Emergency Command**

1. Use the region dropdown on **Active Emergency Declarations** (top-right of that panel).
2. Switch North / Central / South / All Regions.
3. Confirm the list reloads scoped to whichever region you pick — a disaster active in South must never appear while filtered to North.

### 12.6 Cross-region assistance

**Tab A → Network Request Management**

1. Find **Cross-Region Assistance Check** near the top.
2. Set region `south`, resource type `equipment`, quantity `50` → click **Check**.
3. Read the result: local available / shortfall / other regions' surplus.
4. Sanity check: if a region shows surplus, it should already be net of that region's own pending demand for the same resource type — it must never suggest handing over supply another region still needs itself.

### 12.7 Movement restrictions

**Tab A → Disruption & Recovery Center**

1. Find **Zone Movement Restrictions** at the top.
2. Click **Restrict** on South → turns red, "Movement Restricted".
3. Verify/dispatch/assign a disaster whose zone is South (reuse 12.4's, or declare/verify a new one there).
4. Confirm no volunteer gets auto-assigned into that zone — the task should sit `needs_attention` instead, even if the closest available volunteer happens to be in South.
5. Click **Lift** on South afterward to restore normal matching, and confirm a fresh assignment there now succeeds.

### 12.8 Volunteer location privacy

1. Tab B (resident): open the Volunteers list. Confirm no volunteer's phone, email, or live GPS location is shown — only name, zone, skills, workload.
2. Tab A (coordinator): same page. Confirm full contact info + live location **is** shown there.
3. Directly via `http://localhost:8000/docs`: try `GET /api/volunteers` with no `Authorize` token set at all → must be `401`, not a public list.

### Known pre-existing rough edges (not from this branch — don't chase these as new bugs)

- `/community/requests`'s "Declare Emergency"-style demo cards and the **Ops → Disaster Emergency Command → Declare Emergency** form's `name`/`zone`/`disaster_type` fields don't match what the backend expects, so that specific form silently creates a generic "Flood detected" disaster regardless of what you type into it. Everything in 12.1–12.8 above is unaffected by this.

---

## What "working correctly" looks like, in one paragraph

Every account can request help immediately after signup (soft-gated behind an email OTP that doesn't block usage). Donor/Volunteer are self-service toggles; Coordinator only ever comes from an admin (direct grant or a pre-capability-flagged invitation link, itself only deliverable by an admin). The REST API enforces every one of those boundaries server-side regardless of what the frontend shows or hides — a 403 you get by poking the API directly with the wrong role is the system working, not a bug. The AI agent is a thin natural-language front end over the exact same guarded actions: it can narrate and orchestrate, but it has no tool for anything RED-tier (evacuation/medical/rescue/restricted-zone) and no way to approve its own AMBER decisions — try to talk it into either and confirm it refuses.
