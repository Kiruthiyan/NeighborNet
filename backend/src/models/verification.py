"""OTP and QR Verification models for NeighborNet tasks and donations."""

from datetime import datetime, timedelta, timezone
from enum import Enum
import json
import secrets
from typing import Optional
from pydantic import Field

from .base import TimestampedModel, generate_id


class VerificationCodeType(str, Enum):
    """Type of verification code."""

    PICKUP = "pickup"
    DELIVERY = "delivery"


class VerificationStatus(str, Enum):
    """Lifecycle status of a verification code."""

    PENDING = "pending"
    VERIFIED = "verified"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"


class TaskVerificationCode(TimestampedModel):
    """Single-use OTP/QR verification code for task pickup or delivery."""

    verification_id: str = Field(default_factory=lambda: generate_id("ver"))
    task_id: str
    code_type: VerificationCodeType
    otp_code: str = Field(default_factory=lambda: f"{secrets.randbelow(900000) + 100000}")
    qr_payload: str = ""
    status: VerificationStatus = VerificationStatus.PENDING
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=24))
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if not self.qr_payload:
            self.qr_payload = json.dumps({
                "verification_id": self.verification_id,
                "task_id": self.task_id,
                "type": self.code_type.value if isinstance(self.code_type, Enum) else self.code_type,
                "code": self.otp_code,
            })

    @property
    def is_valid(self) -> bool:
        """Check if code can currently be used for verification."""
        if self.status != VerificationStatus.PENDING:
            return False
        # Normalize timezone awareness for expiration comparison
        now = datetime.now(timezone.utc)
        exp = self.expires_at if self.expires_at.tzinfo else self.expires_at.replace(tzinfo=timezone.utc)
        if now > exp:
            return False
        return True

    def mark_verified(self, volunteer_id: str) -> None:
        """Mark code as verified and single-use spent."""
        if not self.is_valid:
            raise ValueError("Verification code is not valid, expired, or already used")
        self.status = VerificationStatus.VERIFIED
        self.verified_at = datetime.now(timezone.utc)
        self.verified_by = volunteer_id
        self.update_timestamp()

    def invalidate(self) -> None:
        """Invalidate code (e.g. when volunteer is replaced)."""
        self.status = VerificationStatus.INVALIDATED
        self.update_timestamp()
