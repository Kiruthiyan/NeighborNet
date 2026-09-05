"""Event model definitions for system events and disruptions."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List

from pydantic import Field

from .base import TimestampedModel, generate_id


class EventType(str, Enum):
    """Types of events in the system."""
    # System events
    PLAN_GENERATED = "plan_generated"
    ALLOCATION_CREATED = "allocation_created"
    ASSIGNMENT_CREATED = "assignment_created"
    DELIVERY_COMPLETED = "delivery_completed"
    DELIVERY_FAILED = "delivery_failed"
    
    # Disruption events
    INVENTORY_UNAVAILABLE = "inventory_unavailable"
    VOLUNTEER_UNAVAILABLE = "volunteer_unavailable"
    LOCATION_INACCESSIBLE = "location_inaccessible"
    REQUEST_MODIFIED = "request_modified"
    REQUEST_CANCELLED = "request_cancelled"
    URGENT_REQUEST = "urgent_request"
    
    # Recovery events
    RECOVERY_INITIATED = "recovery_initiated"
    RECOVERY_COMPLETED = "recovery_completed"
    RECOVERY_FAILED = "recovery_failed"
    HUMAN_INTERVENTION = "human_intervention"
    
    # Operational events
    INVENTORY_EXPIRED = "inventory_expired"
    VOLUNTEER_CHECKED_IN = "volunteer_checked_in"
    ORGANIZATION_STATUS_CHANGED = "organization_status_changed"
    
    # System health
    SYSTEM_ERROR = "system_error"
    PERFORMANCE_ALERT = "performance_alert"


class ProcessingStatus(str, Enum):
    """Processing status for events."""
    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    SKIPPED = "skipped"


class EventImpact(TimestampedModel):
    """Impact assessment for events."""
    
    affected_requests: List[str] = Field(default_factory=list)
    affected_allocations: List[str] = Field(default_factory=list) 
    affected_assignments: List[str] = Field(default_factory=list)
    affected_volunteers: List[str] = Field(default_factory=list)
    affected_organizations: List[str] = Field(default_factory=list)
    
    severity: float = 0.0  # 0.0 (no impact) to 1.0 (critical)
    estimated_recovery_time: Optional[int] = None  # minutes
    
    def has_impact(self) -> bool:
        """Check if event has any impact."""
        return any([
            self.affected_requests,
            self.affected_allocations,
            self.affected_assignments,
            self.affected_volunteers,
            self.affected_organizations
        ])


class Event(TimestampedModel):
    """System event model for tracking all significant occurrences."""
    
    event_id: str = Field(default_factory=lambda: generate_id("event"))
    event_type: EventType
    
    # Event details
    timestamp: datetime = Field(default_factory=datetime.now)
    description: str
    
    # Context
    source: str  # "system", "user", "external", "agent"
    source_id: Optional[str] = None  # ID of the source entity
    
    # Event data
    event_data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Impact assessment
    impact: EventImpact = Field(default_factory=EventImpact)
    
    # Processing
    processing_status: ProcessingStatus = ProcessingStatus.PENDING
    processed_at: Optional[datetime] = None
    processing_notes: Optional[str] = None
    
    # Recovery tracking
    triggers_recovery: bool = False
    recovery_session_id: Optional[str] = None
    
    # Correlations
    related_events: List[str] = Field(default_factory=list)
    correlation_id: Optional[str] = None  # For grouping related events
    
    # Agent context
    agent_session_id: Optional[str] = None
    strands_context: Dict[str, Any] = Field(default_factory=dict)
    
    def mark_processed(self, notes: Optional[str] = None) -> None:
        """Mark event as processed."""
        self.processing_status = ProcessingStatus.PROCESSED
        self.processed_at = datetime.now()
        if notes:
            self.processing_notes = notes
    
    def mark_failed(self, error: str) -> None:
        """Mark event processing as failed."""
        self.processing_status = ProcessingStatus.FAILED
        self.processing_notes = error
        self.processed_at = datetime.now()
    
    def add_impact(self, 
                   requests: List[str] = None,
                   allocations: List[str] = None,
                   assignments: List[str] = None,
                   volunteers: List[str] = None,
                   organizations: List[str] = None,
                   severity: float = 0.0) -> None:
        """Add impact information to the event."""
        if requests:
            self.impact.affected_requests.extend(requests)
        if allocations:
            self.impact.affected_allocations.extend(allocations)
        if assignments:
            self.impact.affected_assignments.extend(assignments)
        if volunteers:
            self.impact.affected_volunteers.extend(volunteers)
        if organizations:
            self.impact.affected_organizations.extend(organizations)
        
        if severity > self.impact.severity:
            self.impact.severity = severity
    
    @property
    def requires_immediate_attention(self) -> bool:
        """Check if event requires immediate attention."""
        return (
            self.impact.severity >= 0.7 or
            self.event_type in [
                EventType.URGENT_REQUEST,
                EventType.RECOVERY_FAILED,
                EventType.SYSTEM_ERROR
            ]
        )
    
    @property
    def is_disruption(self) -> bool:
        """Check if event is a disruption."""
        disruption_types = [
            EventType.INVENTORY_UNAVAILABLE,
            EventType.VOLUNTEER_UNAVAILABLE,
            EventType.LOCATION_INACCESSIBLE,
            EventType.REQUEST_MODIFIED,
            EventType.REQUEST_CANCELLED,
            EventType.DELIVERY_FAILED
        ]
        return self.event_type in disruption_types
    
    class Config:
        json_encoders = {
            EventType: lambda v: v.value,
            ProcessingStatus: lambda v: v.value
        }