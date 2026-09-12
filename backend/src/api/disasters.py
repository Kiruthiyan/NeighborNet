"""Disaster mode API."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.auth.dependencies import get_current_user, require_coordinator
from src.models.disasters import DisasterStatus
from src.models.users import User
from src.services.coordination import (
    DisasterNotVerifiedError,
    DisasterReviewStateError,
    get_coordination_service,
)


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
    # Optional explicit region (one of KNOWN_REGIONS); if omitted, the service
    # derives it from affected_zones on a best-effort basis - see
    # coordination._resolve_region.
    region: Optional[str] = None
    affected_radius_km: Optional[float] = None
    affected_communities: List[str] = Field(default_factory=list)
    severity: str = "high"
    evidence: List[str] = Field(default_factory=list)


class DisasterReviewRequest(BaseModel):
    """Body for verifying (activating) a pending disaster report."""

    notes: Optional[str] = None
    # Lets the reviewing coordinator correct an "uncertain severity" a
    # citizen reporter may have gotten wrong, in the same call.
    severity: Optional[str] = None


class DisasterRejectRequest(BaseModel):
    """Body for rejecting a pending disaster report.

    `reason` should be one of "false_report", "duplicate", "incomplete",
    "malicious", or "other" (free text accepted, not enum-enforced, so a
    coordinator is never blocked from rejecting for an unanticipated reason).
    """

    reason: str = Field(..., min_length=1)
    notes: Optional[str] = None


@router.get("")
async def list_disasters():
    """List disaster events visible to the general community.

    Deliberately excludes PENDING_VALIDATION (not yet reviewed) and REJECTED
    (false/duplicate/malicious) reports - those are only visible to
    coordinators via GET /api/disasters/pending, so an unverified or
    debunked report is never presented to the public as a real disaster.
    """

    disasters = get_coordination_service().state.disasters
    hidden = {DisasterStatus.PENDING_VALIDATION, DisasterStatus.REJECTED}
    return [disaster for disaster in disasters if disaster.status not in hidden]


@router.get("/pending", dependencies=[Depends(require_coordinator)])
async def list_pending_disasters():
    """Admin review queue: citizen reports awaiting verification."""

    return get_coordination_service().list_pending_disasters()


@router.get("/by-region/{region}")
async def list_disasters_by_region(region: str):
    """Disasters scoped to one canonical region (see KNOWN_REGIONS), so a
    resident or coordinator can see what's happening in one region without
    seeing every other region's activity - Region A having a disaster must
    never make Region B/C look affected too. Excludes pending/rejected
    reports, same as the public list."""

    try:
        return get_coordination_service().list_disasters_by_region(region)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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


@router.post("/{disaster_id}/verify", dependencies=[Depends(require_coordinator)])
async def verify_disaster(
    disaster_id: str, payload: DisasterReviewRequest, user: User = Depends(get_current_user)
):
    """Coordinator/admin review step: PENDING_VALIDATION -> ACTIVE.

    Only an authorized coordinator/admin can activate a disaster report -
    this is the only path a citizen report can take to become ACTIVE and
    become eligible for dispatch/assign.
    """

    try:
        return get_coordination_service().verify_disaster(
            user.user_id, disaster_id, notes=payload.notes, severity_override=payload.severity
        )
    except DisasterReviewStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{disaster_id}/reject", dependencies=[Depends(require_coordinator)])
async def reject_disaster(
    disaster_id: str, payload: DisasterRejectRequest, user: User = Depends(get_current_user)
):
    """Coordinator/admin review step: PENDING_VALIDATION -> REJECTED.

    Covers false reports, incomplete reports, duplicate/conflicting reports,
    and malicious reports - `reason` records which.
    """

    try:
        return get_coordination_service().reject_disaster(
            user.user_id, disaster_id, reason=payload.reason, notes=payload.notes
        )
    except DisasterReviewStateError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
