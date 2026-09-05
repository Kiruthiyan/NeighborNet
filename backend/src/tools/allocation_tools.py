"""
Deterministic tools for allocation management operations.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional

from .base import DeterministicTool, ToolResult, ValidationResult, SafetyAssessment, SafetyLevel
from ..models import Allocation, AssignmentStatus, ResourceType
from .inventory_tools import get_available_inventory, validate_inventory_allocation
from .request_tools import get_active_requests, validate_request_fulfillment


class AllocationTool(DeterministicTool):
    """Base class for allocation tools."""
    
    def __init__(self, tool_name: str):
        super().__init__(tool_name)
        self.table_name = "neighbornet_allocations"


def create_allocation(
    request_id: str,
    batch_id: str,
    quantity: int,
    priority_score: float = 0.5
) -> ToolResult:
    """
    Create a new resource allocation.
    
    Args:
        request_id: ID of request being fulfilled
        batch_id: ID of inventory batch being allocated
        quantity: Amount to allocate
        priority_score: Priority score for this allocation
        
    Returns:
        ToolResult with created allocation
    """
    tool = CreateAllocationTool()
    return tool.execute(
        request_id=request_id,
        batch_id=batch_id,
        quantity=quantity,
        priority_score=priority_score
    )


class CreateAllocationTool(AllocationTool):
    """Tool to create allocations."""
    
    def __init__(self):
        super().__init__("create_allocation")
    
    def _validate_inputs(self, request_id=None, batch_id=None, quantity=0, priority_score=0.5) -> ToolResult:
        """Validate inputs."""
        if not request_id:
            return ToolResult.error_result("request_id is required")
        
        if not batch_id:
            return ToolResult.error_result("batch_id is required")
        
        if quantity <= 0:
            return ToolResult.error_result("quantity must be positive")
        
        if not 0 <= priority_score <= 1:
            return ToolResult.error_result("priority_score must be between 0 and 1")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, request_id, batch_id, quantity, priority_score) -> ToolResult:
        """Create the allocation."""
        try:
            # Validate the allocation is feasible
            validation = validate_inventory_allocation(batch_id, quantity)
            if not validation.valid:
                return ToolResult.error_result(f"Allocation validation failed: {'; '.join(validation.issues)}")
            
            # Create allocation object
            allocation = Allocation(
                request_id=request_id,
                batch_id=batch_id,
                quantity_allocated=quantity,
                priority_score=priority_score,
                status=AssignmentStatus.PENDING
            )
            
            # In production, this would save to DynamoDB
            allocation_data = allocation.to_dynamodb()
            
            metadata = {
                "allocation_id": allocation.allocation_id,
                "validation_score": validation.score,
                "created_at": allocation.allocated_datetime.isoformat()
            }
            
            return ToolResult.success_result(allocation_data, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to create allocation: {str(e)}")


def validate_allocation(allocation_data: Dict[str, Any]) -> ValidationResult:
    """
    Validate an allocation for safety and feasibility.
    
    Args:
        allocation_data: Allocation data to validate
        
    Returns:
        ValidationResult indicating if allocation is valid
    """
    tool = ValidateAllocationTool()
    result = tool.execute(allocation_data=allocation_data)
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Validation failed"])


class ValidateAllocationTool(AllocationTool):
    """Tool to validate allocations."""
    
    def __init__(self):
        super().__init__("validate_allocation")
    
    def _validate_inputs(self, allocation_data=None) -> ToolResult:
        """Validate inputs."""
        if not allocation_data:
            return ToolResult.error_result("allocation_data is required")
        
        required_fields = ["request_id", "batch_id", "quantity_allocated"]
        for field in required_fields:
            if field not in allocation_data:
                return ToolResult.error_result(f"Missing required field: {field}")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, allocation_data) -> ToolResult:
        """Validate the allocation."""
        try:
            allocation = Allocation.from_dynamodb(allocation_data)
            validation = ValidationResult.valid_result()
            
            # Validate inventory allocation
            inventory_validation = validate_inventory_allocation(
                allocation.batch_id,
                allocation.quantity_allocated
            )
            
            if not inventory_validation.valid:
                for issue in inventory_validation.issues:
                    validation.add_issue(f"Inventory issue: {issue}", 0.8)
            
            # Validate request fulfillment
            request_validation = validate_request_fulfillment(
                allocation.request_id,
                [allocation_data]
            )
            
            if not request_validation.valid:
                for issue in request_validation.issues:
                    validation.add_issue(f"Request issue: {issue}", 0.6)
            
            # Check allocation timing
            timing_issues = self._validate_allocation_timing(allocation)
            for issue in timing_issues:
                validation.add_issue(issue, 0.4)
            
            # Update validation score based on priority
            if allocation.priority_score > 0.8:
                validation.score = min(1.0, validation.score + 0.1)  # High priority bonus
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Allocation validation failed: {str(e)}")
    
    def _validate_allocation_timing(self, allocation: Allocation) -> List[str]:
        """Validate allocation timing."""
        issues = []
        
        # Check if allocation is too old
        age = (datetime.now() - allocation.allocated_datetime).total_seconds() / 3600
        if age > 24:
            issues.append(f"Allocation is {age:.1f} hours old")
        
        # Check expected delivery time
        if allocation.expected_delivery:
            if allocation.expected_delivery < datetime.now():
                issues.append("Expected delivery time has passed")
        
        return issues


def get_allocation_conflicts(
    proposed_allocations: List[Dict[str, Any]]
) -> ToolResult:
    """
    Check for conflicts between proposed allocations.
    
    Args:
        proposed_allocations: List of allocation proposals
        
    Returns:
        ToolResult with conflict analysis
    """
    tool = GetAllocationConflictsTool()
    return tool.execute(proposed_allocations=proposed_allocations)


class GetAllocationConflictsTool(AllocationTool):
    """Tool to detect allocation conflicts."""
    
    def __init__(self):
        super().__init__("get_allocation_conflicts")
    
    def _validate_inputs(self, proposed_allocations=None) -> ToolResult:
        """Validate inputs."""
        if not proposed_allocations:
            return ToolResult.error_result("proposed_allocations is required")
        
        if not isinstance(proposed_allocations, list):
            return ToolResult.error_result("proposed_allocations must be a list")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, proposed_allocations) -> ToolResult:
        """Detect allocation conflicts."""
        try:
            conflicts = []
            batch_usage = {}
            
            # Analyze each allocation
            for i, allocation in enumerate(proposed_allocations):
                batch_id = allocation.get("batch_id")
                quantity = allocation.get("quantity_allocated", 0)
                
                if not batch_id:
                    conflicts.append({
                        "type": "missing_batch_id",
                        "allocation_index": i,
                        "description": "Allocation missing batch_id"
                    })
                    continue
                
                # Track batch usage
                if batch_id not in batch_usage:
                    batch_usage[batch_id] = {
                        "total_allocated": 0,
                        "allocations": []
                    }
                
                batch_usage[batch_id]["total_allocated"] += quantity
                batch_usage[batch_id]["allocations"].append({
                    "index": i,
                    "quantity": quantity,
                    "request_id": allocation.get("request_id")
                })
            
            # Check for over-allocation conflicts
            inventory_result = get_available_inventory()
            if inventory_result.success:
                available_inventory = {
                    item["batch_id"]: item for item in inventory_result.data
                }
                
                for batch_id, usage in batch_usage.items():
                    if batch_id in available_inventory:
                        available_qty = available_inventory[batch_id]["quantity_available"]
                        allocated_qty = available_inventory[batch_id].get("quantity_allocated", 0)
                        remaining = available_qty - allocated_qty
                        
                        if usage["total_allocated"] > remaining:
                            conflicts.append({
                                "type": "over_allocation",
                                "batch_id": batch_id,
                                "available": remaining,
                                "requested": usage["total_allocated"],
                                "affected_allocations": usage["allocations"],
                                "description": f"Batch {batch_id}: requesting {usage['total_allocated']} but only {remaining} available"
                            })
                    else:
                        conflicts.append({
                            "type": "batch_not_found",
                            "batch_id": batch_id,
                            "affected_allocations": usage["allocations"],
                            "description": f"Batch {batch_id} not found in available inventory"
                        })
            
            # Check for duplicate request fulfillment
            request_usage = {}
            for i, allocation in enumerate(proposed_allocations):
                request_id = allocation.get("request_id")
                quantity = allocation.get("quantity_allocated", 0)
                
                if request_id:
                    if request_id not in request_usage:
                        request_usage[request_id] = {
                            "total_quantity": 0,
                            "allocations": []
                        }
                    
                    request_usage[request_id]["total_quantity"] += quantity
                    request_usage[request_id]["allocations"].append(i)
            
            # Check if any request is over-fulfilled
            requests_result = get_active_requests()
            if requests_result.success:
                active_requests = {
                    req["request_id"]: req for req in requests_result.data
                }
                
                for request_id, usage in request_usage.items():
                    if request_id in active_requests:
                        req_data = active_requests[request_id]
                        needed = req_data["quantity_requested"] - req_data.get("quantity_fulfilled", 0)
                        
                        if usage["total_quantity"] > needed:
                            conflicts.append({
                                "type": "over_fulfillment",
                                "request_id": request_id,
                                "needed": needed,
                                "allocated": usage["total_quantity"],
                                "affected_allocations": usage["allocations"],
                                "description": f"Request {request_id}: allocating {usage['total_quantity']} but only need {needed}"
                            })
            
            metadata = {
                "total_conflicts": len(conflicts),
                "allocations_analyzed": len(proposed_allocations),
                "batches_involved": len(batch_usage),
                "requests_involved": len(request_usage)
            }
            
            return ToolResult.success_result(conflicts, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Conflict analysis failed: {str(e)}")


def calculate_allocation_score(
    allocation_data: Dict[str, Any],
    context: Dict[str, Any] = None
) -> ToolResult:
    """
    Calculate a quality score for an allocation.
    
    Args:
        allocation_data: Allocation to score
        context: Additional context for scoring
        
    Returns:
        ToolResult with allocation score and breakdown
    """
    tool = CalculateAllocationScoreTool()
    return tool.execute(allocation_data=allocation_data, context=context or {})


class CalculateAllocationScoreTool(AllocationTool):
    """Tool to calculate allocation scores."""
    
    def __init__(self):
        super().__init__("calculate_allocation_score")
    
    def _execute_internal(self, allocation_data, context) -> ToolResult:
        """Calculate allocation score."""
        try:
            allocation = Allocation.from_dynamodb(allocation_data)
            
            score_breakdown = {
                "base_score": allocation.priority_score,
                "timing_score": 0.0,
                "efficiency_score": 0.0,
                "safety_score": 0.0,
                "total_score": 0.0
            }
            
            # Timing score (based on urgency and expiry)
            timing_score = self._calculate_timing_score(allocation, context)
            score_breakdown["timing_score"] = timing_score
            
            # Efficiency score (quantity utilization, logistics)
            efficiency_score = self._calculate_efficiency_score(allocation, context)
            score_breakdown["efficiency_score"] = efficiency_score
            
            # Safety score (food safety, dietary compliance)
            safety_score = self._calculate_safety_score(allocation, context)
            score_breakdown["safety_score"] = safety_score
            
            # Calculate total weighted score
            total_score = (
                score_breakdown["base_score"] * 0.3 +
                timing_score * 0.3 +
                efficiency_score * 0.2 +
                safety_score * 0.2
            )
            score_breakdown["total_score"] = min(1.0, max(0.0, total_score))
            
            metadata = {
                "allocation_id": allocation.allocation_id,
                "score_components": score_breakdown
            }
            
            return ToolResult.success_result(score_breakdown, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Score calculation failed: {str(e)}")
    
    def _calculate_timing_score(self, allocation: Allocation, context: Dict[str, Any]) -> float:
        """Calculate timing component of score."""
        score = 0.5  # Base timing score
        
        # Check expected delivery vs requirement
        if allocation.expected_delivery and context.get("required_by"):
            try:
                required_by = datetime.fromisoformat(context["required_by"]) if isinstance(context["required_by"], str) else context["required_by"]
                time_diff = (required_by - allocation.expected_delivery).total_seconds() / 3600
                
                if time_diff > 0:  # Delivery before requirement
                    score += min(0.3, time_diff / 24 * 0.1)  # Bonus for early delivery
                else:  # Late delivery
                    score += max(-0.5, time_diff / 24 * 0.2)  # Penalty for late
            except:
                pass
        
        return max(0.0, min(1.0, score))
    
    def _calculate_efficiency_score(self, allocation: Allocation, context: Dict[str, Any]) -> float:
        """Calculate efficiency component of score."""
        score = 0.5  # Base efficiency score
        
        # Quantity efficiency (prefer larger allocations to reduce overhead)
        quantity = allocation.quantity_allocated
        if quantity >= 20:
            score += 0.2
        elif quantity >= 10:
            score += 0.1
        
        # Location efficiency (if context provides location data)
        if context.get("delivery_distance"):
            distance = context["delivery_distance"]
            if distance <= 5:  # Within 5 miles
                score += 0.2
            elif distance <= 15:
                score += 0.1
        
        return max(0.0, min(1.0, score))
    
    def _calculate_safety_score(self, allocation: Allocation, context: Dict[str, Any]) -> float:
        """Calculate safety component of score."""
        score = 0.8  # Start with high safety score
        
        # Validate the allocation
        validation = validate_allocation(allocation.to_dynamodb())
        if not validation.valid:
            # Reduce score based on validation issues
            issue_penalty = len(validation.issues) * 0.1
            score -= issue_penalty
        
        # Bonus for food handling certification if applicable
        if context.get("requires_food_handling") and context.get("volunteer_certified"):
            score += 0.1
        
        return max(0.0, min(1.0, score))


# Create singleton instances
_create_allocation_tool = CreateAllocationTool()
_validate_allocation_tool = ValidateAllocationTool()
_get_allocation_conflicts_tool = GetAllocationConflictsTool()
_calculate_allocation_score_tool = CalculateAllocationScoreTool()

# Expose the functions
create_allocation = _create_allocation_tool.execute
validate_allocation = _validate_allocation_tool.execute
get_allocation_conflicts = _get_allocation_conflicts_tool.execute
calculate_allocation_score = _calculate_allocation_score_tool.execute