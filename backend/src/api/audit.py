"""Audit API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_audit():
    """List local audit/activity events."""

    return get_coordination_service().state.events
