"""Request/need API."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.auth.dependencies import get_current_user, require_coordinator
from src.auth.security import decode_access_token
from src.models.inventory import ResourceType
from src.models.users import User
from src.services.coordination import (
    InvalidStateTransitionError,
    ResourceOwnershipError,
    get_coordination_service,
)


router = APIRouter()
_bearer_scheme = HTTPBearer(auto_error=False)


def _get_optional_viewer(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[User]:
    """Best-effort caller identity for redaction purposes only - unlike
    get_current_user, an absent/invalid token means "anonymous", not a 401,
    since these listings stay publicly browsable."""

    if credentials is not None and credentials.credentials:
        claims = decode_access_token(credentials.credentials)
        if claims and "sub" in claims:
            user = get_coordination_service().get_user(claims["sub"])
            if user is not None and user.is_active:
                return user
    return None


def _request_view(req, viewer: Optional[User]) -> Dict[str, Any]:
    """Redact requester contact PII from anyone but the requester themself
    or a coordinator/admin (mirrors feature/location-privacy in
    api/volunteers.py). This listing stays public so requests remain
    browsable, but contact_person/contact_phone are not."""

    data = req.model_dump()
    is_owner = viewer is not None and viewer.user_id == req.requesting_org_id
    is_privileged = viewer is not None and (viewer.is_coordinator or viewer.is_admin)
    if not (is_owner or is_privileged):
        data["contact_person"] = None
        data["contact_phone"] = None
    return data


@router.get("")
async def list_requests(viewer: Optional[User] = Depends(_get_optional_viewer)):
    """List normal community requests."""

    return [_request_view(r, viewer) for r in get_coordination_service().state.requests]


@router.post("")
async def create_request(payload: Dict[str, Any], requester: User = Depends(get_current_user)):
    """Record a community resource request. Every authenticated account is
    implicitly a recipient - no special capability is required."""

    try:
        return get_coordination_service().create_request(payload, requester)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{request_id}/verify", dependencies=[Depends(require_coordinator)])
async def verify_request(request_id: str):
    """Verify request phone, location, and deduplication before matching.
    Coordinator-only: verification establishes trust for matching, so it
    can't be self-service."""

    try:
        return get_coordination_service().verify_request(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/cross-region-assistance", dependencies=[Depends(require_coordinator)])
async def cross_region_assistance(region: str, resource_type: str, quantity_needed: int):
    """Preview whether another region has surplus that could help fulfill a
    shortfall in `region` for `resource_type`, without committing anything -
    see feature/cross-region-assistance. Coordinator-only: this is an
    operational planning tool, not a public browse feature."""

    try:
        res_type = ResourceType(resource_type.lower())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid resource_type: {resource_type!r}") from exc
    try:
        return get_coordination_service().find_cross_region_supply(region, res_type, quantity_needed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{request_id}/cancel")
async def cancel_request(request_id: str, user: User = Depends(get_current_user)):
    """Requester cancels their own request (or a coordinator cancels any).
    Any non-completed task already built from this request is flagged for
    recovery rather than silently left dangling."""

    try:
        return get_coordination_service().cancel_request(request_id, user)
    except ResourceOwnershipError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except InvalidStateTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

