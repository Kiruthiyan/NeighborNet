"""Request/response schemas for the auth and admin APIs."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator

from src.models.users import User, UserCapabilities


def normalize_email(value: str) -> str:
    value = value.strip().lower()
    if "@" not in value or "." not in value.split("@")[-1]:
        raise ValueError("invalid email address")
    return value


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    invite_token: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return normalize_email(value)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return normalize_email(value)


class UserProfile(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    account_type: str
    capabilities: UserCapabilities
    is_admin: bool
    is_coordinator: bool
    is_donor: bool
    is_volunteer: bool
    is_active: bool


def user_to_profile(user: User) -> UserProfile:
    return UserProfile(
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        account_type=user.account_type.value,
        capabilities=user.capabilities,
        is_admin=user.is_admin,
        is_coordinator=user.is_coordinator,
        is_donor=user.is_donor,
        is_volunteer=user.is_volunteer,
        is_active=user.is_active,
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class CapabilitiesUpdateRequest(BaseModel):
    """Self-service capability toggle. is_coordinator is intentionally
    absent - only an admin can grant it (see /api/admin/users/{id})."""

    is_donor: Optional[bool] = None
    is_volunteer: Optional[bool] = None


class AdminUserUpdateRequest(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_coordinator: Optional[bool] = None
    is_donor: Optional[bool] = None
    is_volunteer: Optional[bool] = None


class CreateInvitationRequest(BaseModel):
    email: str
    grant_coordinator: bool = False
    grant_donor: bool = False
    grant_volunteer: bool = False

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        return normalize_email(value)


class InvitationResponse(BaseModel):
    invite_id: str
    email: str
    token: str
    status: str
    signup_url_path: str
    granted_capabilities: UserCapabilities
    email_sent: bool = False
