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


@router.get("/{task_id}/verification")
async def get_task_verification(task_id: str):
    """Retrieve pickup & delivery verification status and active codes for a task."""

    try:
        return get_coordination_service().get_task_verifications(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{task_id}/verify-pickup")
async def verify_pickup(task_id: str, payload: Dict[str, Any], user: User = Depends(get_current_user)):
    """Verify pickup for a task using OTP or QR code."""

    code_or_qr = payload.get("code") or payload.get("qr_payload") or payload.get("otp_code")
    if not code_or_qr:
        raise HTTPException(status_code=400, detail="code or qr_payload is required")
    try:
        return get_coordination_service().verify_task_pickup(
            task_id=task_id,
            code_or_qr=str(code_or_qr),
            volunteer_user_id=user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/verify-delivery")
async def verify_delivery(task_id: str, payload: Dict[str, Any], user: User = Depends(get_current_user)):
    """Verify delivery for a task using OTP or QR code."""

    code_or_qr = payload.get("code") or payload.get("qr_payload") or payload.get("otp_code")
    if not code_or_qr:
        raise HTTPException(status_code=400, detail="code or qr_payload is required")
    try:
        return get_coordination_service().verify_task_delivery(
            task_id=task_id,
            code_or_qr=str(code_or_qr),
            volunteer_user_id=user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/reassign", dependencies=[Depends(require_coordinator)])
async def reassign_task_volunteer(task_id: str, payload: Dict[str, Any]):
    """Reassign task to a new volunteer. Invalidates old verification codes and generates new ones."""

    new_volunteer_id = payload.get("new_volunteer_id") or payload.get("volunteer_id")
    if not new_volunteer_id:
        raise HTTPException(status_code=400, detail="new_volunteer_id is required")
    try:
        return get_coordination_service().reassign_task_volunteer(
            task_id=task_id,
            new_volunteer_id=str(new_volunteer_id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/accept")
async def atomic_accept_task(task_id: str, payload: Dict[str, Any], user: User = Depends(get_current_user)):
    """Atomic task acceptance by a volunteer."""

    volunteer_id = payload.get("volunteer_id") or user.user_id
    try:
        return get_coordination_service().atomic_accept_task(
            task_id=task_id,
            volunteer_id=str(volunteer_id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/cannot-continue")
async def cannot_continue_task(task_id: str, payload: Dict[str, Any], user: User = Depends(get_current_user)):
    """Volunteer declares 'Cannot Continue' - triggers task recovery."""

    volunteer_id = payload.get("volunteer_id") or user.user_id
    reason = payload.get("reason") or "Volunteer declared cannot continue"
    try:
        return get_coordination_service().cancel_and_recover_task(
            task_id=task_id,
            volunteer_id=str(volunteer_id),
            reason=str(reason),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{task_id}/telemetry")
async def report_telemetry(task_id: str, payload: Dict[str, Any], user: User = Depends(get_current_user)):
    """Report live GPS telemetry and detect route deviations."""

    current_lat = float(payload.get("lat") or payload.get("latitude") or 0.0)
    current_lng = float(payload.get("lng") or payload.get("longitude") or 0.0)
    try:
        return get_coordination_service().report_route_telemetry(
            task_id=task_id,
            current_lat=current_lat,
            current_lng=current_lng,
            volunteer_id=user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


