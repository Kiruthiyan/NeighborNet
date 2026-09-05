"""
Constraint Validation Engine for NeighborNet Resilience.
Enforces business rules, safety requirements, and operational constraints.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Dict, Any, Optional, Set, Callable
from dataclasses import dataclass

from ..models import (
    InventoryBatch, Request, Volunteer, Allocation, DeliveryAssignment,
    ResourceType, UrgencyLevel, InventoryStatus, RequestStatus, VolunteerStatus
)


class ConstraintSeverity(Enum):
    """Severity levels for constraint violations."""
    INFO = "info"           # Informational, no action needed
    WARNING = "warning"     # Should be addressed but not blocking
    ERROR = "error"         # Blocking violation, must be resolved
    CRITICAL = "critical"   # Safety violation, immediate action required


class ConstraintType(Enum):
    """Types of constraints in the system."""
    BUSINESS_RULE = "business_rule"
    SAFETY_REQUIREMENT = "safety_requirement"
    OPERATIONAL_LIMIT = "operational_limit"
    REGULATORY_COMPLIANCE = "regulatory_compliance"
    RESOURCE_CONSTRAINT = "resource_constraint"
    TIME_CONSTRAINT = "time_constraint"


@dataclass
class ConstraintViolation:
    """Represents a constraint violation."""
    constraint_id: str
    severity: ConstraintSeverity
    constraint_type: ConstraintType
    message: str
    details: Dict[str, Any]
    affected_entities: List[str]
    recommendation: Optional[str] = None
    auto_fixable: bool = False
    
    def __post_init__(self):
        self.timestamp = datetime.now()
    
    @property
    def is_blocking(self) -> bool:
        """Check if violation is blocking."""
        return self.severity in [ConstraintSeverity.ERROR, ConstraintSeverity.CRITICAL]
    
    @property
    def is_safety_critical(self) -> bool:
        """Check if violation is safety critical."""
        return (self.severity == ConstraintSeverity.CRITICAL or 
                self.constraint_type == ConstraintType.SAFETY_REQUIREMENT)


@dataclass  
class ValidationContext:
    """Context for constraint validation."""
    operation_type: str
    entity_data: Dict[str, Any]
    related_entities: Dict[str, List[Dict[str, Any]]]
    current_time: datetime
    metadata: Dict[str, Any]
    
    def __post_init__(self):
        if not self.current_time:
            self.current_time = datetime.now()
        if not self.metadata:
            self.metadata = {}
    
    def get_entity(self, entity_type: str) -> Optional[Dict[str, Any]]:
        """Get primary entity data."""
        return self.entity_data.get(entity_type)
    
    def get_related_entities(self, entity_type: str) -> List[Dict[str, Any]]:
        """Get related entities of specified type."""
        return self.related_entities.get(entity_type, [])


class ConstraintValidator(ABC):
    """Base class for constraint validators."""
    
    def __init__(self, constraint_id: str, severity: ConstraintSeverity, 
                 constraint_type: ConstraintType, description: str):
        self.constraint_id = constraint_id
        self.severity = severity
        self.constraint_type = constraint_type
        self.description = description
        self.enabled = True
    
    @abstractmethod
    def validate(self, context: ValidationContext) -> List[ConstraintViolation]:
        """Validate constraints and return violations."""
        pass
    
    def is_applicable(self, context: ValidationContext) -> bool:
        """Check if validator applies to this context."""
        return self.enabled
    
    def create_violation(self, message: str, details: Dict[str, Any] = None,
                        affected_entities: List[str] = None,
                        recommendation: str = None, auto_fixable: bool = False) -> ConstraintViolation:
        """Helper to create constraint violation."""
        return ConstraintViolation(
            constraint_id=self.constraint_id,
            severity=self.severity,
            constraint_type=self.constraint_type,
            message=message,
            details=details or {},
            affected_entities=affected_entities or [],
            recommendation=recommendation,
            auto_fixable=auto_fixable
        )


class BusinessRule(ConstraintValidator):
    """Business rule constraint validator."""
    
    def __init__(self, rule_id: str, description: str, severity: ConstraintSeverity = ConstraintSeverity.ERROR):
        super().__init__(rule_id, severity, ConstraintType.BUSINESS_RULE, description)


class OperationalConstraint(ConstraintValidator):
    """Operational constraint validator."""
    
    def __init__(self, constraint_id: str, description: str, severity: ConstraintSeverity = ConstraintSeverity.WARNING):
        super().__init__(constraint_id, severity, ConstraintType.OPERATIONAL_LIMIT, description)


# Inventory Constraint Validators

class InventoryExpiryConstraint(BusinessRule):
    """Ensure inventory items are not expired or expiring too soon."""
    
    def __init__(self, min_shelf_life_hours: int = 2):
        super().__init__("INV_001", "Inventory items must have adequate shelf life")
        self.min_shelf_life_hours = min_shelf_life_hours
    
    def validate(self, context: ValidationContext) -> List[ConstraintViolation]:
        violations = []
        
        # Check inventory batches
        inventory_items = context.get_related_entities("inventory_batches")
        current_time = context.current_time
        
        for item in inventory_items:
            batch = InventoryBatch.from_dynamodb(item)
            
            # Skip items without expiry dates
            if not batch.expiry_datetime:
                continue
            
            # Check if already expired
            if batch.is_expired:
                violations.append(self.create_violation(
                    f"Inventory batch {batch.batch_id} has expired",
                    details={
                        "batch_id": batch.batch_id,
                        "expiry_datetime": batch.expiry_datetime.isoformat(),
                        "expired_hours": (current_time - batch.expiry_datetime).total_seconds() / 3600
                    },
                    affected_entities=[batch.batch_id],
                    recommendation="Remove expired inventory from available pool"
                ))
            
            # Check if expiring too soon
            elif batch.expiry_datetime <= current_time + timedelta(hours=self.min_shelf_life_hours):
                hours_remaining = (batch.expiry_datetime - current_time).total_seconds() / 3600
                severity = ConstraintSeverity.CRITICAL if hours_remaining < 1 else ConstraintSeverity.ERROR
                
                violations.append(ConstraintViolation(
                    constraint_id=self.constraint_id,
                    severity=severity,
                    constraint_type=self.constraint_type,
                    message=f"Inventory batch {batch.batch_id} expires in {hours_remaining:.1f} hours",
                    details={
                        "batch_id": batch.batch_id,
                        "expiry_datetime": batch.expiry_datetime.isoformat(),
                        "hours_remaining": hours_remaining
                    },
                    affected_entities=[batch.batch_id],
                    recommendation="Prioritize for immediate allocation or disposal"
                ))
        
        return violations


class InventoryAvailabilityConstraint(BusinessRule):
    """Ensure allocated quantities don't exceed available inventory."""
    
    def __init__(self):
        super().__init__("INV_002", "Allocated quantities must not exceed available inventory")
    
    def validate(self, context: ValidationContext) -> List[ConstraintViolation]:
        violations = []
        
        # Check if this is an allocation operation
        if context.operation_type != "allocation":
            return violations
        
        allocation_data = context.get_entity("allocation")
        if not allocation_data:
            return violations
        
        batch_id = allocation_data.get("batch_id")
        quantity_to_allocate = allocation_data.get("quantity_allocated", 0)
        
        # Find the inventory batch
        inventory_items = context.get_related_entities("inventory_batches")
        target_batch = None
        
        for item in inventory_items:
            if item.get("batch_id") == batch_id:
                target_batch = InventoryBatch.from_dynamodb(item)
                break
        
        if not target_batch:
            violations.append(self.create_violation(
                f"Inventory batch {batch_id} not found",
                details={"batch_id": batch_id, "quantity_requested": quantity_to_allocate},
                affected_entities=[batch_id],
                recommendation="Verify batch ID and inventory availability"
            ))
            return violations
        
        # Check availability
        available_quantity = target_batch.quantity_unallocated
        if quantity_to_allocate > available_quantity:
            violations.append(self.create_violation(
                f"Allocation exceeds available quantity: requested {quantity_to_allocate}, available {available_quantity}",
                details={
                    "batch_id": batch_id,
                    "quantity_requested": quantity_to_allocate,
                    "quantity_available": available_quantity,
                    "total_quantity": target_batch.quantity_available,
                    "already_allocated": target_batch.quantity_allocated
                },
                affected_entities=[batch_id],
                recommendation=f"Reduce allocation to {available_quantity} or find additional inventory"
            ))
        
        return violations

# Request Constraint Validators

class RequestTimeConstraint(BusinessRule):
    """Ensure requests can be fulfilled within required timeframe."""
    
    def __init__(self, buffer_hours: int = 2):
        super().__init__("REQ_001", "Requests must be fulfillable within required timeframe")
        self.buffer_hours = buffer_hours
    
    def validate(self, context: ValidationContext) -> List[ConstraintViolation]:
        violations = []
        
        requests = context.get_related_entities("requests")
        current_time = context.current_time
        
        for req_data in requests:
            request = Request.from_dynamodb(req_data)
            
            # Check if request is already overdue
            if request.is_overdue:
                violations.append(self.create_violation(
                    f"Request {request.request_id} is overdue",
                    details={
                        "request_id": request.request_id,
                        "required_by": request.required_by.isoformat(),
                        "overdue_hours": (current_time - request.required_by).total_seconds() / 3600
                    },
                    affected_entities=[request.request_id],
                    recommendation="Escalate as urgent or consider cancellation if no longer needed",
                    severity=ConstraintSeverity.CRITICAL
                ))
            
            # Check if enough time remains for processing
            elif request.required_by <= current_time + timedelta(hours=self.buffer_hours):
                hours_remaining = (request.required_by - current_time).total_seconds() / 3600
                violations.append(self.create_violation(
                    f"Request {request.request_id} requires fulfillment within {hours_remaining:.1f} hours",
                    details={
                        "request_id": request.request_id,
                        "required_by": request.required_by.isoformat(),
                        "hours_remaining": hours_remaining,
                        "urgency_level": request.urgency_level.value
                    },
                    affected_entities=[request.request_id],
                    recommendation="Prioritize for immediate processing",
                    severity=ConstraintSeverity.ERROR if hours_remaining < 1 else ConstraintSeverity.WARNING
                ))
        
        return violations


class DietaryComplianceConstraint(BusinessRule):
    """Ensure dietary restrictions are met."""
    
    def __init__(self):
        super().__init__("REQ_002", "Dietary restrictions must be strictly enforced")
        self.severity = ConstraintSeverity.CRITICAL  # Food allergies are critical
    
    def validate(self, context: ValidationContext) -> List[ConstraintViolation]:
        violations = []
        
        # Check allocation operations
        if context.operation_type == "allocation":
            allocation_data = context.get_entity("allocation")
            if not allocation_data:
                return violations
            
            # Get request and inventory details
            request_id = allocation_data.get("request_id")
            batch_id = allocation_data.get("batch_id")
            
            request_data = None
            batch_data = None
            
            for req in context.get_related_entities("requests"):
                if req.get("request_id") == request_id:
                    request_data = req
                    break
            
            for batch in context.get_related_entities("inventory_batches"):
                if batch.get("batch_id") == batch_id:
                    batch_data = batch
                    break
            
            if not request_data or not batch_data:
                return violations
            
            request = Request.from_dynamodb(request_data)
            batch = InventoryBatch.from_dynamodb(batch_data)
            
            # Check dietary compatibility
            dietary_issues = self._check_dietary_compatibility(request, batch)
            for issue in dietary_issues:
                violations.append(self.create_violation(
                    issue["message"],
                    details=issue["details"],
                    affected_entities=[request_id, batch_id],
                    recommendation=issue["recommendation"],
                    severity=ConstraintSeverity.CRITICAL if "allergen" in issue["message"].lower() else ConstraintSeverity.ERROR
                ))
        
        return violations
    
    def _check_dietary_compatibility(self, request: Request, batch: InventoryBatch) -> List[Dict[str, Any]]:
        """Check dietary compatibility between request and inventory."""
        issues = []
        
        req_dietary = request.dietary_restrictions
        batch_dietary = batch.dietary_metadata
        
        # Check vegetarian requirement
        if req_dietary.vegetarian and not batch_dietary.vegetarian:
            issues.append({
                "message": f"Non-vegetarian item allocated to vegetarian request",
                "details": {
                    "request_id": request.request_id,
                    "batch_id": batch.batch_id,
                    "requirement": "vegetarian",
                    "item_vegetarian": batch_dietary.vegetarian
                },
                "recommendation": "Find vegetarian alternative"
            })
        
        # Check vegan requirement
        if req_dietary.vegan and not batch_dietary.vegan:
            issues.append({
                "message": f"Non-vegan item allocated to vegan request",
                "details": {
                    "request_id": request.request_id,
                    "batch_id": batch.batch_id,
                    "requirement": "vegan", 
                    "item_vegan": batch_dietary.vegan
                },
                "recommendation": "Find vegan alternative"
            })
        
        # Check allergen restrictions (CRITICAL)
        for allergen in req_dietary.allergens:
            if allergen in batch_dietary.allergens:
                issues.append({
                    "message": f"ALLERGEN VIOLATION: Item contains {allergen} which is restricted",
                    "details": {
                        "request_id": request.request_id,
                        "batch_id": batch.batch_id,
                        "allergen": allergen,
                        "item_allergens": batch_dietary.allergens,
                        "restricted_allergens": req_dietary.allergens
                    },
                    "recommendation": "IMMEDIATELY remove this allocation - safety risk"
                })
        
        return issues