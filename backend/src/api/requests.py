"""Request/need API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_requests():
    """List normal community requests."""

    return get_coordination_service().state.requests
