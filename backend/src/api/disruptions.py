"""Disruption and recovery API."""

from typing import Any, Dict

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_disruptions():
    """List events used as disruption/audit records."""

    return get_coordination_service().state.events


@router.post("/inject")
async def inject_disruption(payload: Dict[str, Any]):
    """Inject disruption and run recovery."""

    return get_coordination_service().recover(payload)


@router.post("/{event_id}/recover")
async def recover_event(event_id: str, payload: Dict[str, Any]):
    """Recover from a named event ID."""

    payload["event_id"] = event_id
    return get_coordination_service().recover(payload)
