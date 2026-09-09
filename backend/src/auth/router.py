"""`/api/auth` - signup, login, self-service profile/capabilities, email
verification, and password reset (both OTP-based - see docs/AUTH_PLAN.md)."""

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.dependencies import get_current_user
from src.auth.schemas import (
    CapabilitiesUpdateRequest,
    EmailOnlyRequest,
    ForgotPasswordResponse,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserProfile,
    VerifyEmailRequest,
    user_to_profile,
)
from src.auth.security import (
    create_access_token,
    generate_otp,
    hash_password,
    otp_expiry,
    verify_password,
)
from src.models.invitations import InvitationStatus
from src.models.users import User, UserCapabilities
from src.services.coordination import get_coordination_service
from src.services.email import is_email_configured, send_otp_email

router = APIRouter()


def _issue_otp(user: User, purpose: str) -> str:
    """Generate, hash, and store a fresh OTP on the user (overwriting any
    previous one), returning the plaintext code to email/return to the caller."""

    otp = generate_otp()
    user.otp_hash = hash_password(otp)
    user.otp_purpose = purpose
    user.otp_expires_at = otp_expiry()
    get_coordination_service().update_user(user)
    return otp


async def _issue_and_send_otp(user: User, purpose: str) -> str:
    otp = _issue_otp(user, purpose)
    if is_email_configured() and user.email:
        await asyncio.to_thread(send_otp_email, user.email, otp, purpose)
    return otp


def _dev_otp(otp: str) -> Optional[str]:
    """Only surface the plaintext OTP in an API response when email delivery
    isn't configured - dev/demo fallback, mirrors InvitationResponse.email_sent."""

    return None if is_email_configured() else otp


def _consume_otp(user: User, purpose: str, otp: str) -> None:
    """Validate otp against the stored hash/purpose/expiry, raising 400 on
    any mismatch, and clear it afterwards so it can't be reused."""

    if (
        not user.otp_hash
        or user.otp_purpose != purpose
        or not user.otp_expires_at
        or user.otp_expires_at < datetime.now()
        or not verify_password(otp, user.otp_hash)
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    user.otp_hash = None
    user.otp_purpose = None
    user.otp_expires_at = None


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest) -> TokenResponse:
    """Create a `user`-tier account. `admin` accounts are never created here."""

    service = get_coordination_service()
    if service.get_user_by_email(payload.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    granted = UserCapabilities()
    if payload.invite_token:
        invitation = service.get_invitation_by_token(payload.invite_token)
        if invitation is None or not invitation.is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invitation"
            )
        if invitation.email != payload.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation was issued to a different email address",
            )
        granted = invitation.granted_capabilities

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        capabilities=granted,
    )
    service.create_user(user)

    if payload.invite_token:
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_by_user_id = user.user_id
        service.update_invitation(invitation)

    otp = await _issue_and_send_otp(user, "verify_email")

    token = create_access_token(user.user_id)
    return TokenResponse(access_token=token, user=user_to_profile(user), dev_otp=_dev_otp(otp))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    service = get_coordination_service()
    user = service.get_user_by_email(payload.email)
    if user is None or not user.password_hash or not verify_password(
        payload.password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    token = create_access_token(user.user_id)
    return TokenResponse(access_token=token, user=user_to_profile(user))


@router.get("/me", response_model=UserProfile)
async def read_me(user: User = Depends(get_current_user)) -> UserProfile:
    return user_to_profile(user)


@router.patch("/me/capabilities", response_model=UserProfile)
async def update_my_capabilities(
    payload: CapabilitiesUpdateRequest, user: User = Depends(get_current_user)
) -> UserProfile:
    """Self-service donor/volunteer toggle. Coordinator is admin-granted only
    (see /api/admin/users/{id}) and isn't accepted by this request body."""

    if payload.is_donor is not None:
        user.capabilities.is_donor = payload.is_donor
    if payload.is_volunteer is not None:
        user.capabilities.is_volunteer = payload.is_volunteer
    get_coordination_service().update_user(user)
    return user_to_profile(user)


@router.post("/verify-email", response_model=UserProfile)
async def verify_email(payload: VerifyEmailRequest) -> UserProfile:
    """Confirm the OTP emailed at signup. Not auth-gated - the user may not
    have kept their token around, only their email + the code."""

    service = get_coordination_service()
    user = service.get_user_by_email(payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    _consume_otp(user, "verify_email", payload.otp)
    user.email_verified = True
    service.update_user(user)
    return user_to_profile(user)


@router.post("/resend-verification", response_model=ForgotPasswordResponse)
async def resend_verification(payload: EmailOnlyRequest) -> ForgotPasswordResponse:
    service = get_coordination_service()
    user = service.get_user_by_email(payload.email)
    # Same generic response whether or not the account exists / is already
    # verified, so this can't be used to probe which emails are registered.
    if user is not None and not user.email_verified:
        otp = await _issue_and_send_otp(user, "verify_email")
        return ForgotPasswordResponse(
            message="If that account needs verification, a new code was sent.",
            dev_otp=_dev_otp(otp),
        )
    return ForgotPasswordResponse(message="If that account needs verification, a new code was sent.")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(payload: EmailOnlyRequest) -> ForgotPasswordResponse:
    service = get_coordination_service()
    user = service.get_user_by_email(payload.email)
    if user is not None:
        otp = await _issue_and_send_otp(user, "reset_password")
        return ForgotPasswordResponse(
            message="If that email is registered, a reset code was sent.",
            dev_otp=_dev_otp(otp),
        )
    # Same response for an unknown email - don't reveal which addresses exist.
    return ForgotPasswordResponse(message="If that email is registered, a reset code was sent.")


@router.post("/reset-password", response_model=UserProfile)
async def reset_password(payload: ResetPasswordRequest) -> UserProfile:
    service = get_coordination_service()
    user = service.get_user_by_email(payload.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired code")

    _consume_otp(user, "reset_password", payload.otp)
    user.password_hash = hash_password(payload.new_password)
    service.update_user(user)
    return user_to_profile(user)
