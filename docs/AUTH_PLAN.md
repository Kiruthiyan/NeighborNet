# Authentication & Authorization Plan

Status: approved, implementation in progress. See `tasks.md` for current progress and the seeded demo admin credentials once created.

## Model

Two account tiers, plus independent capability flags on top of the `user` tier:

- **`admin`** — never created via signup. Seeded directly in the database (`seed_data.py` / a manual DB write). Has full operational access (superset of coordinator) plus user/invitation management.
- **`user`** — created via public signup. Always implicitly a **recipient** (can submit requests for help). From their dashboard, a user can self-toggle on:
  - `is_donor` — can list/manage inventory donations
  - `is_volunteer` — activates a `Volunteer` profile, can accept alerts/tasks
  - `is_coordinator` — **cannot self-toggle**. Only an admin can grant this (via the admin panel or a coordinator-flagged invitation), because coordinators approve RED-risk decisions and dispatch disaster response.

Why not a flat 5-role enum (admin/coordinator/volunteer/donor/recipient) like `docs/DATA_MODEL.md` originally sketched: real usage isn't mutually exclusive — the same person is often a recipient today and a volunteer next week. Modeling capabilities as independent flags on one account avoids duplicate accounts and matches how the user described wanting this to work.

## Auth mechanism

Email + password, backend-issued JWT (`python-jose` + `passlib`/`bcrypt`, already in `pyproject.toml`, previously unused). Frontend stores the token (localStorage, since frontend and backend are different origins) and sends it as `Authorization: Bearer <token>`.

## Email verification & password reset

Both OTP-based (6-digit code, 10-minute expiry, hashed like a password before storage - `User.otp_hash`/`otp_purpose`/`otp_expires_at`):

- Signup emails a verification OTP automatically. `POST /api/auth/verify-email` confirms it. Verification is **soft** - an unverified account can still log in and use the app; the frontend just shows a "Verify your email" banner until they do. `POST /api/auth/resend-verification` gets a new code.
- `POST /api/auth/forgot-password` emails a reset OTP (same generic response whether or not the email is registered, to avoid leaking which accounts exist). `POST /api/auth/reset-password` consumes it and sets a new password.
- When SMTP isn't configured (see below), these endpoints return the OTP directly in the response body (`dev_otp`) instead of emailing it, so the flow is still fully testable locally/in CI. Seeded demo accounts are created with `email_verified=True` since they never go through signup.

## Admin capabilities

- List/edit/delete any user; grant or revoke `is_coordinator`; activate/deactivate accounts.
- Create an invitation (email + optionally pre-granted capabilities, e.g. inviting someone straight in as a coordinator). MVP: the invite is a signup link the admin copies from the panel; real email delivery (SES/SNS) is a fast-follow, not required for the first working version.

## API surface (new)

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me/capabilities` (donor/volunteer only — server rejects a coordinator flag here)
- `GET/PATCH/DELETE /api/admin/users(/{id})`, `POST /api/admin/invitations`, `GET /api/admin/invitations`, `POST /api/admin/invitations/{id}/revoke`

## Data model changes

`User` (`backend/src/models/users.py`): drop the single `role: UserRole` enum in favor of `account_type: AccountType` (`admin`/`user`) + `capabilities: UserCapabilities` (`is_donor`, `is_volunteer`, `is_coordinator`) + `password_hash`. New `Invitation` model.

## Rollout

1. Backend: models, `src/auth/` (hashing, JWT, FastAPI dependencies), `/api/auth` + `/api/admin` routers, seed one demo admin, apply `require_coordinator`/`require_capability` guards to sensitive existing endpoints (decision approval, disaster dispatch, inventory creation).
2. Frontend: login/signup pages, auth context + token storage, capability-gated nav, a recipient-first dashboard with donor/volunteer opt-in toggles, an admin section (`/admin/users`, `/admin/invitations`).
3. Tests: `tests/test_auth_api.py` covering signup/login/me, capability self-toggle rejecting coordinator, admin CRUD, invite issue+redeem.

Full step-by-step implementation detail lives in the plan this was built from (ask Claude to re-share it if needed — it isn't duplicated here to avoid drift between the two documents).
