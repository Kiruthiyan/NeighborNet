# Project Requirements

## Final Product Definition

NeighborNet Resilience is one autonomous community coordination system with two operating modes.

- Normal Community Mode reduces food waste by matching surplus food/resources with nearby community needs.
- Disaster Response Mode mobilizes nearby verified volunteers for urgent low-risk relief logistics when an administrator creates a disaster event.

The system must not become two products. Both modes reuse the same volunteers, organizations, inventory, requests, routes, planning engine, recovery engine, risk classifier, and audit system.

Core message: NeighborNet Resilience is an autonomous community coordination agent that reduces food waste during normal operations and, when disasters occur, automatically mobilizes nearby volunteers, assigns relief tasks, and repairs the response plan as conditions change.

## Operating Modes

Normal Community Mode flow:

1. Surplus food/resource is added.
2. Nearby compatible requests are identified.
3. Best available volunteer is selected.
4. Volunteer is notified.
5. Volunteer accepts.
6. Pickup and delivery task is automatically assigned after deterministic checks.
7. Delivery is tracked.
8. Completion is recorded.
9. Audit is updated.

Normal matching considers distance, expiry, dietary compatibility, quantity, volunteer capacity, volunteer availability, delivery window, and route availability.

Disaster Response Mode flow:

1. Administrator creates disaster event for MVP.
2. Sentinel processes the disaster event and affected zones.
3. System finds nearby verified, relevant, currently available volunteers.
4. Volunteers receive dashboard alerts, plus SNS/email/SMS if practical.
5. Volunteer acceptance marks eligibility only.
6. Planner evaluates location, availability, skills, vehicle/carry capacity, current workload, route safety, and task priority.
7. System assigns the most appropriate specific task.
8. Task status and audit update.

Example relief tasks:

- Pick up 20 food packs from Donor A and deliver to Shelter B.
- Deliver drinking water to Zone C.
- Collect available food from Restaurant D.
- Transport approved supplies to Relief Point E.
- Confirm completion of a low-risk logistics task.

## MVP Scope

- One city district
- 5-10 locations/zones
- About 150 food/resource units
- About 45 requests
- About 18 volunteers
- Prepared meals, fresh produce, pantry items, and approved relief supplies
- Admin-created flood disaster event
- Dashboard volunteer alerts
- Accept/decline responses
- Automatic task assignment after deterministic scoring
- Automatic reassignment/recovery for volunteer decline, timeout, cancellation, route closure, resource disappearance, or task failure

Out of scope:

- medical treatment task assignment
- evacuation orders
- rescue operations requiring authorities
- entering officially restricted zones
- emergency authority decisions
- external government/weather integrations unless trivial
- generic skill sharing
- social networking
- gamification
- financial features
- blockchain
- ML model training
- nationwide deployment

## Functional Requirements

- Track inventory/resources by type, quantity, expiry, donor, location, dietary metadata, allergens, and status.
- Track community requests and disaster needs by location, urgency, quantity, delivery window, destination constraints, and status.
- Track volunteers by location/coverage zone, availability, skills, vehicle type, carrying capacity, verified status, current task count, preferred service area, and notification status.
- Generate valid normal-mode delivery plans.
- Generate valid disaster-mode volunteer/resource task assignments.
- Send practical volunteer alerts with disaster location, approximate distance, urgency, assistance type, and accept/decline controls.
- Treat volunteer acceptance as eligibility, not final assignment.
- Score volunteer-task matches deterministically using distance, availability, skill match, vehicle/capacity, task urgency, workload, and route feasibility.
- Detect floods, road closures, volunteer decline/no-response/cancellation, donor cancellation, resource loss, inventory loss, task failure, and demand changes.
- Identify failed or affected tasks and preserve unaffected tasks.
- Generate recovery options for affected tasks only.
- Validate every plan, assignment, and recovery before execution.
- Execute validated GREEN logistics actions automatically.
- Escalate AMBER decisions to a coordinator with evidence, options, recommendation, and concise rationale.
- Block RED actions from autonomous execution.
- Resume workflows after human approval, rejection, or hold.
- Maintain complete audit logs of events, agents, tools, alerts, volunteer responses, validation results, risk class, human decisions, and outcomes.

## Safety

GREEN examples:

- normal food pickup
- safe supply delivery
- verified volunteer substitution
- safe route change

AMBER examples:

- major redistribution
- significant shortage
- high-priority conflict
- uncertain route
- large volunteer reassignment

RED examples:

- evacuation orders
- rescue operations requiring authorities
- medical treatment
- unsafe travel
- entering officially restricted zones
- emergency authority decisions

RED actions must never be automatically executed.

## Success Metrics

Primary KPI:

- Human Coordination Decisions Avoided = `(total coordination decisions - human decisions required) / total coordination decisions`

Secondary metrics:

- valid plan/task rate
- recovery success rate
- assignment preservation rate
- correct volunteer matching rate
- alert response rate
- correct escalation rate
- constraint violations
- unsafe autonomous actions
- planning time
- recovery time

Metrics must come from demo/evaluation runs. Do not fabricate measured results.

## Acceptance Criteria

- Normal mode can match surplus meals to a nearby compatible request and assign a validated volunteer task.
- Disaster mode can create an admin flood event, alert nearby verified volunteers, process accept/decline responses, and assign validated relief tasks.
- Volunteer cancellation and road closure trigger Recovery Agent workflow.
- Recovery preserves unaffected tasks, repairs only affected tasks, executes GREEN changes, and creates one meaningful AMBER decision.
- RED disaster actions never execute autonomously.
- Dashboard shows both modes, volunteer responses, task board, audit trail, and decision-avoidance metrics.
