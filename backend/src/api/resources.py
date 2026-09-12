"""Inventory/resource API."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.auth.security import decode_access_token
from src.models.users import User, AccountType
from src.services.coordination import get_coordination_service

_bearer_scheme = HTTPBearer(auto_error=False)

router = APIRouter()


def _get_optional_donor(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> User:
    """Resolve donor user if authenticated, or return a demo donor user."""
    if credentials is not None and credentials.credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            user = get_coordination_service().get_user(claims["sub"])
            if user is not None and user.is_active:
                return user

    return User(
        user_id="user_donor_demo",
        account_type=AccountType.USER,
        name="Community Donor",
        email="donor@neighbornet.org",
    )


@router.get("")
@router.get("/")
async def list_inventory():
    """List inventory/resources."""

    return get_coordination_service().state.inventory


@router.post("")
@router.post("/")
async def create_inventory_batch(
    payload: Dict[str, Any], donor: User = Depends(_get_optional_donor)
):
    """Record a donor's surplus food/resource donation."""

    try:
        return get_coordination_service().create_inventory_batch(payload, donor)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


