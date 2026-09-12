"""Disaster mode API."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user, require_coordinator
from src.models.users import User
from src.services.coordination import DisasterNotVerifiedError, get_coordination_service


router = APIRouter()


class DisasterReportRequest(BaseModel):
    """Payload for a citizen-submitted disaster report.

    Note there is deliberately no `reported_by`/`created_by`/`status` field
    here - the reporter identity comes from the caller's auth token, and the
    status is always forced to PENDING_VALIDATION server-side, never from the
    request body.
    """

    type: str = Field(..., min_length=1)
    title: str = Field(..., min_length=3)
    description: Optional[str] = None
    affected_location: Dict[str, Any] = Field(default_factory=dict)
    affected_zones: List[str] = Field(default_factory=list)
    severity: str = "high"
    evidence: List[str] = Field(default_factory=list)


@router.get("")
async def list_disasters():
    """List disaster events."""

    return get_coordination_service().state.disasters


@router.post("", dependencies=[Depends(require_coordinator)])
async def create_disaster(payload: Dict[str, Any]):
    """Create admin disaster event for MVP."""

    try:
        return get_coordination_service().create_disaster(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/report", status_code=201)
async def report_disaster(
    payload: DisasterReportRequest, user: User = Depends(get_current_user)
):
    """Any authenticated user can report a suspected disaster.

    It always starts PENDING_VALIDATION and never auto-activates - a
    coordinator must review and activate it (see
    feature/disaster-verification) before volunteer alerts/assignment can
    happen for it.
    """

    try:
        return get_coordination_service().report_disaster(user.user_id, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{disaster_id}")
async def get_disaster(disaster_id: str):
    """Get disaster event."""

    try:
        return get_coordination_service().get_disaster(disaster_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{disaster_id}/needs")
async def get_disaster_needs(disaster_id: str):
    """Get needs for a disaster."""

    disaster = await get_disaster(disaster_id)
    return disaster.needs


@router.post("/{disaster_id}/dispatch", dependencies=[Depends(require_coordinator)])
async def dispatch_disaster(disaster_id: str):
    """Send volunteer alerts for disaster."""

    try:
        return get_coordination_service().dispatch_disaster(disaster_id)
    except DisasterNotVerifiedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{disaster_id}/assign", dependencies=[Depends(require_coordinator)])
async def assign_disaster_tasks(disaster_id: str):
    """Assign accepted volunteers to specific disaster tasks."""

    try:
        return get_coordination_service().assign_disaster_tasks(disaster_id)
    except DisasterNotVerifiedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
