"""Combined Normal + Disaster demo runner."""

import json

from src.agents import NeighborNetOrchestrator
from src.models import TaskLifecycle
from src.services.coordination import get_coordination_service


def _json_ready(value):
    """Convert Pydantic objects to JSON-safe structures."""

    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    if isinstance(value, list):
        return [_json_ready(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    return value


def run_demo() -> dict:
    """Run full five-minute demo story deterministically."""

    service = get_coordination_service()
    service.reset()
    orchestrator = NeighborNetOrchestrator(service)

    normal = orchestrator.run_normal_mode()
    disaster_id = "disaster_flood_zone_b"
    disaster = orchestrator.run_disaster_mode(disaster_id)

    assigned_disaster_tasks = [
        task
        for task in service.state.tasks
        if task.disaster_id == disaster_id and task.volunteer_id
    ]
    disrupted_task = assigned_disaster_tasks[0] if assigned_disaster_tasks else None

    recovery = {"skipped": "no assigned disaster task to disrupt"}
    if disrupted_task:
        disrupted_task.status = TaskLifecycle.FAILED
        recovery = orchestrator.run_recovery(
            {
                "operating_mode": "disaster",
                "task_ids": [disrupted_task.task_id],
                "volunteer_id": disrupted_task.volunteer_id,
                "zone": "south",
                "route_status": "blocked",
                "reason": "Volunteer cancellation and road closure",
                "create_amber_decision": True,
            }
        )

    pending = [
        decision
        for decision in service.state.decisions
        if decision.requires_human_approval and not decision.human_approval
    ]
    approved = None
    if pending:
        approved = service.approve_decision(pending[0].decision_id, "coordinator_demo")

    return {
        "story": "normal_surplus_then_flood_recovery",
        "normal": normal,
        "disaster": disaster,
        "recovery": recovery,
        "approved_decision": approved,
        "metrics": service.dashboard_readiness(),
        "disaster_overview": service.disaster_overview(),
    }


def main() -> None:
    """CLI entrypoint."""

    print(json.dumps(_json_ready(run_demo()), indent=2))


if __name__ == "__main__":
    main()
