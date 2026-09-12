"""Disruption and recovery API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.auth.dependencies import require_coordinator
from src.services.coordination import get_coordination_service


router = APIRouter()


class ZoneRestrictionRequest(BaseModel):
    zone: str = Field(..., min_length=1)
    restricted: bool = True


@router.get("")
async def list_disruptions():
    """List events used as disruption/audit records."""

    return get_coordination_service().state.events


@router.get("/zone-restrictions")
async def list_zone_restrictions():
    """List zones currently under a movement restriction (lockdown,
    quarantine, closed roads, a declared dangerous zone)."""

    return {"restricted_zones": get_coordination_service().state.restricted_zones}


@router.post("/zone-restrictions", dependencies=[Depends(require_coordinator)])
async def set_zone_restriction(payload: ZoneRestrictionRequest):
    """Coordinator-only: activate or lift a zone's movement restriction.
    Affects every future volunteer match (normal or disaster) - see
    feature/movement-restrictions."""

    try:
        zones = get_coordination_service().set_zone_movement_restriction(
            payload.zone, payload.restricted
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"restricted_zones": zones}


@router.post("/inject", dependencies=[Depends(require_coordinator)])
async def inject_disruption(payload: Dict[str, Any]):
    """Inject disruption and run recovery. Coordinator-only - this is the
    same state-mutating power the agent's report_disruption tool has."""

    return get_coordination_service().recover(payload)


@router.post("/{event_id}/recover", dependencies=[Depends(require_coordinator)])
async def recover_event(event_id: str, payload: Dict[str, Any]):
    """Recover from a named event ID."""

    payload["event_id"] = event_id
    return get_coordination_service().recover(payload)
