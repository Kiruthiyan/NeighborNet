"""Inventory/resource API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_inventory():
    """List inventory/resources."""

    return get_coordination_service().state.inventory
