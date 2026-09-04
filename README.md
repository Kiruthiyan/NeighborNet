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
- Next.js, TypeScript, and Tailwind dashboard scaffold with resource, alert, decision, disaster overview, and task board surfaces
- DynamoDB table definitions updated for disaster events, volunteer alerts, and unified tasks

Still P1/P2:

- Real Strands SDK/Bedrock model calls instead of local deterministic agent facades
- Durable repository wiring for the new workflow tables
- AgentCore Runtime packaging on port `8080` with `/ping` and `/invocations`
- EventBridge, SNS/SES, AgentCore Memory, CloudWatch, S3 audit exports, and production auth
- 100+ scenario evaluation suite

Known setup caveats:

- `backend/poetry.lock` is still missing; `poetry lock` stalled during dependency resolution in this environment.
- Frontend dependencies are not installed; `npm install` also stalled, so the dashboard scaffold has not been built locally.
- Backend tests pass, with existing Pydantic/Starlette deprecation warnings.
- RED risk decisions are blocked and never executed autonomously.

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

- Backend tests: `cd backend && python -m pytest -q`
- Demo run: `cd backend && python -m src.demo.scenario_runner`
- API server: `cd backend && python -m uvicorn src.main:app --reload --port 8000`
- Frontend, after dependencies install: `cd frontend && npm run dev`

## MVP Boundaries

The MVP is one city district with 5-10 locations, about 150 food/resource units, about 45 requests, and about 18 volunteers. It handles prepared meals, fresh produce, pantry items, admin-created disaster events, volunteer alerts, accept/decline responses, task assignment, and recovery from volunteer/route/resource disruption.

Out of scope: medical treatment assignment, evacuation orders, rescue operations requiring authorities, generic skill sharing, social networking, gamification, financial features, blockchain, ML training, and nationwide deployment.
