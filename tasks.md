# Tasks

Canonical implementation planning still lives in:

- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- [docs/DEMO_PLAN.md](docs/DEMO_PLAN.md)
- [docs/EVALUATION_PLAN.md](docs/EVALUATION_PLAN.md)

This file additionally tracks the live, prioritized remaining work for the
**AWS "Agents for Humans" hackathon submission (deadline: Monday)**.

## Done

- [x] Backend deterministic engines, API, and demo runner (57/57 tests passing)
- [x] Real Strands Agents SDK orchestrator wired to Amazon Bedrock (`POST /api/agent/instruct`)
- [x] Shared AWS DynamoDB persistence (`PERSIST_TO_DYNAMODB=true`), verified live end-to-end
- [x] Frontend: all required pages built (Dashboard, Resources, Requests, Volunteers, Active Plan, Disruptions, Decisions, Audit, Evaluations, Settings, Disaster Overview, Volunteer Response, Disaster Task Board) + new Agent Console page
- [x] `frontend/tsconfig.json` fix (`allowJs`, `@/*` path alias)
- [x] Test isolation fix so `pytest` never touches the real shared AWS DB

## Blocking — must finish before submission

- [ ] **Fix Bedrock access for the `hackathon-backend` IAM user** (agent calls currently fail with `AccessDeniedException`):
  1. IAM Console → Users → `hackathon-backend` → Add permissions → attach `AmazonBedrockFullAccess` (or a scoped policy allowing `bedrock:InvokeModel` + `bedrock:InvokeModelWithResponseStream`)
  2. Bedrock Console (region **us-west-2**) → Model access → enable **Amazon Nova Pro**
  3. Tell Claude once done so the Agent Console can be retested against real Bedrock
- [ ] **Rotate the AWS access key** that was pasted into chat earlier (IAM → Users → `hackathon-backend` → Security credentials → deactivate old key, create new one, update everyone's local `.env`)
- [ ] Get both teammates' `backend/.env` set up with the shared AWS credentials + `PERSIST_TO_DYNAMODB=true` so all three of you see the same live data
- [ ] Register/complete the Devpost submission (project description, team, track selection)
- [ ] Record a demo video (judging is largely video-first — a working local demo alone isn't enough)
- [ ] Push all pending local commits (see git log vs `origin` for what's outstanding)

## Should-do — strengthens the submission

- [ ] Full click-through QA pass of every frontend page against the live backend, fix anything broken on camera
- [ ] Optional: AWS Builder Center blog post about the build journey, tagged `#AgentsForHumans` (bonus points)

## Nice-to-have — only if time remains

- [ ] Minimal auth (coordinator vs. volunteer roles) — currently no login/permission enforcement anywhere
- [ ] Deeper constraint validation polish (dietary/allergen edge cases, route safety)
- [ ] 100+ scenario evaluation suite (explicitly out of scope for the demo per `docs/EVALUATION_PLAN.md`)

## How to run it

### Backend

```powershell
cd backend
poetry install --no-root
poetry run pytest -q                              # should show 57 passed
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

### Fixing Bedrock for the Agent Console (still pending — see Blocking above)

1. IAM Console → Users → `hackathon-backend` → Add permissions → attach `AmazonBedrockFullAccess`
2. Bedrock Console (region **us-west-2**) → Model access → Enable specific models → check **Amazon Nova Pro** → submit
3. Restart the backend, then test:
```powershell
curl -X POST http://localhost:8000/api/agent/instruct -H "Content-Type: application/json" -d "{\"instruction\": \"Summarize current disaster status.\"}"
```
or use the Agent Console page in the browser at `http://localhost:3000/agent`.
