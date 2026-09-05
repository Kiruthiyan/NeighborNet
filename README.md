# NeighborNet Resilience

Autonomous community coordination using the Strands Agents SDK.

> "The community plan repairs itself when reality changes."

NeighborNet Resilience is an autonomous community coordination agent that reduces food waste during normal operations and, when disasters occur, automatically mobilizes nearby volunteers, assigns relief tasks, and repairs the response plan as conditions change.

NeighborNet is one system with two operating modes:

- Normal Community Mode: match surplus food/resources with nearby compatible requests and assign delivery tasks.
- Disaster Response Mode: activate urgent volunteer dispatch and relief-task recovery for admin-created disaster events.

Both modes reuse the same volunteers, organizations, inventory, requests, routes, planning engine, recovery engine, risk classifier, and audit system.

## Current Status

This repository now has a working local P0 MVP foundation.

Implemented:

- Shared Normal Community Mode and Disaster Response Mode models, including operating mode, disaster events/needs, volunteer alerts, and unified task lifecycle
- Extended volunteer profile fields for verified status, skills, service area, notification state, workload, and last known zone
- Deterministic volunteer matching, planning, recovery, and GREEN/AMBER/RED risk classification
- FastAPI routers for resources, requests, volunteers, disasters, alerts, tasks, disruptions, decisions, audit, metrics, and dashboard summaries
- Local Orchestrator, Sentinel, Planner, and Recovery facades that preserve the planned Strands agents-as-tools boundary
- Deterministic combined demo: surplus food match, flood event, volunteer alert/accept/decline, relief assignment, cancellation/road closure recovery, one AMBER approval, audit/metrics update
- Next.js, TypeScript, and Tailwind unified dashboard page (metrics, disaster overview, volunteer response panel, disaster task board) served from `frontend/lib/api.ts` against the FastAPI backend
- DynamoDB table definitions updated for disaster events, volunteer alerts, and unified tasks
- API-level test coverage (`tests/test_api.py`) for the disaster create/dispatch/assign, volunteer alert accept/decline, task lifecycle, disruption/recovery, and AMBER decision-approval HTTP flows
- Real Strands Agents SDK orchestrator (`src/agents/strands_orchestrator.py`) running on Amazon Bedrock, exposed via `POST /api/agent/instruct`. It takes a natural-language coordinator instruction and decides which deterministic tools (`src/agents/strands_tools.py`) to call — the tools are thin wrappers over the same `CoordinationService`/engines the rest of the app uses, so the LLM never invents matching/assignment/recovery/risk logic of its own. There is deliberately no tool for RED-tier actions (medical/evacuation/rescue/unsafe travel/restricted-zone entry), and AMBER outcomes always create a pending `Decision` the agent cannot approve itself. Requires `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` with Bedrock access for the configured `BEDROCK_MODEL_ID` (defaults to `us.amazon.nova-pro-v1:0`); covered by `tests/test_agent_api.py` with the Bedrock call mocked so the suite runs without live credentials.
- The local `agents/orchestrator.py`/`sentinel.py`/`planner.py`/`recovery.py` deterministic facades remain in place underneath — the Strands agent is an additional LLM-driven entry point on top of them, not a replacement.

- Optional shared persistence: `PERSIST_TO_DYNAMODB=true` (see `.env.example`) makes `CoordinationService` write-through disasters, alerts, tasks, decisions, users, and volunteers to real AWS DynamoDB tables and reload from them on startup, so a 3-person team pointed at the same AWS account sees the same live state instead of each person's own reset-on-restart in-memory copy. Disabled by default so local dev and the test suite need no AWS credentials at all; covered by `tests/test_dynamo_persistence.py` with a fake in-memory store (no real AWS needed to run tests).

Still P1/P2:

- Durable repository wiring for inventory/requests and the remaining tables not yet covered by the new opt-in DynamoDB persistence (see above)
- AgentCore Runtime packaging on port `8080` with `/ping` and `/invocations`
- EventBridge, SNS/SES, AgentCore Memory, CloudWatch, S3 audit exports, and production auth
- 100+ scenario evaluation suite
- Additional dashboard surfaces beyond the unified page: dedicated Resources, Requests, Volunteers, Disruptions, Decisions, Activity/Audit, Evaluations, and Settings/Policies routes are not yet separate pages (their data currently only appears rolled up into the single dashboard page)

Known setup caveats (resolved 2026-09-05):

- `backend/poetry.lock` now generates successfully. The earlier stall was three real, sequential dependency conflicts between `strands-agents` (which pulls in `mcp`) and stale pins for `aioboto3`, `uvicorn`/`python-multipart`, and `httpx`, plus `numpy`/`pandas` pins from 2023 that predate Python 3.14 wheel availability. `poetry lock` never hung — it was failing fast each time; the previous "stalled" read likely came from cutting off the resolver before it printed the conflict. Fix applied in `backend/pyproject.toml`: `aioboto3 ^15.5.0`, `uvicorn ^0.31.1`, `python-multipart ^0.0.9`, `httpx ^0.27.1`, `fastapi ^0.115.0`, `numpy ^2.1.0`, `pandas ^2.2.3`. `numpy`/`pandas`/`aioboto3`/`strands-agents-tools` are declared but not yet imported anywhere in `src/` (only `boto3` is actually used) — worth reconsidering as dependencies once persistence/Strands wiring lands.
- Local dev requires Python 3.11+ (tested against 3.14.6) — no separate venv juggling needed now that the lock file resolves on 3.14.
- `npm install` in `frontend/` succeeds; it is just slow (~4 minutes on a cold cache against the public npm registry), which reads as a stall if cut off early. `npm run build` now succeeds after adding the missing `frontend/lib/api.ts` client module and a couple of TypeScript typing fixes in `app/page.tsx`.
- Backend: 50/50 tests pass (`cd backend && poetry run pytest -q`), with pre-existing Pydantic v1-style-validator and Starlette `TestClient`/`httpx` deprecation warnings (functional, not blocking; migration is P2).
- RED risk decisions are blocked and never executed autonomously; AMBER decisions require explicit human approval before the workflow resumes (both verified by `tests/test_api.py` and the demo runner).

## Canonical Documentation

Planning source of truth lives in `docs/`:

- [Project Requirements](docs/PROJECT_REQUIREMENTS.md)
- [System Design](docs/SYSTEM_DESIGN.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [AWS Architecture](docs/AWS_ARCHITECTURE.md)
- [Agent Architecture](docs/AGENT_ARCHITECTURE.md)
- [Data Model](docs/DATA_MODEL.md)
- [API Spec](docs/API_SPEC.md)
- [UI/UX Plan](docs/UI_UX_PLAN.md)
- [Demo Plan](docs/DEMO_PLAN.md)
- [Evaluation Plan](docs/EVALUATION_PLAN.md)

Root-level `requirements.md`, `design.md`, and `tasks.md` are retained as redirects only to avoid duplicate planning truth.

## Core Technical Direction

- Strands Agents SDK for agent reasoning and multi-agent orchestration
- Amazon Bedrock for foundation models
- Amazon Bedrock AgentCore Runtime for production agent runtime
- AgentCore Memory for durable operational preferences only
- FastAPI and Python backend
- Next.js, TypeScript, and Tailwind frontend
- DynamoDB persistence
- EventBridge triggers
- SNS/SES notifications where useful
- CloudWatch observability
- S3 audit/artifact storage where useful

Preferred agent pattern is Strands agents-as-tools, with a NeighborNet Orchestrator coordinating Sentinel, Planner, and Recovery specialist agents.

## Local Commands

- Install backend deps: `cd backend && poetry install --no-root`
- Backend tests: `cd backend && poetry run pytest -q`
- Demo run: `cd backend && poetry run python -m src.demo.scenario_runner`
- API server: `cd backend && poetry run uvicorn src.main:app --reload --port 8000`
- Frontend install: `cd frontend && npm install` (first run is slow, ~4 minutes on a cold cache; let it finish)
- Frontend dev server: `cd frontend && npm run dev`
- Frontend production build: `cd frontend && npm run build`

## MVP Boundaries

The MVP is one city district with 5-10 locations, about 150 food/resource units, about 45 requests, and about 18 volunteers. It handles prepared meals, fresh produce, pantry items, admin-created disaster events, volunteer alerts, accept/decline responses, task assignment, and recovery from volunteer/route/resource disruption.

Out of scope: medical treatment assignment, evacuation orders, rescue operations requiring authorities, generic skill sharing, social networking, gamification, financial features, blockchain, ML training, and nationwide deployment.
