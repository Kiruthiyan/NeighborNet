"""Disaster event and need models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field

from .base import TimestampedModel, generate_id
from .common import TaskPriority


class DisasterStatus(str, Enum):
    """Lifecycle status for disaster events.

    A coordinator-created disaster (`create_disaster`) still goes straight to
    ACTIVE, matching existing behavior. A citizen-reported disaster
    (`report_disaster`) always starts at PENDING_VALIDATION instead - it
    never auto-activates. `dispatch_disaster`/`assign_disaster_tasks` refuse
    to act on anything that isn't ACTIVE/MONITORING (see
    `DisasterEvent.is_active`), so a pending report can't mobilize volunteers
    until a coordinator reviews and activates it (see
    feature/disaster-verification for that review step).
    """

    PENDING_VALIDATION = "pending_validation"
    ACTIVE = "active"
    MONITORING = "monitoring"
    RESOLVED = "resolved"


class DisasterNeedStatus(str, Enum):
    """Status for specific disaster needs."""

    OPEN = "open"
    PARTIALLY_ASSIGNED = "partially_assigned"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    BLOCKED = "blocked"


class DisasterNeed(TimestampedModel):
    """Specific relief need created from a disaster event."""

    need_id: str = Field(default_factory=lambda: generate_id("need"))
    disaster_id: str
    category: str
    quantity: int = 1
    priority: TaskPriority = TaskPriority.HIGH
    location: Dict[str, Any] = Field(default_factory=dict)
    required_skills: List[str] = Field(default_factory=list)
    required_capacity: int = 0
    status: DisasterNeedStatus = DisasterNeedStatus.OPEN


class DisasterEvent(TimestampedModel):
    """Admin-created disaster event for MVP dispatch workflows."""

    disaster_id: str = Field(default_factory=lambda: generate_id("disaster"))
    type: str
    title: str
    description: Optional[str] = None
    affected_location: Dict[str, Any] = Field(default_factory=dict)
    affected_zones: List[str] = Field(default_factory=list)
    severity: TaskPriority = TaskPriority.HIGH
    start_time: datetime = Field(default_factory=datetime.now)
    status: DisasterStatus = DisasterStatus.ACTIVE
    needs: List[DisasterNeed] = Field(default_factory=list)
    created_by: str

    # Citizen-report provenance. `reported_by` is the user_id from the
    # reporter's auth token (never client-supplied), None for disasters a
    # coordinator created directly via `create_disaster`. `evidence` is
    # free-text/URLs the reporter attached (photos, notes). `is_duplicate`/
    # `duplicate_of` are set by best-effort duplicate detection at report
    # time so an admin can triage corroborating vs. spurious repeat reports
    # (see feature/disaster-verification) - the record is still kept, not
    # silently dropped.
    reported_by: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None

    @property
    def is_active(self) -> bool:
        """Check if disaster still needs operational attention.

        PENDING_VALIDATION is deliberately excluded: a reported-but-unverified
        disaster must never count as active, appear in "active disasters"
        dashboard totals, or be eligible for volunteer dispatch/assignment.
        """

        return self.status in {DisasterStatus.ACTIVE, DisasterStatus.MONITORING}

    @property
    def is_pending_validation(self) -> bool:
        return self.status == DisasterStatus.PENDING_VALIDATION
