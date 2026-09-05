"""Disaster event and need models."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import Field

from .base import TimestampedModel, generate_id
from .common import TaskPriority


class DisasterStatus(str, Enum):
    """Lifecycle status for admin-created disaster events."""

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

    @property
    def is_active(self) -> bool:
        """Check if disaster still needs operational attention."""

        return self.status in {DisasterStatus.ACTIVE, DisasterStatus.MONITORING}
