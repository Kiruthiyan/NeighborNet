"""Request/need API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from src.auth.dependencies import get_current_user
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_requests():
    """List normal community requests."""

    return get_coordination_service().state.requests


@router.post("")
async def create_request(payload: Dict[str, Any], requester: User = Depends(get_current_user)):
    """Record a community resource request. Every authenticated account is
    implicitly a recipient - no special capability is required."""

    try:
        return get_coordination_service().create_request(payload, requester)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{request_id}/verify")
async def verify_request(request_id: str):
    """Verify request phone, location, and deduplication before matching."""

    try:
        return get_coordination_service().verify_request(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

