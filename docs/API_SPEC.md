# API Spec

## Current API

Implemented:

- `GET /`
- `GET /health`

Planned API routers are commented in `backend/src/main.py` and should be implemented before frontend work depends on them.

## Response Conventions

- Use JSON responses.
- Include stable IDs for all entities.
- Include `operating_mode` for mode-sensitive resources.
- Include `correlation_id` on workflow-changing operations.
- Validation failures return structured errors with machine-readable code and human-readable message.
- Autonomous execution endpoints must expose validation and risk results.

## Auth & Admin (implemented — see docs/AUTH_PLAN.md)

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me/capabilities`
- `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` (all OTP-based, see docs/AUTH_PLAN.md)
- `GET/PATCH/DELETE /api/admin/users(/{id})`, `POST /api/admin/invitations`, `GET /api/admin/invitations`, `POST /api/admin/invitations/{id}/revoke`

Coordinator-gated (require a coordinator or admin bearer token): `POST /api/decisions/{id}/approve`, `POST /api/decisions/{id}/reject`, `POST /api/disasters`, `POST /api/disasters/{id}/dispatch`, `POST /api/disasters/{id}/assign`.

## Planned Endpoints

Dashboard:

- `GET /api/dashboard/readiness`
- `GET /api/dashboard/activity?limit=50`
- `GET /api/dashboard/metrics`
- `GET /api/dashboard/disaster-overview`

Resources:

- `GET /api/inventory`
- `POST /api/inventory`
- `PATCH /api/inventory/{batch_id}`
- `POST /api/inventory/{batch_id}/cancel`

Requests and needs:

- `GET /api/requests`
- `POST /api/requests`
- `PATCH /api/requests/{request_id}`
- `POST /api/requests/{request_id}/cancel`
- `GET /api/disasters/{disaster_id}/needs`
- `POST /api/disasters/{disaster_id}/needs`

Volunteers:

- `GET /api/volunteers`
- `POST /api/volunteers`
- `PATCH /api/volunteers/{volunteer_id}`
- `PUT /api/volunteers/{volunteer_id}/availability`
- `POST /api/volunteers/{volunteer_id}/cancel-task`

Disasters:

- `GET /api/disasters`
- `POST /api/disasters`
- `GET /api/disasters/{disaster_id}`
- `PATCH /api/disasters/{disaster_id}`
- `POST /api/disasters/{disaster_id}/resolve`
- `POST /api/disasters/{disaster_id}/dispatch`

Volunteer alerts:

- `GET /api/alerts`
- `GET /api/alerts/{alert_id}`
- `POST /api/alerts/{alert_id}/accept`
- `POST /api/alerts/{alert_id}/decline`
- `POST /api/alerts/{alert_id}/timeout`

Tasks and plans:

- `POST /api/tasks/generate`
- `GET /api/tasks`
- `GET /api/tasks/{task_id}`
- `PATCH /api/tasks/{task_id}/status`
- `POST /api/tasks/{task_id}/validate`
- `POST /api/tasks/{task_id}/recover`
- `GET /api/plans/current`
- `POST /api/plans/generate`

Disruptions:

- `GET /api/disruptions`
- `POST /api/disruptions/inject`
- `GET /api/disruptions/{event_id}`
- `POST /api/disruptions/{event_id}/recover`

Decisions:

- `GET /api/decisions/pending`
- `GET /api/decisions/{decision_id}`
- `POST /api/decisions/{decision_id}/approve`
- `POST /api/decisions/{decision_id}/reject`
- `POST /api/decisions/{decision_id}/hold`

Audit:

- `GET /api/audit`
- `GET /api/audit/{correlation_id}`

Evaluation:

- `POST /api/evaluations/run`
- `GET /api/evaluations/{run_id}`
- `GET /api/evaluations/latest`

Settings/Policies:

- `GET /api/settings/policies`
- `PUT /api/settings/policies`

## Alert Contracts

Volunteer alert response includes:

- `alert_id`
- `disaster_id`
- `disaster_location`
- `approximate_distance`
- `urgency`
- `task_category`
- `assistance_required`
- `expires_at`
- `status`

Accept request marks the volunteer eligible only. It must not directly assign final task.

## HITL Contracts

Pending decision response must include:

- `decision_id`
- `operating_mode`
- `risk_classification`
- `triggering_event`
- `responsible_agent`
- `tools_called`
- `evidence`
- `validation_results`
- `recommendation`
- `alternatives`
- `expires_at`
- `status`

RED decision behavior:

- API may record acknowledgement or manual-resolution notes.
- API must not expose an endpoint path that converts RED into autonomous execution.
