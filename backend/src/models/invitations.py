"""Invitation model definitions.

An admin invites someone by email, optionally pre-granting capabilities
(e.g. inviting a person straight in as a coordinator). The MVP delivery
mechanism is a signup link the admin copies from the admin panel rather than
an actual sent email - see docs/AUTH_PLAN.md.
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
from pydantic import Field

from .base import TimestampedModel, generate_id
from .users import UserCapabilities


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class Invitation(TimestampedModel):
    """An admin-issued invitation to sign up, optionally with granted capabilities."""

    invite_id: str = Field(default_factory=lambda: generate_id("invite"))
    email: str
    invited_by: str  # admin user_id
    token: str = Field(default_factory=lambda: generate_id("tok"))
    granted_capabilities: UserCapabilities = Field(default_factory=UserCapabilities)
    status: InvitationStatus = InvitationStatus.PENDING
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now() + timedelta(days=7)
    )
    accepted_by_user_id: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        return self.status == InvitationStatus.PENDING and datetime.now() < self.expires_at
