# Tasks

Canonical implementation planning still lives in:

- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- [docs/DEMO_PLAN.md](docs/DEMO_PLAN.md)
- [docs/EVALUATION_PLAN.md](docs/EVALUATION_PLAN.md)

This file additionally tracks the live, prioritized remaining work for the
**AWS "Agents for Humans" hackathon submission (deadline: Monday)**.

## Done

- [x] Backend deterministic engines, API, and demo runner (80/80 tests passing, up from 57 with the auth + agent-auth test additions)
- [x] Real Strands Agents SDK orchestrator wired to Amazon Bedrock (`POST /api/agent/instruct`) — coordinator-gated, retested live end-to-end against real Bedrock
- [x] Full authentication system (JWT, capabilities, admin panel, OTP email verification, forgot/reset password) — see `docs/AUTH_PLAN.md`
- [x] Public landing page at `/`, dashboard moved to `/dashboard`, logout returns to the landing page
- [x] **Migrated the shared AWS Users table**: it predated auth entirely (27 legacy users, no admin, no passwords) — `CoordinationService._backfill_legacy_auth_fields` now patches password/capabilities onto matching seed accounts and adds the missing admin account on first load, without touching any real signup. This was silently breaking login/the agent against the live shared DB until 2026-09-09.
- [x] Shared AWS DynamoDB persistence (`PERSIST_TO_DYNAMODB=true`), verified live end-to-end
- [x] Frontend: all required pages built (Dashboard, Resources, Requests, Volunteers, Active Plan, Disruptions, Decisions, Audit, Evaluations, Settings, Disaster Overview, Volunteer Response, Disaster Task Board, Agent Console, Admin Users/Invitations)
- [x] `frontend/tsconfig.json` fix (`allowJs`, `@/*` path alias)
- [x] Test isolation fix so `pytest` never touches the real shared AWS DB (or sends real email)

### Demo credentials

Admin (seeded, never created via signup): `admin@neighbornet.org` / `ChangeMe123!`
Same password for every other seeded demo account (2 coordinators, 19 volunteers, 5 donors) — see `backend/src/services/seed_data.py`. Real signups set their own password.

## Blocking — must finish before submission

- [x] **Bedrock access for the `hackathon-backend` IAM user** — retested live 2026-09-09: `POST /api/agent/instruct` successfully calls Bedrock (Nova Pro), invokes the `get_dashboard_summary` tool, and returns a correct narrated response. No longer blocking.
- [ ] **Rotate the AWS access key** that was pasted into chat earlier (IAM → Users → `hackathon-backend` → Security credentials → deactivate old key, create new one, update everyone's local `.env`)
- [ ] Get both teammates' `backend/.env` set up with the shared AWS credentials + `PERSIST_TO_DYNAMODB=true` so all three of you see the same live data
- [ ] Register/complete the Devpost submission (project description, team, track selection)
- [ ] Record a demo video (judging is largely video-first — a working local demo alone isn't enough)
- [ ] Push all pending local commits (see git log vs `origin` for what's outstanding)

## Should-do — strengthens the submission

- [ ] Full click-through QA pass of every frontend page against the live backend, fix anything broken on camera
- [ ] Optional: AWS Builder Center blog post about the build journey, tagged `#AgentsForHumans` (bonus points)

## Nice-to-have — only if time remains

- [x] Auth system: signup/login (JWT), self-service donor/volunteer toggle, admin-granted coordinator, admin panel (user CRUD + email invitations), OTP email verification, forgot/reset password. See `docs/AUTH_PLAN.md`.
- [x] Invitation email delivery via Gmail SMTP + App Password (`backend/.env` SMTP_* vars) — falls back to a copy-link when unconfigured
- [ ] Deeper constraint validation polish (dietary/allergen edge cases, route safety)
- [ ] 100+ scenario evaluation suite (explicitly out of scope for the demo per `docs/EVALUATION_PLAN.md`)

## How to run it

### Backend

```powershell
cd backend
poetry install --no-root
poetry run pytest -q                              # should show 80 passed
poetry run uvicorn src.main:app --reload --port 8000
```
API docs: `http://localhost:8000/docs`. `backend/.env` already has `PERSIST_TO_DYNAMODB=true`, so this connects to the real shared AWS DynamoDB.

Optional — run the deterministic demo story without the API:
```powershell
poetry run python -m src.demo.scenario_runner
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`.

### Testing the Agent Console

`/api/agent/instruct` is coordinator-gated (same as disaster/decision actions), so it needs a bearer token now:
```powershell
$token = (Invoke-RestMethod -Method Post http://localhost:8000/api/auth/login -ContentType "application/json" -Body '{"email":"admin@neighbornet.org","password":"ChangeMe123!"}').access_token
Invoke-RestMethod -Method Post http://localhost:8000/api/agent/instruct -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"instruction": "Summarize current disaster status."}'
```
Or just log in as the admin at `http://localhost:3000/login` and use the Agent Console page at `/agent`.
