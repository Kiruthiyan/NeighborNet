"""User model definitions.

Account model: two tiers plus independent capability flags.

- `account_type` is `admin` or `user`. `admin` is never created through
  signup — it's seeded directly (see `seed_data.py`) or set by hand in the
  database. Every signup produces a `user`.
- A `user` account is always implicitly a recipient (can request help).
  `capabilities.is_donor` and `capabilities.is_volunteer` are self-service
  toggles the account holder flips on from their dashboard.
  `capabilities.is_coordinator` is admin-granted only — coordinators approve
  RED-risk decisions and dispatch disaster response, so it isn't a free
  self-toggle like the other two. See docs/AUTH_PLAN.md.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import Field

from .base import BaseModel, TimestampedModel, generate_id


class AccountType(str, Enum):
    """Account tier. Only ADMIN and USER exist - ADMIN is never self-signed-up."""
    ADMIN = "admin"
    USER = "user"


class UserCapabilities(BaseModel):
    """Independent, non-exclusive capabilities a `user` account can hold.

    A base `user` account is always a recipient (not modeled as a flag since
    it can't be turned off). Donor/volunteer are self-toggleable; coordinator
    is admin-granted only (see `require_coordinator` in `src/auth/dependencies.py`).
    """

    is_donor: bool = False
    is_volunteer: bool = False
    is_coordinator: bool = False


class User(TimestampedModel):
    """User model for system participants."""

    user_id: str = Field(default_factory=lambda: generate_id("user"))
    account_type: AccountType = AccountType.USER
    capabilities: UserCapabilities = Field(default_factory=UserCapabilities)
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_info: Dict[str, Any] = Field(default_factory=dict)

    # Authentication
    password_hash: Optional[str] = None

    # Email verification / password reset - a one-time code, hashed like a
    # password, with a purpose and expiry. Only one OTP is live at a time;
    # issuing a new one overwrites it. See src/auth/router.py.
    email_verified: bool = False
    phone_verified: bool = False
    otp_hash: Optional[str] = None
    otp_purpose: Optional[str] = None  # "verify_email" | "reset_password"
    otp_expires_at: Optional[datetime] = None

    # Authorization
    is_active: bool = True
    permissions: Dict[str, bool] = Field(default_factory=dict)

    # Location info
    address: Optional[str] = None
    city: str = "Demo City"
    state: str = "Demo State"
    zip_code: Optional[str] = None

    @property
    def is_admin(self) -> bool:
        """Admins are a superset of coordinators plus user/invitation management."""
        return self.account_type == AccountType.ADMIN

    @property
    def is_coordinator(self) -> bool:
        """True if this account can act as a coordinator (admin or granted)."""
        return self.is_admin or self.capabilities.is_coordinator

    @property
    def is_donor(self) -> bool:
        return self.is_admin or self.capabilities.is_donor

    @property
    def is_volunteer(self) -> bool:
        return self.is_admin or self.capabilities.is_volunteer
