"""Volunteer API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_volunteers():
    """List volunteers."""

    return get_coordination_service().state.volunteers
