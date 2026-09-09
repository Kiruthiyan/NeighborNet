"""Unified task API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.dependencies import get_current_user, require_coordinator
from src.models import TaskLifecycle
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


def _require_task_owner_or_coordinator(task_id: str, user: User = Depends(get_current_user)) -> User:
    """Only the volunteer assigned to the task (or a coordinator/admin) may
    change its status or trigger its recovery."""

    if user.is_coordinator:
        return user
    service = get_coordination_service()
    try:
        task = service.get_task(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    volunteer = service.get_volunteer_by_user_id(user.user_id)
    if volunteer is None or volunteer.volunteer_id != task.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage tasks assigned to you",
        )
    return user


@router.get("")
async def list_tasks():
    """List unified tasks."""

    return get_coordination_service().state.tasks


@router.post("/generate-normal", dependencies=[Depends(require_coordinator)])
async def generate_normal_task():
    """Generate one normal surplus-food delivery task."""

    task = get_coordination_service().create_normal_task()
    if not task:
        raise HTTPException(status_code=409, detail="No feasible normal task found")
    return task


@router.get("/{task_id}")
async def get_task(task_id: str):
    """Get task."""

    try:
        return get_coordination_service().get_task(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{task_id}/status")
async def update_task_status(
    task_id: str, payload: Dict[str, Any], user: User = Depends(_require_task_owner_or_coordinator)
):
    """Update task lifecycle status."""

    try:
        status_value = TaskLifecycle(str(payload["status"]).lower())
        return get_coordination_service().update_task_status(task_id, status_value)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail="status is required") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/recover", dependencies=[Depends(require_coordinator)])
async def recover_task(task_id: str, payload: Dict[str, Any]):
    """Recover a specific disrupted task. Coordinator-only - this creates the
    AMBER approval workflow, not an autonomous action."""

    payload["task_ids"] = [task_id]
    return get_coordination_service().recover(payload)
