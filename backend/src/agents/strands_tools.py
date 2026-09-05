"""Strands @tool wrappers around the existing deterministic coordination service.

These tools do not contain any new business logic. Every tool is a thin
pass-through to `CoordinationService`, `RiskClassifier`, and the planning /
recovery engines that already power the local demo and API. The Strands
agent's only job is to decide *when* to call them and to narrate the result
in natural language; the deterministic engines still make every actual
matching / planning / recovery / risk decision.

Risk policy is enforced here, not by the LLM:
- GREEN tool calls execute immediately.
- AMBER outcomes (see `recover_tasks`) create a `Decision` requiring human
  approval and must not be auto-approved by the agent.
- RED actions (medical treatment, evacuation, rescue/authority work, unsafe
  travel, restricted-zone entry) are never exposed as tools at all, so the
  agent has no way to call them.
"""

from __future__ import annotations

from typing import Any, Dict, List

from strands import tool

from src.models import TaskLifecycle
from src.services.coordination import get_coordination_service


def _model_dump(value: Any) -> Any:
    """Serialize pydantic models (or lists of them) to plain dict/JSON-safe data."""

    if isinstance(value, list):
        return [_model_dump(item) for item in value]
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    return value


@tool
def get_dashboard_summary() -> Dict[str, Any]:
    """Get current community readiness, active requests/tasks/volunteers, and
    pending human-decision counts. Call this first to understand the current
    state before deciding what to do."""

    service = get_coordination_service()
    return {
        "counts": service.summary_counts(),
        "readiness": service.dashboard_readiness(),
    }


@tool
def list_active_disasters() -> List[Dict[str, Any]]:
    """List all disaster events currently tracked by the system, including
    their needs and status."""

    return _model_dump(get_coordination_service().state.disasters)


@tool
def create_disaster_event(
    disaster_type: str,
    title: str,
    description: str,
    zone: str,
    severity: str = "high",
    needs: List[Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    """Create a new admin-declared disaster event (e.g. a flood or fire) for
    a given zone, with an optional list of relief needs. Each need dict may
    include: category (e.g. food_delivery, water_distribution,
    shelter_support), quantity, priority, required_skills, required_capacity.
    This only records the event; it does NOT alert volunteers or assign
    tasks by itself — call alert_nearby_volunteers and then
    assign_accepted_volunteers next."""

    service = get_coordination_service()
    payload = {
        "type": disaster_type,
        "title": title,
        "description": description,
        "affected_zones": [zone],
        "severity": severity,
        "needs": needs or [],
        "created_by": "strands_agent",
    }
    disaster = service.create_disaster(payload)
    return _model_dump(disaster)


@tool
def alert_nearby_volunteers(disaster_id: str) -> List[Dict[str, Any]]:
    """Send alerts to nearby verified volunteers for an active disaster.
    Volunteers will accept or decline independently — accepting only makes a
    volunteer ELIGIBLE, it does not assign them a task. Call
    assign_accepted_volunteers afterwards to make the actual (deterministic)
    task assignment."""

    service = get_coordination_service()
    alerts = service.dispatch_disaster(disaster_id)
    return _model_dump(alerts)


@tool
def assign_accepted_volunteers(disaster_id: str) -> List[Dict[str, Any]]:
    """Deterministically assign relief tasks to volunteers who have already
    accepted their alert for this disaster. This is the only way tasks get
    assigned in disaster mode — volunteer acceptance alone never assigns a
    task."""

    service = get_coordination_service()
    tasks = service.assign_disaster_tasks(disaster_id)
    return _model_dump(tasks)


@tool
def list_tasks(operating_mode: str | None = None) -> List[Dict[str, Any]]:
    """List coordination tasks, optionally filtered by operating mode
    ('normal' or 'disaster')."""

    service = get_coordination_service()
    tasks = service.state.tasks
    if operating_mode:
        tasks = [t for t in tasks if t.operating_mode.value == operating_mode]
    return _model_dump(tasks)


@tool
def report_disruption(
    task_ids: List[str],
    reason: str,
    zone: str | None = None,
    route_status: str = "blocked",
) -> Dict[str, Any]:
    """Report a disruption (volunteer cancellation, road closure, resource
    loss, or task failure) affecting one or more tasks. The deterministic
    recovery engine will preserve unaffected tasks and repair the affected
    ones. If the repair involves a meaningful tradeoff, an AMBER decision
    requiring human approval is created automatically — you must NOT try to
    approve it yourself; tell the human coordinator a decision is waiting."""

    service = get_coordination_service()
    disruption = {
        "task_ids": task_ids,
        "reason": reason,
        "zone": zone,
        "route_status": route_status,
        "create_amber_decision": True,
    }
    result = service.recover(disruption)
    return _model_dump(result)


@tool
def list_pending_decisions() -> List[Dict[str, Any]]:
    """List decisions awaiting human approval (AMBER risk classification).
    These must be approved by a human coordinator via the Decisions page or
    the approve_decision API — the agent must never approve its own AMBER
    decisions."""

    service = get_coordination_service()
    pending = [
        d for d in service.state.decisions if d.requires_human_approval and not d.decided_at
    ]
    return _model_dump(pending)


@tool
def update_task_status(task_id: str, status: str) -> Dict[str, Any]:
    """Update a task's lifecycle status (e.g. 'in_progress', 'completed').
    Use this to reflect real-world progress; it never re-runs matching or
    risk classification."""

    service = get_coordination_service()
    task = service.update_task_status(task_id, TaskLifecycle(status))
    return _model_dump(task)


ALL_TOOLS = [
    get_dashboard_summary,
    list_active_disasters,
    create_disaster_event,
    alert_nearby_volunteers,
    assign_accepted_volunteers,
    list_tasks,
    report_disruption,
    list_pending_decisions,
    update_task_status,
]
