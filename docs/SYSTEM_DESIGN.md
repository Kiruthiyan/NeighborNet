# System Design

## Architecture Principle

NeighborNet is one shared coordination system with two operating modes. Strands agents reason about workflow and tradeoffs. Deterministic Python engines enforce hard constraints, scoring, recovery, and execution gates.

## Shared Subsystems

Both Normal Community Mode and Disaster Response Mode reuse:

- volunteers
- organizations
- inventory/resources
- requests/needs
- routes
- generalized tasks/assignments
- planning engine
- recovery engine
- risk classifier
- audit system
- dashboard

Disaster Mode changes urgency, safety policy, eligible task categories, and volunteer dispatch behavior. It does not create a separate application.

## Components

- Next.js operations dashboard: main coordinator interface.
- FastAPI backend: state, disaster, alert, task, decision, audit, and evaluation APIs.
- Strands Orchestrator: selects normal, disaster, or recovery workflow.
- Sentinel Agent: monitors normal disruptions and disaster events.
- Planner Agent: creates normal delivery tasks and urgent disaster logistics tasks.
- Recovery Agent: repairs disrupted plans/tasks while preserving unaffected assignments.
- Deterministic engines:
  - `ConstraintValidator`
  - `PlanningEngine`
  - `RecoveryEngine`
  - `RiskClassifier`
  - `VolunteerMatcher`
- Persistence: DynamoDB in production; local DynamoDB for development.
- Eventing: EventBridge in AWS; direct API/demo triggers locally.
- Notifications: dashboard required for MVP; SNS/SES optional/P1.
- Observability: structured logs and CloudWatch metrics.

## Current Repository State

Already present:

- FastAPI app shell
- Pydantic models for existing food coordination entities
- DynamoDB table creation service
- seed data generator
- deterministic inventory/request/volunteer/allocation/safety tools
- early constraint validation engine
- tests for config, models, and tools

Missing:

- unified operating-mode model
- disaster event model/API
- volunteer alert model/API
- generalized task lifecycle APIs
- Strands agent implementations
- API routers beyond health/root
- frontend app
- demo/evaluation modules
- AWS deployment infrastructure

## Normal Mode Event Flow

1. Resource is added or request changes.
2. Sentinel detects relevant state change.
3. Planner finds compatible request/resource pairs.
4. VolunteerMatcher scores eligible volunteers.
5. ConstraintValidator checks quantity, expiry, dietary restrictions, capacity, availability, delivery window, and route availability.
6. RiskClassifier labels action GREEN/AMBER/RED.
7. GREEN task assignment executes.
8. AMBER creates decision card.
9. RED is blocked.
10. Audit and dashboard update.

## Disaster Mode Event Flow

1. Admin creates disaster event, such as flood in Zone B.
2. Sentinel identifies affected zones, needs, route closures, and sudden demand.
3. System finds nearby verified volunteers with relevant availability and skills.
4. Volunteer alerts are sent.
5. Accepting volunteer becomes eligible.
6. Planner scores accepted volunteers against specific relief tasks.
7. ConstraintValidator checks capacity, workload, route safety, task type, policy, and destination constraints.
8. RiskClassifier gates execution.
9. GREEN relief task assigns automatically.
10. AMBER waits for coordinator approval.
11. RED is blocked and audited.

## Recovery Flow

1. Task disruption occurs: decline, timeout, cancellation, blocked route, missing resource, or failed task.
2. Recovery identifies what failed.
3. Recovery preserves unaffected tasks.
4. Recovery finds next-best volunteer/resource/route.
5. Deterministic validation checks replacement.
6. GREEN reassigns automatically.
7. AMBER creates coordinator decision.
8. RED remains blocked.
9. Workflow resumes after human decision.
10. Final plan/task set is validated and audited.

## Safety Model

Volunteer acceptance never directly assigns final work. It only marks the volunteer as eligible for deterministic matching.

Disaster Mode has stronger safety gates:

- No medical treatment assignment.
- No evacuation or authority decisions.
- No unsafe travel.
- No entry into officially restricted zones.
- No autonomous RED execution.

Failed validation blocks execution regardless of agent recommendation.
