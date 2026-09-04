# Implementation Plan

## Progress Snapshot

Local P0 foundation is implemented for backend models, deterministic engines, FastAPI routers, local agent facades, seed fixtures, DynamoDB table definitions, demo runner, and a Next.js dashboard scaffold. Backend tests pass locally. Remaining P0 hardening is dependency lock generation, frontend dependency installation/build verification, durable persistence wiring for the new workflow tables, and replacing local agent facades with real Strands SDK integration when credentials/runtime are available.

## P0: Unified MVP

1. Setup and test reliability
   - Fix dependency metadata, including `pydantic-settings`.
   - Add or update lockfile.
   - Make current backend tests run reliably.
   - Keep root planning files as redirects.

2. Shared models and lifecycle
   - Add documented operating mode support: `normal`, `disaster`.
   - Add disaster event and disaster need models.
   - Extend volunteer model for verified status, current task count, service area, notification status, skills, and current/last known zone or location.
   - Generalize assignment/task lifecycle: `AVAILABLE`, `ALERTED`, `ACCEPTED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`.
   - Tests: model serialization, validation, status transitions.

3. Deterministic engines
   - Complete constraints for inventory, expiry, dietary, volunteer capacity, availability, delivery windows, blocked routes, route safety, destination constraints, workload, and policy rules.
   - Add `VolunteerMatcher` deterministic score: distance, availability, skill match, vehicle/capacity, urgency, workload, route feasibility.
   - Add `PlanningEngine` for normal food matching and disaster task assignment.
   - Add `RecoveryEngine` for disrupted tasks while preserving unaffected work.
   - Add `RiskClassifier` with stronger disaster RED rules.
   - Tests: normal matching, disaster matching, safety blocks, recovery preservation.

4. APIs and orchestration hooks
   - Add routers for resources, requests, volunteers, tasks, disasters, alerts, decisions, audit, and metrics.
   - Implement disaster creation for admin MVP.
   - Implement volunteer alert, accept, decline, and timeout handling.
   - Implement task status updates.
   - Implement recovery triggers for volunteer cancellation, no response, blocked route, resource loss, and task failure.
   - Tests: API contract and lifecycle tests.

5. Strands agents
   - Implement Orchestrator, Sentinel, Planner, and Recovery using agents-as-tools if current SDK supports it.
   - Normal Mode: detect inventory/request/volunteer/delivery events, plan delivery tasks.
   - Disaster Mode: process disaster events, identify affected zones, dispatch eligible volunteers, assign relief tasks.
   - Recovery: handle normal and disaster disruptions through the same preservation/repair flow.
   - Tests: mocked agent workflows and deterministic tool-call assertions.

6. Dashboard
   - Build operations dashboard pages for Dashboard, Resources, Requests, Volunteers, Active Plan/Tasks, Disruptions, Decisions, Activity/Audit, Evaluations, Settings/Policies.
   - Add Disaster Overview, Volunteer Response Panel, and Disaster Task Board.
   - Use dashboard notifications for MVP alerts.
   - Tests: key UI flows and decision-card behavior.

7. Demo
   - Implement combined hackathon story: normal surplus meal matching, admin flood event, volunteer alerts, accepted volunteers, relief assignment, volunteer cancellation, road closure, recovery, GREEN execution, one AMBER decision, audit/metrics update.
   - Keep full demo under 5 minutes.
   - Tests: deterministic reset and repeatable demo run.

## P1

- AgentCore Runtime deployment.
- EventBridge triggers.
- Production DynamoDB indexes and backup policy.
- SNS/SES notifications.
- AgentCore Memory for operational preferences only.
- Evaluation suite with 100+ scenarios.
- CloudWatch metrics and alarms.

## P2

- External weather/government integrations.
- Additional notification channels.
- Richer route visualization.
- Reporting polish and optional integrations.

No unrelated features before P0 works end to end.

## Definition of Done

- Normal and Disaster modes share the same core entities and engines.
- Volunteer acceptance triggers eligibility, not direct assignment.
- Recovery preserves unaffected tasks in both modes.
- RED actions never execute autonomously.
- Dashboard supports the full demo and operational audit trail.
- Metrics are measured, not fabricated.
