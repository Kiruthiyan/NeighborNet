"""Volunteer alert API."""

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.dependencies import get_current_user, require_coordinator
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


def _require_alert_owner_or_coordinator(alert_id: str, user: User = Depends(get_current_user)) -> User:
    """Only the volunteer the alert was sent to (or a coordinator/admin acting
    on their behalf) may respond to it."""

    if user.is_coordinator:
        return user
    service = get_coordination_service()
    try:
        alert = service.get_alert(alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    volunteer = service.get_volunteer_by_user_id(user.user_id)
    if volunteer is None or volunteer.volunteer_id != alert.volunteer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only respond to your own volunteer alerts",
        )
    return user


@router.get("")
async def list_alerts():
    """List volunteer alerts."""

    return get_coordination_service().state.alerts


@router.get("/{alert_id}")
async def get_alert(alert_id: str):
    """Get volunteer alert."""

    try:
        return get_coordination_service().get_alert(alert_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{alert_id}/accept")
async def accept_alert(alert_id: str, user: User = Depends(_require_alert_owner_or_coordinator)):
    """Accept alert. This marks eligibility only."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "accept")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{alert_id}/decline")
async def decline_alert(alert_id: str, user: User = Depends(_require_alert_owner_or_coordinator)):
    """Decline alert."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "decline")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{alert_id}/timeout", dependencies=[Depends(require_coordinator)])
async def timeout_alert(alert_id: str):
    """Mark alert timed out. Coordinator-only - this represents the system/
    coordinator giving up on a non-responding volunteer, not a volunteer
    action on themselves."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "timeout")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
