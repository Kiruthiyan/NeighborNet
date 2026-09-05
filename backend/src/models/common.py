"""Shared enums used across Normal and Disaster operating modes."""

from enum import Enum


class OperatingMode(str, Enum):
    """NeighborNet operating mode."""

    NORMAL = "normal"
    DISASTER = "disaster"


class TaskLifecycle(str, Enum):
    """Unified task lifecycle for normal deliveries and disaster tasks."""

    AVAILABLE = "available"
    ALERTED = "alerted"
    ACCEPTED = "accepted"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    NEEDS_ATTENTION = "needs_attention"
    CANCELLED = "cancelled"
    FAILED = "failed"


class TaskPriority(str, Enum):
    """Task priority shared across modes."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
