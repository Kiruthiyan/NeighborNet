"""FastAPI dependencies enforcing authentication and role/capability checks."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.auth.security import decode_access_token
from src.models.users import User
from src.services.coordination import get_coordination_service

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> User:
    """Resolve the JWT bearer token into the requesting User, or 401."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = decode_access_token(credentials.credentials)
    if claims is None or "sub" not in claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_coordination_service().get_user(claims["sub"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_coordinator(user: User = Depends(get_current_user)) -> User:
    """Admins are a superset of coordinators - see User.is_coordinator."""
    if not user.is_coordinator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Coordinator access required"
        )
    return user


def require_donor(user: User = Depends(get_current_user)) -> User:
    if not user.is_donor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Donor access required")
    return user


def require_volunteer(user: User = Depends(get_current_user)) -> User:
    if not user.is_volunteer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Volunteer access required"
        )
    return user
