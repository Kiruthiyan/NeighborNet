# Demo Plan

## Goal

Show within 5 minutes that NeighborNet is one autonomous coordination system that handles normal surplus food delivery and disaster volunteer dispatch, then repairs the response plan when conditions change.

## Reset Strategy

- Reset to deterministic seed data.
- Include restaurants/donors, shelters, relief point, 18 volunteers, inventory/resources, and active requests.
- Clear prior demo events, alerts, tasks, decisions, and audit logs.
- Use fixed scenario IDs so results are comparable across runs.
- Never fabricate metrics; show measured values from the current run.

## Combined Hackathon Story

### Part 1: Normal Operation

Target duration: 60-90 seconds.

Flow:

1. Restaurant adds surplus meals.
2. NeighborNet finds nearby shelter request.
3. Deterministic checks verify distance, expiry, dietary fit, quantity, delivery window, volunteer capacity, availability, and route availability.
4. System selects suitable volunteer.
5. Volunteer accepts.
6. Pickup/delivery task is assigned.
7. Completion/audit state updates.

Message: NeighborNet prevents food waste and reduces routine coordination work.

### Part 2: Disaster Response

Target duration: 2 minutes.

Admin creates:

- Disaster Type: Flood
- Location: Zone B
- Severity: High
- Needs: food delivery, water distribution, shelter support

Flow:

1. Sentinel processes flood event.
2. System identifies affected zones and nearby verified volunteers.
3. Dashboard alerts relevant available volunteers.
4. Volunteers accept or decline.
5. Acceptance marks volunteers eligible only.
6. Planner assigns specific relief tasks by location, skills, vehicle/capacity, workload, route safety, and priority.
7. Dashboard shows Disaster Overview, Volunteer Response Panel, and Disaster Task Board.

Message: Disaster Mode increases urgency and mobilizes the same community network.

### Part 3: Recovery WOW Sequence

Target duration: 90-120 seconds.

Inject:

- one volunteer cancels
- one road closes

Flow:

1. Sentinel detects disruption.
2. Recovery identifies affected tasks.
3. Unaffected tasks remain unchanged.
4. Recovery finds replacement volunteer/resource/route candidates.
5. ConstraintValidator validates replacements.
6. GREEN reassignment/reroute executes automatically.
7. One meaningful AMBER conflict goes to coordinator.
8. Coordinator approves selected option.
9. Workflow resumes.
10. Final task board and audit update.

Message: The community plan repairs itself when reality changes.

## Success Criteria

- normal surplus meal task is assigned safely
- admin-created flood activates disaster mode
- nearby verified volunteers are alerted
- accept/decline is captured
- accepted volunteer is not automatically assigned without matching validation
- disaster tasks are assigned by deterministic score
- cancellation and road closure trigger shared Recovery Agent
- unaffected tasks are preserved
- GREEN repairs execute
- one AMBER decision appears
- RED actions remain blocked
- demo completes under 5 minutes
