"""Audit log model definitions for Strands agent actions and system events."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List

from pydantic import Field

from .base import TimestampedModel, generate_id


class AuditActionType(str, Enum):
    """Types of actions that can be audited."""
    # Agent actions
    AGENT_DECISION = "agent_decision"
    AGENT_TOOL_EXECUTION = "agent_tool_execution"
    AGENT_PLAN_GENERATION = "agent_plan_generation"
    AGENT_RECOVERY_ATTEMPT = "agent_recovery_attempt"
    
    # System actions
    DATA_CREATE = "data_create"
    DATA_UPDATE = "data_update"
    DATA_DELETE = "data_delete"
    
    # User actions
    USER_LOGIN = "user_login"
    USER_APPROVAL = "user_approval"
    USER_OVERRIDE = "user_override"
    USER_INTERVENTION = "user_intervention"
    
    # Recovery actions
    RECOVERY_INITIATED = "recovery_initiated"
    RECOVERY_COMPLETED = "recovery_completed"
    RECOVERY_FAILED = "recovery_failed"
    
    # Allocation actions
    ALLOCATION_CREATED = "allocation_created"
    ALLOCATION_MODIFIED = "allocation_modified"
    ALLOCATION_CANCELLED = "allocation_cancelled"
    
    # Assignment actions
    ASSIGNMENT_CREATED = "assignment_created"
    ASSIGNMENT_MODIFIED = "assignment_modified"
    ASSIGNMENT_COMPLETED = "assignment_completed"
    
    # Safety and compliance
    SAFETY_CHECK = "safety_check"
    COMPLIANCE_VALIDATION = "compliance_validation"
    QUALITY_ASSURANCE = "quality_assurance"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class StrandsAgentContext(TimestampedModel):
    """Context information for Strands agent actions."""
    
    agent_id: str
    agent_type: str  # "orchestrator", "sentinel", "planner", "recovery"
    session_id: str
    
    # Agent state
    agent_state: Dict[str, Any] = Field(default_factory=dict)
    memory_context: Dict[str, Any] = Field(default_factory=dict)
    
    # Tool execution
    tools_used: List[str] = Field(default_factory=list)
    tool_results: Dict[str, Any] = Field(default_factory=dict)
    
    # Human-in-the-loop
    hitl_triggered: bool = False
    hitl_reason: Optional[str] = None
    hitl_response: Optional[Dict[str, Any]] = None
    
    # Performance metrics
    execution_time_ms: Optional[int] = None
    tokens_consumed: Optional[int] = None
    api_calls_made: int = 0


class StrandsAuditLog(TimestampedModel):
    """Comprehensive audit log for Strands agent system."""
    
    log_id: str = Field(default_factory=lambda: generate_id("audit"))
    
    # Basic event information
    timestamp: datetime = Field(default_factory=datetime.now)
    action_type: AuditActionType
    severity: AuditSeverity = AuditSeverity.INFO
    
    # Actor information
    actor_type: str  # "agent", "user", "system"
    actor_id: str
    actor_name: Optional[str] = None
    
    # Action details
    action_description: str
    resource_type: Optional[str] = None  # "allocation", "assignment", "request", etc.
    resource_id: Optional[str] = None
    
    # Context and metadata
    event_context: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Strands-specific context
    strands_context: Optional[StrandsAgentContext] = None
    
    # Data changes
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    changes: Dict[str, Any] = Field(default_factory=dict)
    
    # Impact assessment
    affected_entities: List[str] = Field(default_factory=list)
    impact_score: float = 0.0  # 0.0 to 1.0
    
    # Compliance and security
    compliance_tags: List[str] = Field(default_factory=list)
    security_implications: List[str] = Field(default_factory=list)
    
    # Error and exception information
    error_details: Optional[Dict[str, Any]] = None
    stack_trace: Optional[str] = None
    
    # Recovery tracking
    recovery_session_id: Optional[str] = None
    recovery_iteration: int = 0
    
    # Correlation and tracing
    correlation_id: Optional[str] = None
    parent_log_id: Optional[str] = None
    trace_id: Optional[str] = None
    
    # Human oversight
    requires_review: bool = False
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    review_timestamp: Optional[datetime] = None
    
    def add_strands_context(self,
                           agent_id: str,
                           agent_type: str,
                           session_id: str,
                           **kwargs) -> None:
        """Add Strands agent context to the audit log."""
        self.strands_context = StrandsAgentContext(
            agent_id=agent_id,
            agent_type=agent_type,
            session_id=session_id,
            **kwargs
        )
    
    def add_change(self, field: str, old_value: Any, new_value: Any) -> None:
        """Add a tracked change."""
        self.changes[field] = {
            "from": old_value,
            "to": new_value,
            "timestamp": datetime.now().isoformat()
        }
    
    def add_error(self, error_message: str, error_type: str = None, stack_trace: str = None) -> None:
        """Add error information."""
        self.severity = AuditSeverity.ERROR
        self.error_details = {
            "message": error_message,
            "type": error_type,
            "timestamp": datetime.now().isoformat()
        }
        if stack_trace:
            self.stack_trace = stack_trace
    
    def flag_for_review(self, reason: str) -> None:
        """Flag audit log for human review."""
        self.requires_review = True
        if "review_reasons" not in self.metadata:
            self.metadata["review_reasons"] = []
        self.metadata["review_reasons"].append(reason)
    
    def mark_reviewed(self, reviewer_id: str, notes: str = None) -> None:
        """Mark audit log as reviewed."""
        self.reviewed_by = reviewer_id
        self.review_timestamp = datetime.now()
        if notes:
            self.review_notes = notes
    
    @property
    def is_agent_action(self) -> bool:
        """Check if this is a Strands agent action."""
        return self.actor_type == "agent" and self.strands_context is not None
    
    @property
    def is_critical(self) -> bool:
        """Check if this is a critical audit event."""
        return (
            self.severity == AuditSeverity.CRITICAL or
            self.impact_score >= 0.8 or
            bool(self.security_implications)
        )
    
    @property
    def requires_attention(self) -> bool:
        """Check if this audit log requires immediate attention."""
        return (
            self.is_critical or
            self.requires_review or
            self.severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]
        )
    
    @classmethod
    def log_agent_action(cls,
                        agent_id: str,
                        agent_type: str,
                        session_id: str,
                        action_description: str,
                        action_type: AuditActionType = AuditActionType.AGENT_TOOL_EXECUTION,
                        **kwargs) -> "StrandsAuditLog":
        """Create an audit log for agent actions."""
        log = cls(
            action_type=action_type,
            actor_type="agent",
            actor_id=agent_id,
            action_description=action_description,
            **kwargs
        )
        log.add_strands_context(agent_id, agent_type, session_id)
        return log
    
    @classmethod
    def log_user_action(cls,
                       user_id: str,
                       user_name: str,
                       action_description: str,
                       action_type: AuditActionType,
                       **kwargs) -> "StrandsAuditLog":
        """Create an audit log for user actions."""
        return cls(
            action_type=action_type,
            actor_type="user",
            actor_id=user_id,
            actor_name=user_name,
            action_description=action_description,
            **kwargs
        )
    
    @classmethod
    def log_system_action(cls,
                         action_description: str,
                         action_type: AuditActionType,
                         **kwargs) -> "StrandsAuditLog":
        """Create an audit log for system actions."""
        return cls(
            action_type=action_type,
            actor_type="system",
            actor_id="system",
            action_description=action_description,
            **kwargs
        )
    
    class Config:
        json_encoders = {
            AuditActionType: lambda v: v.value,
            AuditSeverity: lambda v: v.value
        }