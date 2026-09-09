"""Inventory/resource API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from src.auth.dependencies import require_donor
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_inventory():
    """List inventory/resources."""

    return get_coordination_service().state.inventory


@router.post("")
async def create_inventory_batch(payload: Dict[str, Any], donor: User = Depends(require_donor)):
    """Record a donor's surplus food/resource donation."""

    try:
        return get_coordination_service().create_inventory_batch(payload, donor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
