"""
Deterministic tools for request management operations.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .base import DeterministicTool, ToolResult, ValidationResult
from ..models import Request, RequestStatus, UrgencyLevel, ResourceType


class RequestQueryTool(DeterministicTool):
    """Base class for request query tools."""
    
    def __init__(self, tool_name: str):
        super().__init__(tool_name)
        self.table_name = "neighbornet_requests"


def get_active_requests(
    status: Optional[RequestStatus] = None,
    urgency_level: Optional[UrgencyLevel] = None,
    resource_type: Optional[ResourceType] = None
) -> ToolResult:
    """
    Get active requests with optional filtering.
    
    Args:
        status: Filter by request status
        urgency_level: Filter by urgency level
        resource_type: Filter by resource type
        
    Returns:
        ToolResult with list of active Request objects
    """
    tool = GetActiveRequestsTool()
    return tool.execute(status=status, urgency_level=urgency_level, resource_type=resource_type)


class GetActiveRequestsTool(RequestQueryTool):
    """Tool to get active requests."""
    
    def __init__(self):
        super().__init__("get_active_requests")
    
    def _execute_internal(self, status=None, urgency_level=None, resource_type=None) -> ToolResult:
        """Get active requests from database."""
        try:
            requests = self._mock_request_query(status, urgency_level, resource_type)
            
            # Filter for active requests if no specific status provided
            if status is None:
                active_statuses = [RequestStatus.PENDING, RequestStatus.PARTIALLY_FULFILLED]
                requests = [r for r in requests if r["status"] in [s.value for s in active_statuses]]
            
            # Sort by urgency and required_by time
            requests.sort(key=lambda r: (
                self._urgency_sort_key(r.get("urgency_level", "low")),
                r.get("required_by", "")
            ))
            
            metadata = {
                "total_requests": len(requests),
                "query_filters": {
                    "status": status.value if status else None,
                    "urgency_level": urgency_level.value if urgency_level else None,
                    "resource_type": resource_type.value if resource_type else None
                }
            }
            
            return ToolResult.success_result(requests, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to query requests: {str(e)}")
    
    def _mock_request_query(self, status, urgency_level, resource_type) -> List[Dict[str, Any]]:
        """Mock request query for demo."""
        from ..services.seed_data import generate_seed_data
        
        seed_data = generate_seed_data()
        request_items = []
        
        for request in seed_data["requests"]:
            # Apply filters
            if status and request.status != status:
                continue
            if urgency_level and request.urgency_level != urgency_level:
                continue
            if resource_type and request.resource_type != resource_type:
                continue
            
            request_items.append(request.to_dynamodb())
        
        return request_items
    
    def _urgency_sort_key(self, urgency: str) -> int:
        """Convert urgency to numeric sort key (higher number = more urgent)."""
        urgency_map = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        return urgency_map.get(urgency, 1)


def get_urgent_requests(max_hours_remaining: int = 6) -> ToolResult:
    """
    Get urgent requests that need immediate attention.
    
    Args:
        max_hours_remaining: Consider requests urgent if due within this many hours
        
    Returns:
        ToolResult with urgent requests
    """
    tool = GetUrgentRequestsTool()
    return tool.execute(max_hours_remaining=max_hours_remaining)


class GetUrgentRequestsTool(RequestQueryTool):
    """Tool to get urgent requests."""
    
    def __init__(self):
        super().__init__("get_urgent_requests")
    
    def _validate_inputs(self, max_hours_remaining=6) -> ToolResult:
        """Validate inputs."""
        if max_hours_remaining < 0:
            return ToolResult.error_result("max_hours_remaining cannot be negative")
        return ToolResult.success_result()
    
    def _execute_internal(self, max_hours_remaining=6) -> ToolResult:
        """Get urgent requests."""
        try:
            # Get all active requests
            active_result = get_active_requests()
            if not active_result.success:
                return active_result
            
            now = datetime.now()
            urgent_cutoff = now + timedelta(hours=max_hours_remaining)
            urgent_requests = []
            
            for request_data in active_result.data:
                request = Request.from_dynamodb(request_data)
                
                # Check if urgent by priority
                is_high_priority = request.urgency_level in [UrgencyLevel.HIGH, UrgencyLevel.CRITICAL]
                
                # Check if urgent by time
                is_time_urgent = request.required_by <= urgent_cutoff
                
                # Check if overdue
                is_overdue = request.is_overdue
                
                if is_high_priority or is_time_urgent or is_overdue:
                    # Add urgency metadata
                    request_data["urgency_reasons"] = []
                    if is_high_priority:
                        request_data["urgency_reasons"].append("high_priority")
                    if is_time_urgent:
                        request_data["urgency_reasons"].append("time_urgent")
                    if is_overdue:
                        request_data["urgency_reasons"].append("overdue")
                    
                    # Calculate urgency score
                    urgency_score = self._calculate_urgency_score(request)
                    request_data["urgency_score"] = urgency_score
                    
                    urgent_requests.append(request_data)
            
            # Sort by urgency score (highest first)
            urgent_requests.sort(key=lambda r: r.get("urgency_score", 0), reverse=True)
            
            metadata = {
                "total_urgent": len(urgent_requests),
                "max_hours_remaining": max_hours_remaining,
                "urgent_cutoff": urgent_cutoff.isoformat()
            }
            
            return ToolResult.success_result(urgent_requests, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to get urgent requests: {str(e)}")
    
    def _calculate_urgency_score(self, request: Request) -> float:
        """Calculate urgency score (0.0 to 1.0)."""
        score = 0.0
        
        # Base score from urgency level
        urgency_scores = {
            UrgencyLevel.CRITICAL: 1.0,
            UrgencyLevel.HIGH: 0.8,
            UrgencyLevel.MEDIUM: 0.5,
            UrgencyLevel.LOW: 0.2
        }
        score += urgency_scores.get(request.urgency_level, 0.2)
        
        # Time pressure multiplier
        now = datetime.now()
        time_remaining = (request.required_by - now).total_seconds() / 3600  # hours
        
        if time_remaining <= 0:
            score += 0.5  # Overdue bonus
        elif time_remaining <= 2:
            score += 0.3  # Very urgent
        elif time_remaining <= 6:
            score += 0.2  # Somewhat urgent
        
        # Large quantity multiplier (more people affected)
        if request.recipient_count and request.recipient_count > 50:
            score += 0.1
        
        return min(1.0, score)


def get_overdue_requests() -> ToolResult:
    """
    Get requests that are past their required_by time.
    
    Returns:
        ToolResult with overdue requests
    """
    tool = GetOverdueRequestsTool()
    return tool.execute()


class GetOverdueRequestsTool(RequestQueryTool):
    """Tool to get overdue requests."""
    
    def __init__(self):
        super().__init__("get_overdue_requests")
    
    def _execute_internal(self) -> ToolResult:
        """Get overdue requests."""
        try:
            # Get all active requests
            active_result = get_active_requests()
            if not active_result.success:
                return active_result
            
            now = datetime.now()
            overdue_requests = []
            
            for request_data in active_result.data:
                request = Request.from_dynamodb(request_data)
                
                if request.is_overdue:
                    # Calculate how overdue
                    overdue_hours = (now - request.required_by).total_seconds() / 3600
                    request_data["overdue_hours"] = overdue_hours
                    
                    # Assess impact
                    impact_score = self._calculate_overdue_impact(request, overdue_hours)
                    request_data["impact_score"] = impact_score
                    
                    overdue_requests.append(request_data)
            
            # Sort by impact score (highest first)
            overdue_requests.sort(key=lambda r: r.get("impact_score", 0), reverse=True)
            
            metadata = {
                "total_overdue": len(overdue_requests),
                "query_time": now.isoformat()
            }
            
            return ToolResult.success_result(overdue_requests, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to get overdue requests: {str(e)}")
    
    def _calculate_overdue_impact(self, request: Request, overdue_hours: float) -> float:
        """Calculate impact score for overdue request."""
        impact = 0.0
        
        # Base impact from how overdue
        if overdue_hours > 24:
            impact += 1.0  # Very serious
        elif overdue_hours > 12:
            impact += 0.8
        elif overdue_hours > 6:
            impact += 0.6
        else:
            impact += 0.4
        
        # Multiply by urgency
        if request.urgency_level == UrgencyLevel.CRITICAL:
            impact *= 1.5
        elif request.urgency_level == UrgencyLevel.HIGH:
            impact *= 1.2
        
        # Factor in number of people affected
        if request.recipient_count:
            if request.recipient_count > 100:
                impact *= 1.3
            elif request.recipient_count > 50:
                impact *= 1.1
        
        return min(2.0, impact)  # Cap at 2.0


def validate_request_fulfillment(
    request_id: str,
    proposed_allocations: List[Dict[str, Any]]
) -> ValidationResult:
    """
    Validate if proposed allocations can fulfill a request.
    
    Args:
        request_id: ID of the request to validate
        proposed_allocations: List of allocation proposals
        
    Returns:
        ValidationResult indicating if fulfillment is valid
    """
    tool = ValidateRequestFulfillmentTool()
    result = tool.execute(request_id=request_id, proposed_allocations=proposed_allocations)
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Validation failed"])


class ValidateRequestFulfillmentTool(RequestQueryTool):
    """Tool to validate request fulfillment."""
    
    def __init__(self):
        super().__init__("validate_request_fulfillment")
    
    def _validate_inputs(self, request_id=None, proposed_allocations=None) -> ToolResult:
        """Validate inputs."""
        if not request_id:
            return ToolResult.error_result("request_id is required")
        
        if not proposed_allocations or len(proposed_allocations) == 0:
            return ToolResult.error_result("proposed_allocations cannot be empty")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, request_id, proposed_allocations) -> ToolResult:
        """Validate the fulfillment."""
        try:
            # Get the request
            active_result = get_active_requests()
            if not active_result.success:
                return ToolResult.error_result("Failed to query requests")
            
            # Find the specific request
            request_data = None
            for r_data in active_result.data:
                if r_data.get("request_id") == request_id:
                    request_data = r_data
                    break
            
            if not request_data:
                return ToolResult.error_result(f"Request {request_id} not found")
            
            request = Request.from_dynamodb(request_data)
            validation = ValidationResult.valid_result()
            
            # Calculate total proposed quantity
            total_proposed = sum(alloc.get("quantity", 0) for alloc in proposed_allocations)
            
            # Check if quantity matches
            remaining_needed = request.quantity_remaining
            if total_proposed < remaining_needed:
                validation.add_issue(f"Insufficient quantity: need {remaining_needed}, proposed {total_proposed}", 0.5)
            elif total_proposed > remaining_needed:
                validation.add_issue(f"Excess quantity: need {remaining_needed}, proposed {total_proposed}", 0.2)
            
            # Check resource type consistency
            for alloc in proposed_allocations:
                if alloc.get("resource_type") != request.resource_type.value:
                    validation.add_issue(f"Resource type mismatch: request needs {request.resource_type.value}, allocation provides {alloc.get('resource_type')}", 0.8)
            
            # Check timing constraints
            timing_issues = self._validate_timing_constraints(request, proposed_allocations)
            for issue in timing_issues:
                validation.add_issue(issue, 0.3)
            
            # Check dietary compliance
            dietary_issues = self._validate_dietary_compliance(request, proposed_allocations)
            for issue in dietary_issues:
                validation.add_issue(issue, 0.6)
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Fulfillment validation failed: {str(e)}")
    
    def _validate_timing_constraints(self, request: Request, allocations: List[Dict[str, Any]]) -> List[str]:
        """Validate timing constraints."""
        issues = []
        
        # Check if any allocations are from expired inventory
        now = datetime.now()
        for alloc in allocations:
            expiry = alloc.get("expiry_datetime")
            if expiry:
                try:
                    expiry_dt = datetime.fromisoformat(expiry) if isinstance(expiry, str) else expiry
                    if expiry_dt <= now:
                        issues.append(f"Allocation from expired inventory (expired {expiry})")
                except:
                    pass
        
        # Check delivery window compatibility
        if request.delivery_window:
            # This would check if proposed delivery time works with allocations
            # For now, just validate the window exists
            pass
        
        return issues
    
    def _validate_dietary_compliance(self, request: Request, allocations: List[Dict[str, Any]]) -> List[str]:
        """Validate dietary compliance."""
        issues = []
        
        restrictions = request.dietary_restrictions
        
        for alloc in allocations:
            dietary_info = alloc.get("dietary_metadata", {})
            
            # Check vegetarian
            if restrictions.vegetarian and not dietary_info.get("vegetarian", False):
                issues.append("Non-vegetarian item for vegetarian request")
            
            # Check vegan
            if restrictions.vegan and not dietary_info.get("vegan", False):
                issues.append("Non-vegan item for vegan request")
            
            # Check gluten-free
            if restrictions.gluten_free and not dietary_info.get("gluten_free", False):
                issues.append("Contains gluten for gluten-free request")
            
            # Check allergens
            item_allergens = dietary_info.get("allergens", [])
            restricted_allergens = restrictions.allergens
            for allergen in item_allergens:
                if allergen in restricted_allergens:
                    issues.append(f"Contains restricted allergen: {allergen}")
        
        return issues


# Create singleton instances
_get_active_requests_tool = GetActiveRequestsTool()
_get_urgent_requests_tool = GetUrgentRequestsTool()
_get_overdue_requests_tool = GetOverdueRequestsTool()
_validate_request_fulfillment_tool = ValidateRequestFulfillmentTool()

# Expose the functions
get_active_requests = _get_active_requests_tool.execute
get_urgent_requests = _get_urgent_requests_tool.execute
get_overdue_requests = _get_overdue_requests_tool.execute
def validate_request_fulfillment(
    request_id: str,
    proposed_allocations: List[Dict[str, Any]],
) -> ValidationResult:
    """Validate proposed allocations against request requirements."""

    result = _validate_request_fulfillment_tool.execute(
        request_id=request_id,
        proposed_allocations=proposed_allocations,
    )
    if result.success:
        return result.data
    return ValidationResult.invalid_result([result.error or "Validation failed"])
