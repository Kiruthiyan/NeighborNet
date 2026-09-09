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

Every call is written to StrandsAuditLog (see CoordinationService.
record_strands_audit) - who called what tool, with what parameters, and
what happened - so the agent's activity is reconstructible after the fact.
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


def _audit(tool_name: str, params: Dict[str, Any], result: Any = None, error: BaseException | None = None) -> None:
    """Write one StrandsAuditLog entry for a tool call. Never raises - audit
    logging must not be able to break the agent's actual work."""

    try:
        get_coordination_service().record_strands_audit(
            tool_name=tool_name,
            params=params,
            result=_model_dump(result) if error is None else None,
            error=str(error) if error else None,
        )
    except Exception:  # pragma: no cover - audit logging is best-effort
        pass


@tool
def get_dashboard_summary() -> Dict[str, Any]:
    """Get current community readiness, active requests/tasks/volunteers, and
    pending human-decision counts. Call this first to understand the current
    state before deciding what to do."""

    service = get_coordination_service()
    result = {
        "counts": service.summary_counts(),
        "readiness": service.dashboard_readiness(),
    }
    _audit("get_dashboard_summary", {}, result=result)
    return result


@tool
def list_active_disasters() -> List[Dict[str, Any]]:
    """List all disaster events currently tracked by the system, including
    their needs and status."""

    result = _model_dump(get_coordination_service().state.disasters)
    _audit("list_active_disasters", {}, result=result)
    return result


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

    params = {
        "disaster_type": disaster_type,
        "title": title,
        "zone": zone,
        "severity": severity,
        "needs": needs or [],
    }
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
    try:
        disaster = service.create_disaster(payload)
    except Exception as exc:
        _audit("create_disaster_event", params, error=exc)
        raise
    result = _model_dump(disaster)
    _audit("create_disaster_event", params, result=result)
    return result


@tool
def alert_nearby_volunteers(disaster_id: str) -> List[Dict[str, Any]]:
    """Send alerts to nearby verified volunteers for an active disaster.
    Volunteers will accept or decline independently — accepting only makes a
    volunteer ELIGIBLE, it does not assign them a task. Call
    assign_accepted_volunteers afterwards to make the actual (deterministic)
    task assignment."""

    params = {"disaster_id": disaster_id}
    try:
        alerts = get_coordination_service().dispatch_disaster(disaster_id)
    except Exception as exc:
        _audit("alert_nearby_volunteers", params, error=exc)
        raise
    result = _model_dump(alerts)
    _audit("alert_nearby_volunteers", params, result=result)
    return result


@tool
def assign_accepted_volunteers(disaster_id: str) -> List[Dict[str, Any]]:
    """Deterministically assign relief tasks to volunteers who have already
    accepted their alert for this disaster. This is the only way tasks get
    assigned in disaster mode — volunteer acceptance alone never assigns a
    task."""

    params = {"disaster_id": disaster_id}
    try:
        tasks = get_coordination_service().assign_disaster_tasks(disaster_id)
    except Exception as exc:
        _audit("assign_accepted_volunteers", params, error=exc)
        raise
    result = _model_dump(tasks)
    _audit("assign_accepted_volunteers", params, result=result)
    return result


@tool
def list_tasks(operating_mode: str | None = None) -> List[Dict[str, Any]]:
    """List coordination tasks, optionally filtered by operating mode
    ('normal' or 'disaster')."""

    service = get_coordination_service()
    tasks = service.state.tasks
    if operating_mode:
        tasks = [t for t in tasks if t.operating_mode.value == operating_mode]
    result = _model_dump(tasks)
    _audit("list_tasks", {"operating_mode": operating_mode}, result={"count": len(result)})
    return result


@tool
def report_disruption(
    task_ids: List[str],
    reason: str,
    zone: str | None = None,
    route_status: str = "blocked",
) -> Dict[str, Any]:
    """Report a disruption (volunteer cancellation, road closure, resource
    loss, or task failure) affecting one or more tasks. The deterministic
    recovery engine will preserve unaffected tasks and propose repairs for
    the affected ones. This creates an AMBER decision requiring human
    approval — no task is actually reassigned until a coordinator approves
    it; you must NOT try to approve it yourself, only tell the human
    coordinator a decision is waiting."""

    params = {"task_ids": task_ids, "reason": reason, "zone": zone, "route_status": route_status}
    service = get_coordination_service()
    disruption = {
        "task_ids": task_ids,
        "reason": reason,
        "zone": zone,
        "route_status": route_status,
        "create_amber_decision": True,
    }
    try:
        result = service.recover(disruption)
    except Exception as exc:
        _audit("report_disruption", params, error=exc)
        raise
    dumped = _model_dump(result)
    _audit("report_disruption", params, result=dumped)
    return dumped


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
    result = _model_dump(pending)
    _audit("list_pending_decisions", {}, result={"count": len(result)})
    return result


@tool
def update_task_status(task_id: str, status: str) -> Dict[str, Any]:
    """Update a task's lifecycle status (e.g. 'in_progress', 'completed').
    Use this to reflect real-world progress; it never re-runs matching or
    risk classification."""

    params = {"task_id": task_id, "status": status}
    service = get_coordination_service()
    try:
        task = service.update_task_status(task_id, TaskLifecycle(status))
    except Exception as exc:
        _audit("update_task_status", params, error=exc)
        raise
    result = _model_dump(task)
    _audit("update_task_status", params, result=result)
    return result


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
