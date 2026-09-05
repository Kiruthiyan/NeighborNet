"""Volunteer alert API."""

from fastapi import APIRouter, HTTPException

from src.services.coordination import get_coordination_service


router = APIRouter()


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
async def accept_alert(alert_id: str):
    """Accept alert. This marks eligibility only."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "accept")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{alert_id}/decline")
async def decline_alert(alert_id: str):
    """Decline alert."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "decline")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{alert_id}/timeout")
async def timeout_alert(alert_id: str):
    """Mark alert timed out."""

    try:
        return get_coordination_service().respond_to_alert(alert_id, "timeout")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
