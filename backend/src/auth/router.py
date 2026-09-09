"""`/api/auth` - signup, login, and self-service profile/capabilities."""

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.dependencies import get_current_user
from src.auth.schemas import (
    CapabilitiesUpdateRequest,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserProfile,
    user_to_profile,
)
from src.auth.security import create_access_token, hash_password, verify_password
from src.models.invitations import InvitationStatus
from src.models.users import User, UserCapabilities
from src.services.coordination import get_coordination_service

router = APIRouter()


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

    token = create_access_token(user.user_id)
    return TokenResponse(access_token=token, user=user_to_profile(user))


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
