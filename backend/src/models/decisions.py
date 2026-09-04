"""Decision model definitions for Strands agent decisions and human-in-the-loop."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List

from pydantic import Field

from .base import TimestampedModel, generate_id


class DecisionType(str, Enum):
    """Types of decisions in the system."""
    # Planning decisions
    ALLOCATION_DECISION = "allocation_decision"
    ASSIGNMENT_DECISION = "assignment_decision"
    PRIORITIZATION_DECISION = "prioritization_decision"
    
    # Recovery decisions
    RECOVERY_STRATEGY = "recovery_strategy"
    REALLOCATION_DECISION = "reallocation_decision"
    VOLUNTEER_REASSIGNMENT = "volunteer_reassignment"
    
    # Operational decisions
    INVENTORY_DISPOSITION = "inventory_disposition"
    REQUEST_MODIFICATION = "request_modification"
    SCHEDULE_ADJUSTMENT = "schedule_adjustment"
    
    # Safety decisions
    SAFETY_OVERRIDE = "safety_override"
    QUALITY_REJECTION = "quality_rejection"
    ACCESS_RESTRICTION = "access_restriction"
    
    # Strategic decisions
    RESOURCE_PROCUREMENT = "resource_procurement"
    PARTNERSHIP_DECISION = "partnership_decision"
    POLICY_CHANGE = "policy_change"


class RiskClassification(str, Enum):
    """Risk classification for decisions."""
    GREEN = "green"      # Safe for automatic execution
    AMBER = "amber"      # Requires coordinator approval
    RED = "red"          # Never executed autonomously


class DecisionOption(TimestampedModel):
    """Individual decision option or alternative."""
    
    option_id: str = Field(default_factory=lambda: generate_id("opt"))
    title: str
    description: str
    
    # Analysis
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    
    # Quantitative assessment
    cost: Optional[float] = None
    benefit_score: Optional[float] = None
    risk_score: Optional[float] = None
    feasibility_score: Optional[float] = None
    
    # Implementation details
    implementation_steps: List[str] = Field(default_factory=list)
    estimated_duration: Optional[int] = None  # minutes
    required_resources: Dict[str, Any] = Field(default_factory=dict)
    
    # Dependencies and constraints
    prerequisites: List[str] = Field(default_factory=list)
    constraints: List[str] = Field(default_factory=list)
    
    # Outcome prediction
    predicted_outcomes: Dict[str, Any] = Field(default_factory=dict)
    confidence_level: Optional[float] = None  # 0.0 to 1.0


class HumanApproval(TimestampedModel):
    """Human approval/rejection of decisions."""
    
    approver_user_id: str
    approver_name: str
    approver_role: str
    
    approved: bool
    approval_timestamp: datetime = Field(default_factory=datetime.now)
    
    comments: Optional[str] = None
    conditions: List[str] = Field(default_factory=list)
    
    # Follow-up requirements
    requires_monitoring: bool = False
    monitoring_duration: Optional[int] = None  # hours
    escalation_triggers: List[str] = Field(default_factory=list)


class Decision(TimestampedModel):
    """Decision model for tracking agent and human decisions."""
    
    decision_id: str = Field(default_factory=lambda: generate_id("decision"))
    decision_type: DecisionType
    
    # Context
    title: str
    description: str
    context: Dict[str, Any] = Field(default_factory=dict)
    
    # Triggering information
    triggered_by_event_id: Optional[str] = None
    related_entity_ids: List[str] = Field(default_factory=list)
    
    # Decision analysis
    options: List[DecisionOption] = Field(default_factory=list)
    recommended_option_id: Optional[str] = None
    
    # Risk assessment
    risk_classification: RiskClassification
    risk_factors: List[str] = Field(default_factory=list)
    mitigation_strategies: List[str] = Field(default_factory=list)
    
    # Agent analysis
    agent_reasoning: Optional[str] = None
    confidence_score: Optional[float] = None
    alternative_considered: int = 0
    
    # Decision outcome
    selected_option_id: Optional[str] = None
    decided_at: Optional[datetime] = None
    decision_maker: Optional[str] = None  # "agent" or user ID
    
    # Human-in-the-loop
    requires_human_approval: bool = False
    human_approval: Optional[HumanApproval] = None
    
    # Implementation tracking
    implementation_started: bool = False
    implementation_completed: bool = False
    implementation_notes: Optional[str] = None
    
    # Results and feedback
    actual_outcomes: Dict[str, Any] = Field(default_factory=dict)
    success_metrics: Dict[str, float] = Field(default_factory=dict)
    lessons_learned: List[str] = Field(default_factory=list)
    
    # Recovery context
    recovery_session_id: Optional[str] = None
    recovery_iteration: int = 0
    
    # Strands context
    strands_session_id: Optional[str] = None
    strands_agent_id: Optional[str] = None
    strands_context: Dict[str, Any] = Field(default_factory=dict)
    
    def add_option(self, title: str, description: str, **kwargs) -> DecisionOption:
        """Add a decision option."""
        option = DecisionOption(title=title, description=description, **kwargs)
        self.options.append(option)
        return option
    
    def set_recommended_option(self, option_id: str) -> None:
        """Set the recommended option."""
        # Validate option exists
        if not any(opt.option_id == option_id for opt in self.options):
            raise ValueError(f"Option {option_id} not found")
        self.recommended_option_id = option_id
    
    def select_option(self, option_id: str, decision_maker: str) -> None:
        """Select an option for implementation."""
        if not any(opt.option_id == option_id for opt in self.options):
            raise ValueError(f"Option {option_id} not found")
        
        self.selected_option_id = option_id
        self.decided_at = datetime.now()
        self.decision_maker = decision_maker
    
    def require_human_approval(self, reason: str = None) -> None:
        """Mark decision as requiring human approval."""
        self.requires_human_approval = True
        if reason and reason not in self.risk_factors:
            self.risk_factors.append(reason)
    
    def approve(self, approver_user_id: str, approver_name: str, approver_role: str, 
                comments: str = None, conditions: List[str] = None) -> None:
        """Approve the decision."""
        self.human_approval = HumanApproval(
            approver_user_id=approver_user_id,
            approver_name=approver_name,
            approver_role=approver_role,
            approved=True,
            comments=comments,
            conditions=conditions or []
        )
    
    def reject(self, approver_user_id: str, approver_name: str, approver_role: str, 
               reason: str) -> None:
        """Reject the decision."""
        self.human_approval = HumanApproval(
            approver_user_id=approver_user_id,
            approver_name=approver_name,
            approver_role=approver_role,
            approved=False,
            comments=reason
        )
    
    @property
    def is_approved(self) -> bool:
        """Check if decision is approved for implementation."""
        if not self.requires_human_approval:
            return True  # Auto-approved for GREEN decisions
        return self.human_approval and self.human_approval.approved
    
    @property
    def can_implement(self) -> bool:
        """Check if decision can be implemented."""
        return self.selected_option_id and self.is_approved and not self.implementation_started
    
    @property
    def selected_option(self) -> Optional[DecisionOption]:
        """Get the selected decision option."""
        if not self.selected_option_id:
            return None
        return next((opt for opt in self.options if opt.option_id == self.selected_option_id), None)
    
    @property
    def recommended_option(self) -> Optional[DecisionOption]:
        """Get the recommended decision option."""
        if not self.recommended_option_id:
            return None
        return next((opt for opt in self.options if opt.option_id == self.recommended_option_id), None)
    
    class Config:
        json_encoders = {
            DecisionType: lambda v: v.value,
            RiskClassification: lambda v: v.value
        }
