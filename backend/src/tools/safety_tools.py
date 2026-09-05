"""
Deterministic tools for safety validation and risk assessment.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .base import DeterministicTool, ToolResult, ValidationResult, SafetyAssessment, SafetyLevel
from ..models import ResourceType, InventoryBatch, Request, Volunteer


class SafetyTool(DeterministicTool):
    """Base class for safety tools."""
    
    def __init__(self, tool_name: str):
        super().__init__(tool_name)


def validate_food_safety(
    inventory_batch_data: Dict[str, Any],
    delivery_context: Dict[str, Any] = None
) -> ValidationResult:
    """
    Validate food safety for an inventory batch.
    
    Args:
        inventory_batch_data: Inventory batch to validate
        delivery_context: Context about planned delivery
        
    Returns:
        ValidationResult with food safety validation
    """
    tool = ValidateFoodSafetyTool()
    result = tool.execute(
        inventory_batch_data=inventory_batch_data,
        delivery_context=delivery_context or {}
    )
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Food safety validation failed"])


class ValidateFoodSafetyTool(SafetyTool):
    """Tool to validate food safety."""
    
    def __init__(self):
        super().__init__("validate_food_safety")
    
    def _validate_inputs(self, inventory_batch_data=None, delivery_context=None) -> ToolResult:
        """Validate inputs."""
        if not inventory_batch_data:
            return ToolResult.error_result("inventory_batch_data is required")
        return ToolResult.success_result()
    
    def _execute_internal(self, inventory_batch_data, delivery_context) -> ToolResult:
        """Validate food safety."""
        try:
            batch = InventoryBatch.from_dynamodb(inventory_batch_data)
            validation = ValidationResult.valid_result()
            
            # Check expiry status
            expiry_issues = self._check_expiry_safety(batch, delivery_context)
            for issue in expiry_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check temperature requirements
            temp_issues = self._check_temperature_safety(batch, delivery_context)
            for issue in temp_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check quality status
            quality_issues = self._check_quality_safety(batch)
            for issue in quality_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check food handling requirements
            handling_issues = self._check_handling_requirements(batch, delivery_context)
            for issue in handling_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Food safety validation failed: {str(e)}")
    
    def _check_expiry_safety(self, batch: InventoryBatch, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check expiry-related safety issues."""
        issues = []
        
        if not batch.expiry_datetime:
            # No expiry date for perishable items is concerning
            if batch.resource_type in [ResourceType.PREPARED_MEAL, ResourceType.FRESH_PRODUCE, ResourceType.DAIRY]:
                issues.append({
                    "message": f"No expiry date for perishable {batch.resource_type.value}",
                    "severity": 0.6
                })
            return issues
        
        now = datetime.now()
        
        # Already expired
        if batch.is_expired:
            issues.append({
                "message": f"Item expired on {batch.expiry_datetime}",
                "severity": 1.0
            })
            return issues
        
        # Calculate delivery completion time
        delivery_time = context.get("planned_delivery_time", now + timedelta(hours=2))
        if isinstance(delivery_time, str):
            delivery_time = datetime.fromisoformat(delivery_time)
        
        # Will expire before delivery
        if batch.expiry_datetime <= delivery_time:
            hours_to_expiry = (batch.expiry_datetime - now).total_seconds() / 3600
            issues.append({
                "message": f"Item will expire in {hours_to_expiry:.1f} hours, before delivery completion",
                "severity": 0.8
            })
        
        # Expires very soon after delivery (unsafe buffer)
        elif batch.expiry_datetime <= delivery_time + timedelta(hours=2):
            issues.append({
                "message": "Item expires within 2 hours of delivery completion",
                "severity": 0.4
            })
        
        return issues
    
    def _check_temperature_safety(self, batch: InventoryBatch, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check temperature-related safety issues."""
        issues = []
        
        # Check if temperature requirements are specified
        if not batch.temperature_requirements:
            if batch.resource_type in [ResourceType.PREPARED_MEAL, ResourceType.DAIRY, ResourceType.FROZEN_FOOD]:
                issues.append({
                    "message": f"No temperature requirements specified for {batch.resource_type.value}",
                    "severity": 0.5
                })
        
        # Check cold chain for refrigerated items
        if batch.temperature_requirements == "refrigerated":
            delivery_duration = context.get("estimated_delivery_hours", 2)
            if delivery_duration > 4:
                issues.append({
                    "message": f"Refrigerated item will be in transit for {delivery_duration} hours (max recommended: 4)",
                    "severity": 0.6
                })
            elif delivery_duration > 2:
                issues.append({
                    "message": f"Refrigerated item will be in transit for {delivery_duration} hours",
                    "severity": 0.3
                })
        
        # Check frozen chain
        if batch.temperature_requirements == "frozen":
            if not context.get("volunteer_has_freezer_transport"):
                issues.append({
                    "message": "Frozen item requires specialized freezer transport",
                    "severity": 0.8
                })
        
        return issues
    
    def _check_quality_safety(self, batch: InventoryBatch) -> List[Dict[str, Any]]:
        """Check quality-related safety issues."""
        issues = []
        
        # Check quality inspection status
        if not batch.quality_checked:
            issues.append({
                "message": "Item has not been quality inspected",
                "severity": 0.7
            })
        
        # Check for damage
        if batch.status.value == "damaged":
            issues.append({
                "message": "Item is marked as damaged",
                "severity": 1.0
            })
        
        # Check quality notes for concerns
        if batch.quality_notes:
            concern_keywords = ["concern", "issue", "problem", "damaged", "questionable", "old"]
            if any(keyword in batch.quality_notes.lower() for keyword in concern_keywords):
                issues.append({
                    "message": f"Quality concern noted: {batch.quality_notes}",
                    "severity": 0.5
                })
        
        return issues
    
    def _check_handling_requirements(self, batch: InventoryBatch, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check food handling requirements."""
        issues = []
        
        # Check if food handling certification required
        if batch.resource_type == ResourceType.PREPARED_MEAL:
            volunteer_certified = context.get("volunteer_food_handling_certified", False)
            if not volunteer_certified:
                issues.append({
                    "message": "Prepared meal delivery should use food-handling certified volunteer",
                    "severity": 0.4
                })
        
        # Check storage location safety
        storage_location = batch.storage_location
        if storage_location and "floor" in storage_location.lower():
            issues.append({
                "message": "Item stored on floor (food safety concern)",
                "severity": 0.6
            })
        
        return issues


def check_dietary_compliance(
    request_requirements: Dict[str, Any],
    inventory_items: List[Dict[str, Any]]
) -> ValidationResult:
    """
    Check dietary compliance between request requirements and inventory items.
    
    Args:
        request_requirements: Dietary requirements from request
        inventory_items: Inventory items to check
        
    Returns:
        ValidationResult with compliance status
    """
    tool = CheckDietaryComplianceTool()
    result = tool.execute(
        request_requirements=request_requirements,
        inventory_items=inventory_items
    )
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Dietary compliance check failed"])


class CheckDietaryComplianceTool(SafetyTool):
    """Tool to check dietary compliance."""
    
    def __init__(self):
        super().__init__("check_dietary_compliance")
    
    def _validate_inputs(self, request_requirements=None, inventory_items=None) -> ToolResult:
        """Validate inputs."""
        if not request_requirements:
            return ToolResult.error_result("request_requirements is required")
        
        if not inventory_items:
            return ToolResult.error_result("inventory_items is required")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, request_requirements, inventory_items) -> ToolResult:
        """Check dietary compliance."""
        try:
            validation = ValidationResult.valid_result()
            
            # Extract dietary restrictions
            dietary_reqs = request_requirements.get("dietary_restrictions", {})
            
            for i, item_data in enumerate(inventory_items):
                batch = InventoryBatch.from_dynamodb(item_data)
                dietary_info = batch.dietary_metadata
                
                # Check each dietary requirement
                compliance_issues = self._check_item_compliance(dietary_reqs, dietary_info, i)
                for issue in compliance_issues:
                    validation.add_issue(issue["message"], issue["severity"])
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Dietary compliance check failed: {str(e)}")
    
    def _check_item_compliance(self, requirements: Dict[str, Any], item_dietary: Any, item_index: int) -> List[Dict[str, Any]]:
        """Check compliance for a single item."""
        issues = []
        
        # Vegetarian requirement
        if requirements.get("vegetarian", False) and not item_dietary.vegetarian:
            issues.append({
                "message": f"Item {item_index + 1}: Not vegetarian but vegetarian required",
                "severity": 0.8
            })
        
        # Vegan requirement
        if requirements.get("vegan", False) and not item_dietary.vegan:
            issues.append({
                "message": f"Item {item_index + 1}: Not vegan but vegan required",
                "severity": 0.8
            })
        
        # Gluten-free requirement
        if requirements.get("gluten_free", False) and not item_dietary.gluten_free:
            issues.append({
                "message": f"Item {item_index + 1}: Contains gluten but gluten-free required",
                "severity": 0.9
            })
        
        # Dairy-free requirement
        if requirements.get("dairy_free", False) and not item_dietary.dairy_free:
            issues.append({
                "message": f"Item {item_index + 1}: Contains dairy but dairy-free required",
                "severity": 0.8
            })
        
        # Allergen restrictions
        restricted_allergens = requirements.get("allergens", [])
        for allergen in restricted_allergens:
            if allergen in item_dietary.allergens:
                issues.append({
                    "message": f"Item {item_index + 1}: Contains restricted allergen '{allergen}'",
                    "severity": 1.0
                })
        
        return issues


def verify_delivery_constraints(
    assignment_data: Dict[str, Any],
    volunteer_data: Dict[str, Any],
    context: Dict[str, Any] = None
) -> ValidationResult:
    """
    Verify delivery constraints and feasibility.
    
    Args:
        assignment_data: Delivery assignment data
        volunteer_data: Volunteer data
        context: Additional context
        
    Returns:
        ValidationResult with constraint verification
    """
    tool = VerifyDeliveryConstraintsTool()
    result = tool.execute(
        assignment_data=assignment_data,
        volunteer_data=volunteer_data,
        context=context or {}
    )
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Delivery constraint verification failed"])


class VerifyDeliveryConstraintsTool(SafetyTool):
    """Tool to verify delivery constraints."""
    
    def __init__(self):
        super().__init__("verify_delivery_constraints")
    
    def _execute_internal(self, assignment_data, volunteer_data, context) -> ToolResult:
        """Verify delivery constraints."""
        try:
            validation = ValidationResult.valid_result()
            
            # Check capacity constraints
            capacity_issues = self._check_capacity_constraints(assignment_data, volunteer_data)
            for issue in capacity_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check time constraints
            time_issues = self._check_time_constraints(assignment_data, volunteer_data, context)
            for issue in time_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check distance constraints
            distance_issues = self._check_distance_constraints(assignment_data, volunteer_data)
            for issue in distance_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            # Check vehicle requirements
            vehicle_issues = self._check_vehicle_requirements(assignment_data, volunteer_data)
            for issue in vehicle_issues:
                validation.add_issue(issue["message"], issue["severity"])
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Delivery constraint verification failed: {str(e)}")
    
    def _check_capacity_constraints(self, assignment: Dict[str, Any], volunteer: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check capacity constraints."""
        issues = []
        
        total_weight = assignment.get("total_weight", 0)
        vol_capacity = volunteer.get("max_carry_capacity", 0)
        
        if vol_capacity > 0 and total_weight > vol_capacity:
            issues.append({
                "message": f"Assignment weight ({total_weight}) exceeds volunteer capacity ({vol_capacity})",
                "severity": 0.9
            })
        
        # Check item count vs capacity
        item_count = len(assignment.get("allocation_ids", []))
        if item_count > 10 and not volunteer.get("has_vehicle", False):
            issues.append({
                "message": f"High item count ({item_count}) without vehicle",
                "severity": 0.5
            })
        
        return issues
    
    def _check_time_constraints(self, assignment: Dict[str, Any], volunteer: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check time constraints.""" 
        issues = []
        
        # Check estimated duration
        estimated_duration = assignment.get("estimated_duration_hours", 2)
        if estimated_duration > 8:
            issues.append({
                "message": f"Assignment duration ({estimated_duration}h) exceeds recommended maximum (8h)",
                "severity": 0.6
            })
        
        # Check delivery window compliance
        delivery_window = context.get("delivery_window")
        if delivery_window:
            # This would check if proposed time fits within the window
            # Simplified for demo
            pass
        
        return issues
    
    def _check_distance_constraints(self, assignment: Dict[str, Any], volunteer: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check distance constraints."""
        issues = []
        
        total_distance = assignment.get("total_distance", 0)
        vol_max_distance = volunteer.get("max_travel_distance", 0)
        
        if vol_max_distance > 0 and total_distance > vol_max_distance:
            issues.append({
                "message": f"Total distance ({total_distance} miles) exceeds volunteer preference ({vol_max_distance} miles)",
                "severity": 0.4
            })
        
        # Check individual delivery distances
        delivery_locations = assignment.get("delivery_locations", [])
        if len(delivery_locations) > 5:
            issues.append({
                "message": f"High number of delivery locations ({len(delivery_locations)})",
                "severity": 0.3
            })
        
        return issues
    
    def _check_vehicle_requirements(self, assignment: Dict[str, Any], volunteer: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check vehicle requirements."""
        issues = []
        
        requires_vehicle = assignment.get("requires_vehicle", False)
        has_vehicle = volunteer.get("has_vehicle", False)
        
        if requires_vehicle and not has_vehicle:
            issues.append({
                "message": "Assignment requires vehicle but volunteer doesn't have one",
                "severity": 1.0
            })
        
        # Check vehicle type appropriateness
        vehicle_type = volunteer.get("vehicle_type")
        large_delivery = assignment.get("total_weight", 0) > 50
        
        if large_delivery and vehicle_type in ["bicycle", "motorcycle"]:
            issues.append({
                "message": f"Large delivery may not be suitable for {vehicle_type}",
                "severity": 0.5
            })
        
        return issues


def assess_risk_level(
    operation_data: Dict[str, Any],
    operation_type: str = "allocation"
) -> SafetyAssessment:
    """
    Assess the risk level of an operation.
    
    Args:
        operation_data: Data about the operation
        operation_type: Type of operation (allocation, assignment, etc.)
        
    Returns:
        SafetyAssessment with risk level and reasoning
    """
    tool = AssessRiskLevelTool()
    result = tool.execute(operation_data=operation_data, operation_type=operation_type)
    
    if result.success:
        return result.data
    else:
        return SafetyAssessment(
            level=SafetyLevel.RED,
            confidence=0.0,
            reasons=["Risk assessment failed"],
            recommendations=["Manual review required"]
        )


class AssessRiskLevelTool(SafetyTool):
    """Tool to assess risk levels."""
    
    def __init__(self):
        super().__init__("assess_risk_level")
    
    def _execute_internal(self, operation_data, operation_type) -> ToolResult:
        """Assess risk level."""
        try:
            assessment = SafetyAssessment(
                level=SafetyLevel.GREEN,
                confidence=1.0,
                reasons=[],
                recommendations=[]
            )
            
            # Assess based on operation type
            if operation_type == "allocation":
                self._assess_allocation_risk(operation_data, assessment)
            elif operation_type == "assignment":
                self._assess_assignment_risk(operation_data, assessment)
            else:
                self._assess_general_risk(operation_data, assessment)
            
            # Adjust confidence based on data completeness
            data_completeness = self._calculate_data_completeness(operation_data)
            assessment.confidence *= data_completeness
            
            # Lower confidence should increase caution
            if assessment.confidence < 0.8:
                if assessment.level == SafetyLevel.GREEN:
                    assessment.level = SafetyLevel.AMBER
                    assessment.reasons.append("Low confidence due to incomplete data")
            
            return ToolResult.success_result(assessment)
            
        except Exception as e:
            return ToolResult.error_result(f"Risk assessment failed: {str(e)}")
    
    def _assess_allocation_risk(self, data: Dict[str, Any], assessment: SafetyAssessment) -> None:
        """Assess risk for allocation operations."""
        # Check quantity size
        quantity = data.get("quantity_allocated", 0)
        if quantity > 100:
            assessment.level = SafetyLevel.AMBER
            assessment.reasons.append("Large quantity allocation")
            assessment.recommendations.append("Verify availability and need")
        
        # Check expiry timing
        expiry = data.get("expiry_datetime")
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(expiry) if isinstance(expiry, str) else expiry
                hours_to_expiry = (expiry_dt - datetime.now()).total_seconds() / 3600
                
                if hours_to_expiry < 2:
                    assessment.level = SafetyLevel.RED
                    assessment.reasons.append("Item expires within 2 hours")
                    assessment.recommendations.append("Immediate action required or reject allocation")
                elif hours_to_expiry < 6:
                    assessment.level = max(assessment.level, SafetyLevel.AMBER)
                    assessment.reasons.append("Item expires soon")
                    assessment.recommendations.append("Prioritize for quick delivery")
            except:
                assessment.confidence *= 0.8
                assessment.reasons.append("Unable to parse expiry date")
    
    def _assess_assignment_risk(self, data: Dict[str, Any], assessment: SafetyAssessment) -> None:
        """Assess risk for assignment operations."""
        # Check volunteer experience
        volunteer_data = data.get("volunteer", {})
        total_deliveries = volunteer_data.get("total_deliveries", 0)
        success_rate = volunteer_data.get("success_rate", 1.0)
        
        if total_deliveries < 5:
            assessment.level = max(assessment.level, SafetyLevel.AMBER)
            assessment.reasons.append("Volunteer has limited experience")
            assessment.recommendations.append("Provide additional support or supervision")
        
        if success_rate < 0.8:
            assessment.level = SafetyLevel.AMBER
            assessment.reasons.append(f"Volunteer has low success rate ({success_rate:.1%})")
            assessment.recommendations.append("Consider alternative volunteer or additional support")
        
        # Check delivery complexity
        location_count = len(data.get("delivery_locations", []))
        if location_count > 5:
            assessment.level = max(assessment.level, SafetyLevel.AMBER)
            assessment.reasons.append(f"Complex delivery with {location_count} locations")
            assessment.recommendations.append("Consider splitting into multiple assignments")
        
        # Check time pressure
        time_remaining = data.get("hours_until_required", 24)
        if time_remaining < 2:
            assessment.level = SafetyLevel.RED
            assessment.reasons.append("Urgent delivery required within 2 hours")
            assessment.recommendations.append("Immediate coordinator oversight required")
        elif time_remaining < 6:
            assessment.level = max(assessment.level, SafetyLevel.AMBER)
            assessment.reasons.append("Time-sensitive delivery")
    
    def _assess_general_risk(self, data: Dict[str, Any], assessment: SafetyAssessment) -> None:
        """Assess general operational risks."""
        # Check for high-value operations
        recipient_count = data.get("recipient_count", 0)
        if recipient_count > 100:
            assessment.level = max(assessment.level, SafetyLevel.AMBER)
            assessment.reasons.append(f"High-impact operation affecting {recipient_count} recipients")
            assessment.recommendations.append("Ensure backup plans are available")
        
        # Check for special requirements
        special_reqs = data.get("special_requirements", [])
        if special_reqs:
            assessment.level = max(assessment.level, SafetyLevel.AMBER)
            assessment.reasons.append("Operation has special requirements")
            assessment.recommendations.append("Verify all requirements can be met")
    
    def _calculate_data_completeness(self, data: Dict[str, Any]) -> float:
        """Calculate data completeness score."""
        required_fields = ["id", "type", "timestamp"]
        optional_fields = ["description", "priority", "context"]
        
        present_required = sum(1 for field in required_fields if field in data)
        present_optional = sum(1 for field in optional_fields if field in data)
        
        completeness = (present_required / len(required_fields)) * 0.8 + (present_optional / len(optional_fields)) * 0.2
        return max(0.5, completeness)  # Minimum 50% confidence


# Create singleton instances
_validate_food_safety_tool = ValidateFoodSafetyTool()
_check_dietary_compliance_tool = CheckDietaryComplianceTool()
_verify_delivery_constraints_tool = VerifyDeliveryConstraintsTool()
_assess_risk_level_tool = AssessRiskLevelTool()

# Expose the functions
def validate_food_safety(
    inventory_batch_data: Dict[str, Any],
    delivery_context: Dict[str, Any] = None,
) -> ToolResult:
    """Validate food safety with default delivery context."""

    return _validate_food_safety_tool.execute(
        inventory_batch_data=inventory_batch_data,
        delivery_context=delivery_context or {},
    )

check_dietary_compliance = _check_dietary_compliance_tool.execute
verify_delivery_constraints = _verify_delivery_constraints_tool.execute
assess_risk_level = _assess_risk_level_tool.execute
