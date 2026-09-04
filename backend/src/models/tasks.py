"""Unified task model for normal delivery and disaster response work."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from .base import TimestampedModel, generate_id
from .common import OperatingMode, TaskLifecycle, TaskPriority
from .decisions import RiskClassification


class CoordinationTask(TimestampedModel):
    """Task assigned to a volunteer in either operating mode."""

    task_id: str = Field(default_factory=lambda: generate_id("task"))
    operating_mode: OperatingMode = OperatingMode.NORMAL
    title: str
    description: str
    category: str = "food_delivery"

    disaster_id: Optional[str] = None
    request_id: Optional[str] = None
    need_id: Optional[str] = None
    resource_batch_id: Optional[str] = None
    allocation_ids: List[str] = Field(default_factory=list)
    volunteer_id: Optional[str] = None

    pickup_location: Dict[str, Any] = Field(default_factory=dict)
    destination: Dict[str, Any] = Field(default_factory=dict)
    affected_zones: List[str] = Field(default_factory=list)
    quantity: int = 1
    priority: TaskPriority = TaskPriority.MEDIUM
    expected_completion_time: Optional[datetime] = None

    required_skills: List[str] = Field(default_factory=list)
    required_capacity: int = 0
    route_status: str = "open"
    route_safe: bool = True
    status: TaskLifecycle = TaskLifecycle.AVAILABLE
    validation_summary: Dict[str, Any] = Field(default_factory=dict)
    risk_classification: RiskClassification = RiskClassification.GREEN

    original_task_id: Optional[str] = None
    recovery_reason: Optional[str] = None
    preserved: bool = False

    @property
    def needs_attention(self) -> bool:
        """Whether task should appear in Needs Attention board column."""

        return self.status in {TaskLifecycle.NEEDS_ATTENTION, TaskLifecycle.FAILED}

    @property
    def is_active(self) -> bool:
        """Whether task is still operationally active."""

        return self.status in {
            TaskLifecycle.AVAILABLE,
            TaskLifecycle.ALERTED,
            TaskLifecycle.ACCEPTED,
            TaskLifecycle.ASSIGNED,
            TaskLifecycle.IN_PROGRESS,
            TaskLifecycle.NEEDS_ATTENTION,
        }

    def assign(self, volunteer_id: str) -> None:
        """Assign task to volunteer after validation."""

        self.volunteer_id = volunteer_id
        self.status = TaskLifecycle.ASSIGNED
        self.update_timestamp()

    def mark_in_progress(self) -> None:
        """Mark task as in progress."""

        self.status = TaskLifecycle.IN_PROGRESS
        self.update_timestamp()

    def mark_completed(self) -> None:
        """Mark task as completed."""

        self.status = TaskLifecycle.COMPLETED
        self.update_timestamp()

    def mark_failed(self, reason: str) -> None:
        """Mark task as failed and attach reason."""

        self.status = TaskLifecycle.FAILED
        self.validation_summary["failure_reason"] = reason
        self.update_timestamp()
