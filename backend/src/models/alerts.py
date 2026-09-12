"""Volunteer alert models."""

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional

from pydantic import Field

from .base import TimestampedModel, generate_id
from .common import TaskPriority


class VolunteerAlertStatus(str, Enum):
    """Volunteer alert response state."""

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TIMED_OUT = "timed_out"
    CANCELLED = "cancelled"


class VolunteerAlert(TimestampedModel):
    """Practical dashboard/SNS/email alert sent to a volunteer."""

    alert_id: str = Field(default_factory=lambda: generate_id("alert"))
    volunteer_id: str
    disaster_id: Optional[str] = None
    task_id: Optional[str] = None
    donation_id: Optional[str] = None
    request_id: Optional[str] = None
    task_category: str
    location: str = "Zone B"
    pickup_location: Optional[str] = None
    destination: Optional[str] = None
    resource_type: Optional[str] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    approximate_distance: float = 0.0
    estimated_travel_time: Optional[str] = None
    request_info: Optional[str] = None
    urgency: TaskPriority = TaskPriority.HIGH
    assistance_required: str = "Transport surplus donation to verified community request"
    status: VolunteerAlertStatus = VolunteerAlertStatus.PENDING
    sent_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.now() + timedelta(minutes=15)
    )
    responded_at: Optional[datetime] = None
    response: Optional[str] = None

    @property
    def is_eligible_response(self) -> bool:
        """Accepted alert makes volunteer eligible, not automatically assigned."""

        return self.status == VolunteerAlertStatus.ACCEPTED

    def accept(self) -> None:
        """Record volunteer acceptance."""

        self.status = VolunteerAlertStatus.ACCEPTED
        self.responded_at = datetime.now()
        self.response = "accepted"
        self.update_timestamp()

    def decline(self) -> None:
        """Record volunteer decline."""

        self.status = VolunteerAlertStatus.DECLINED
        self.responded_at = datetime.now()
        self.response = "declined"
        self.update_timestamp()

    def timeout(self) -> None:
        """Mark alert as timed out."""

        self.status = VolunteerAlertStatus.TIMED_OUT
        self.update_timestamp()
