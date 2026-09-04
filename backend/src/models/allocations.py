"""Allocation and delivery assignment model definitions."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional

from pydantic import Field, validator

from .base import TimestampedModel, generate_id


class AssignmentStatus(str, Enum):
    """Status of delivery assignments."""
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Allocation(TimestampedModel):
    """Resource allocation matching requests to inventory."""
    
    allocation_id: str = Field(default_factory=lambda: generate_id("alloc"))
    
    # Core allocation
    request_id: str
    batch_id: str
    quantity_allocated: int
    
    # Planning context
    plan_id: Optional[str] = None  # Reference to planning session
    priority_score: float = 0.0
    
    # Timing
    allocated_datetime: datetime = Field(default_factory=datetime.now)
    expected_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    
    # Status
    status: AssignmentStatus = AssignmentStatus.PENDING
    
    # Quality assurance
    validated: bool = False
    validation_notes: Optional[str] = None
    
    # Recovery tracking
    original_allocation_id: Optional[str] = None  # If this is a recovery allocation
    recovery_reason: Optional[str] = None
    
    @validator('quantity_allocated')
    def validate_quantity_positive(cls, v):
        """Ensure allocated quantity is positive."""
        if v <= 0:
            raise ValueError('Allocated quantity must be positive')
        return v
    
    @property
    def is_active(self) -> bool:
        """Check if allocation is currently active."""
        return self.status in [AssignmentStatus.PENDING, AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
    
    @property
    def is_completed(self) -> bool:
        """Check if allocation is completed (delivered or failed)."""
        return self.status in [AssignmentStatus.DELIVERED, AssignmentStatus.FAILED, AssignmentStatus.CANCELLED]
    
    class Config:
        json_encoders = {
            AssignmentStatus: lambda v: v.value
        }


class DeliveryRoute(TimestampedModel):
    """Optimized delivery route for multiple assignments."""
    
    pickup_location_id: str
    delivery_locations: list[str] = Field(default_factory=list)
    estimated_duration: Optional[int] = None  # minutes
    estimated_distance: Optional[float] = None  # miles
    
    # Route optimization details
    optimization_score: Optional[float] = None
    notes: Optional[str] = None


class DeliveryAssignment(TimestampedModel):
    """Assignment of allocations to volunteers for delivery."""
    
    assignment_id: str = Field(default_factory=lambda: generate_id("assign"))
    
    # Core assignment
    volunteer_id: str
    allocation_ids: list[str] = Field(default_factory=list)
    
    # Delivery details
    pickup_location_id: str
    delivery_route: Optional[DeliveryRoute] = None
    
    # Timing
    assigned_datetime: datetime = Field(default_factory=datetime.now)
    scheduled_pickup: Optional[datetime] = None
    scheduled_delivery: Optional[datetime] = None
    
    actual_pickup: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    
    # Status and tracking
    status: AssignmentStatus = AssignmentStatus.ASSIGNED
    
    # Communication
    volunteer_notified: bool = False
    recipient_notified: bool = False
    
    # Delivery confirmation
    delivery_confirmation: Dict[str, Any] = Field(default_factory=dict)
    delivery_notes: Optional[str] = None
    
    # Quality and feedback
    volunteer_rating: Optional[float] = None  # 1.0 to 5.0
    recipient_rating: Optional[float] = None
    issues_reported: list[str] = Field(default_factory=list)
    
    # Recovery tracking
    original_assignment_id: Optional[str] = None
    recovery_reason: Optional[str] = None
    recovery_iteration: int = 0
    
    @validator('allocation_ids')
    def validate_allocations_not_empty(cls, v):
        """Ensure assignment has at least one allocation."""
        if not v:
            raise ValueError('Assignment must have at least one allocation')
        return v
    
    @property
    def total_allocations(self) -> int:
        """Get total number of allocations in this assignment."""
        return len(self.allocation_ids)
    
    @property
    def is_active(self) -> bool:
        """Check if assignment is currently active."""
        return self.status in [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
    
    @property
    def is_completed(self) -> bool:
        """Check if assignment is completed."""
        return self.status in [AssignmentStatus.DELIVERED, AssignmentStatus.FAILED, AssignmentStatus.CANCELLED]
    
    @property
    def delivery_duration(self) -> Optional[int]:
        """Calculate actual delivery duration in minutes."""
        if self.actual_pickup and self.actual_delivery:
            delta = self.actual_delivery - self.actual_pickup
            return int(delta.total_seconds() / 60)
        return None
    
    def mark_pickup_completed(self) -> None:
        """Mark pickup as completed."""
        self.actual_pickup = datetime.now()
        if self.status == AssignmentStatus.ASSIGNED:
            self.status = AssignmentStatus.IN_PROGRESS
    
    def mark_delivery_completed(self, confirmation: Dict[str, Any] = None, notes: str = None) -> None:
        """Mark delivery as completed."""
        self.actual_delivery = datetime.now()
        self.status = AssignmentStatus.DELIVERED
        if confirmation:
            self.delivery_confirmation = confirmation
        if notes:
            self.delivery_notes = notes
    
    def mark_failed(self, reason: str) -> None:
        """Mark assignment as failed."""
        self.status = AssignmentStatus.FAILED
        if reason not in self.issues_reported:
            self.issues_reported.append(reason)
    
    class Config:
        json_encoders = {
            AssignmentStatus: lambda v: v.value
        }