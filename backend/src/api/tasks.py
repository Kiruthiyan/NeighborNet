"""Unified task API."""

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from src.models import TaskLifecycle
from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_tasks():
    """List unified tasks."""

    return get_coordination_service().state.tasks


@router.post("/generate-normal")
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
async def update_task_status(task_id: str, payload: Dict[str, Any]):
    """Update task lifecycle status."""

    try:
        status = TaskLifecycle(str(payload["status"]).lower())
        return get_coordination_service().update_task_status(task_id, status)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail="status is required") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/recover")
async def recover_task(task_id: str, payload: Dict[str, Any]):
    """Recover a specific disrupted task."""

    payload["task_ids"] = [task_id]
    return get_coordination_service().recover(payload)
