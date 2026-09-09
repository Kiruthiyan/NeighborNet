"""Disaster mode API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from src.auth.dependencies import require_coordinator
from src.services.coordination import get_coordination_service


router = APIRouter()


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
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{disaster_id}/assign", dependencies=[Depends(require_coordinator)])
async def assign_disaster_tasks(disaster_id: str):
    """Assign accepted volunteers to specific disaster tasks."""

    try:
        return get_coordination_service().assign_disaster_tasks(disaster_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
