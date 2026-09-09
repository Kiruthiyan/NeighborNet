"""`/api/admin` - user management and invitations. Admin-only throughout."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from src.auth.dependencies import require_admin
from src.auth.schemas import (
    AdminUserUpdateRequest,
    CreateInvitationRequest,
    InvitationResponse,
    UserProfile,
    user_to_profile,
)
from src.config import get_settings
from src.models.invitations import Invitation, InvitationStatus
from src.models.users import User, UserCapabilities
from src.services.coordination import get_coordination_service
from src.services.email import is_email_configured, send_invitation_email

router = APIRouter(dependencies=[Depends(require_admin)])


def _to_invitation_response(invitation: Invitation, email_sent: bool = False) -> InvitationResponse:
    return InvitationResponse(
        invite_id=invitation.invite_id,
        email=invitation.email,
        token=invitation.token,
        status=invitation.status.value,
        signup_url_path=f"/signup?invite={invitation.token}",
        granted_capabilities=invitation.granted_capabilities,
        email_sent=email_sent,
    )


@router.get("/users", response_model=list[UserProfile])
async def list_users() -> list[UserProfile]:
    return [user_to_profile(u) for u in get_coordination_service().state.users]


@router.patch("/users/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, payload: AdminUserUpdateRequest) -> UserProfile:
    service = get_coordination_service()
    user = service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.is_coordinator is not None:
        user.capabilities.is_coordinator = payload.is_coordinator
    if payload.is_donor is not None:
        user.capabilities.is_donor = payload.is_donor
    if payload.is_volunteer is not None:
        user.capabilities.is_volunteer = payload.is_volunteer

    service.update_user(user)
    return user_to_profile(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, current_admin: User = Depends(require_admin)) -> None:
    if user_id == current_admin.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account"
        )
    deleted = get_coordination_service().delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


@router.post(
    "/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED
)
async def create_invitation(
    payload: CreateInvitationRequest, admin: User = Depends(require_admin)
) -> InvitationResponse:
    service = get_coordination_service()
    if service.get_user_by_email(payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists"
        )

    invitation = Invitation(
        email=payload.email,
        invited_by=admin.user_id,
        granted_capabilities=UserCapabilities(
            is_coordinator=payload.grant_coordinator,
            is_donor=payload.grant_donor,
            is_volunteer=payload.grant_volunteer,
        ),
    )
    service.create_invitation(invitation)

    email_sent = False
    if is_email_configured():
        signup_url = f"{get_settings().frontend_base_url}{invitation.signup_url_path}"
        # SMTP is blocking - run off the event loop so one slow send doesn't
        # stall other requests. Best-effort: a failed send still returns 201
        # with the copyable link, it just reports email_sent=False.
        email_sent = await asyncio.to_thread(
            send_invitation_email, invitation.email, signup_url, admin.name
        )

    return _to_invitation_response(invitation, email_sent=email_sent)


@router.get("/invitations", response_model=list[InvitationResponse])
async def list_invitations() -> list[InvitationResponse]:
    return [
        _to_invitation_response(invitation)
        for invitation in get_coordination_service().state.invitations
    ]


@router.post("/invitations/{invite_id}/revoke", response_model=InvitationResponse)
async def revoke_invitation(invite_id: str) -> InvitationResponse:
    service = get_coordination_service()
    invitation = next(
        (i for i in service.state.invitations if i.invite_id == invite_id), None
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    invitation.status = InvitationStatus.REVOKED
    service.update_invitation(invitation)
    return _to_invitation_response(invitation)
