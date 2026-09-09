"""Disruption and recovery API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from src.auth.dependencies import require_coordinator
from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_disruptions():
    """List events used as disruption/audit records."""

    return get_coordination_service().state.events


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
