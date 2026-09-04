"""
Deterministic tools for inventory management operations.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

from .base import DeterministicTool, ToolResult, ValidationResult, SafetyAssessment, SafetyLevel
from ..models import InventoryBatch, ResourceType, InventoryStatus


class InventoryQueryTool(DeterministicTool):
    """Base class for inventory query tools."""
    
    def __init__(self, tool_name: str):
        super().__init__(tool_name)
        # In production, this would use the actual DynamoDB connection
        self.table_name = "neighbornet_inventory"


def get_current_inventory(
    resource_type: Optional[ResourceType] = None,
    location_id: Optional[str] = None,
    status: Optional[InventoryStatus] = None
) -> ToolResult:
    """
    Get current inventory with optional filtering.
    
    Args:
        resource_type: Filter by resource type
        location_id: Filter by location
        status: Filter by inventory status
        
    Returns:
        ToolResult with list of InventoryBatch objects
    """
    tool = InventoryQueryTool("get_current_inventory")
    return tool.execute(resource_type=resource_type, location_id=location_id, status=status)


class GetCurrentInventoryTool(InventoryQueryTool):
    """Tool to get current inventory."""
    
    def __init__(self):
        super().__init__("get_current_inventory")
    
    def _execute_internal(self, resource_type=None, location_id=None, status=None) -> ToolResult:
        """Get current inventory from DynamoDB."""
        try:
            # For demo purposes, we'll return mock data
            # In production, this would query DynamoDB
            
            inventory_items = self._mock_inventory_query(resource_type, location_id, status)
            
            metadata = {
                "total_items": len(inventory_items),
                "query_filters": {
                    "resource_type": resource_type.value if resource_type else None,
                    "location_id": location_id,
                    "status": status.value if status else None
                }
            }
            
            return ToolResult.success_result(inventory_items, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to query inventory: {str(e)}")
    
    def _mock_inventory_query(self, resource_type, location_id, status) -> List[Dict[str, Any]]:
        """Mock inventory query for demo."""
        # This would be replaced with actual DynamoDB query
        from ..services.seed_data import generate_seed_data
        
        seed_data = generate_seed_data()
        inventory_items = []
        
        for batch in seed_data["inventory"]:
            # Apply filters
            if resource_type and batch.resource_type != resource_type:
                continue
            if location_id and batch.location_id != location_id:
                continue
            if status and batch.status != status:
                continue
            
            inventory_items.append(batch.to_dynamodb())
        
        return inventory_items


def get_available_inventory(
    resource_type: Optional[ResourceType] = None,
    min_quantity: int = 1,
    exclude_expiring_hours: int = 6
) -> ToolResult:
    """
    Get available inventory that can be allocated.
    
    Args:
        resource_type: Filter by resource type
        min_quantity: Minimum available quantity
        exclude_expiring_hours: Exclude items expiring within this many hours
        
    Returns:
        ToolResult with available inventory items
    """
    tool = GetAvailableInventoryTool()
    return tool.execute(
        resource_type=resource_type,
        min_quantity=min_quantity,
        exclude_expiring_hours=exclude_expiring_hours
    )


class GetAvailableInventoryTool(InventoryQueryTool):
    """Tool to get available inventory for allocation."""
    
    def __init__(self):
        super().__init__("get_available_inventory")
    
    def _validate_inputs(self, resource_type=None, min_quantity=1, exclude_expiring_hours=6) -> ToolResult:
        """Validate input parameters."""
        if min_quantity < 0:
            return ToolResult.error_result("min_quantity cannot be negative")
        
        if exclude_expiring_hours < 0:
            return ToolResult.error_result("exclude_expiring_hours cannot be negative")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, resource_type=None, min_quantity=1, exclude_expiring_hours=6) -> ToolResult:
        """Get available inventory that can be safely allocated."""
        try:
            # Get all inventory
            all_inventory_result = get_current_inventory()
            if not all_inventory_result.success:
                return all_inventory_result
            
            available_items = []
            cutoff_time = datetime.now() + timedelta(hours=exclude_expiring_hours)
            
            for item_data in all_inventory_result.data:
                # Recreate InventoryBatch from dict
                item = InventoryBatch.from_dynamodb(item_data)
                
                # Check availability criteria
                if not self._is_available_for_allocation(item, min_quantity, cutoff_time):
                    continue
                
                # Apply resource type filter
                if resource_type and item.resource_type != resource_type:
                    continue
                
                available_items.append(item_data)
            
            metadata = {
                "total_available": len(available_items),
                "filters_applied": {
                    "resource_type": resource_type.value if resource_type else None,
                    "min_quantity": min_quantity,
                    "exclude_expiring_before": cutoff_time.isoformat()
                },
                "total_quantity": sum(item["quantity_available"] - item.get("quantity_allocated", 0) 
                                    for item in available_items)
            }
            
            return ToolResult.success_result(available_items, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to get available inventory: {str(e)}")
    
    def _is_available_for_allocation(self, item: InventoryBatch, min_quantity: int, cutoff_time: datetime) -> bool:
        """Check if item is available for allocation."""
        # Must be available status
        if item.status != InventoryStatus.AVAILABLE:
            return False
        
        # Must have sufficient unallocated quantity
        if item.quantity_unallocated < min_quantity:
            return False
        
        # Must not be expired
        if item.is_expired:
            return False
        
        # Must not expire within the exclusion window
        if item.expiry_datetime and item.expiry_datetime <= cutoff_time:
            return False
        
        return True


def get_expiring_inventory(hours_ahead: int = 24, include_expired: bool = False) -> ToolResult:
    """
    Get inventory items that are expiring or expired.
    
    Args:
        hours_ahead: Look ahead this many hours for expiring items
        include_expired: Include already expired items
        
    Returns:
        ToolResult with expiring inventory items
    """
    tool = GetExpiringInventoryTool()
    return tool.execute(hours_ahead=hours_ahead, include_expired=include_expired)


class GetExpiringInventoryTool(InventoryQueryTool):
    """Tool to get expiring inventory."""
    
    def __init__(self):
        super().__init__("get_expiring_inventory")
    
    def _validate_inputs(self, hours_ahead=24, include_expired=False) -> ToolResult:
        """Validate inputs."""
        if hours_ahead < 0:
            return ToolResult.error_result("hours_ahead cannot be negative")
        return ToolResult.success_result()
    
    def _execute_internal(self, hours_ahead=24, include_expired=False) -> ToolResult:
        """Get expiring inventory items."""
        try:
            # Get all inventory
            all_inventory_result = get_current_inventory(status=InventoryStatus.AVAILABLE)
            if not all_inventory_result.success:
                return all_inventory_result
            
            now = datetime.now()
            future_cutoff = now + timedelta(hours=hours_ahead)
            expiring_items = []
            
            for item_data in all_inventory_result.data:
                item = InventoryBatch.from_dynamodb(item_data)
                
                if not item.expiry_datetime:
                    continue  # No expiry date
                
                is_expired = item.expiry_datetime <= now
                is_expiring = now < item.expiry_datetime <= future_cutoff
                
                if is_expired and include_expired:
                    item_data["expiry_status"] = "expired"
                    expiring_items.append(item_data)
                elif is_expiring:
                    item_data["expiry_status"] = "expiring"
                    expiring_items.append(item_data)
            
            # Sort by expiry time (most urgent first)
            expiring_items.sort(key=lambda x: x.get("expiry_datetime", ""))
            
            metadata = {
                "total_expiring": len(expiring_items),
                "search_window_hours": hours_ahead,
                "include_expired": include_expired,
                "search_cutoff": future_cutoff.isoformat()
            }
            
            return ToolResult.success_result(expiring_items, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to get expiring inventory: {str(e)}")


def validate_inventory_allocation(
    batch_id: str,
    quantity_to_allocate: int,
    request_requirements: Dict[str, Any] = None
) -> ValidationResult:
    """
    Validate if an inventory allocation is safe and feasible.
    
    Args:
        batch_id: ID of inventory batch to allocate
        quantity_to_allocate: Amount to allocate
        request_requirements: Requirements from the request (dietary, etc.)
        
    Returns:
        ValidationResult indicating if allocation is valid
    """
    tool = ValidateInventoryAllocationTool()
    result = tool.execute(
        batch_id=batch_id,
        quantity_to_allocate=quantity_to_allocate,
        request_requirements=request_requirements or {}
    )
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Validation failed"])


class ValidateInventoryAllocationTool(InventoryQueryTool):
    """Tool to validate inventory allocation."""
    
    def __init__(self):
        super().__init__("validate_inventory_allocation")
    
    def _validate_inputs(self, batch_id=None, quantity_to_allocate=0, request_requirements=None) -> ToolResult:
        """Validate inputs."""
        if not batch_id:
            return ToolResult.error_result("batch_id is required")
        
        if quantity_to_allocate <= 0:
            return ToolResult.error_result("quantity_to_allocate must be positive")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, batch_id, quantity_to_allocate, request_requirements) -> ToolResult:
        """Validate the allocation."""
        try:
            # Get the specific inventory batch
            inventory_result = get_current_inventory()
            if not inventory_result.success:
                return ToolResult.error_result("Failed to query inventory")
            
            # Find the batch
            batch_data = None
            for item_data in inventory_result.data:
                if item_data.get("batch_id") == batch_id:
                    batch_data = item_data
                    break
            
            if not batch_data:
                return ToolResult.error_result(f"Inventory batch {batch_id} not found")
            
            batch = InventoryBatch.from_dynamodb(batch_data)
            validation = ValidationResult.valid_result()
            
            # Check basic allocation feasibility
            if not batch.can_allocate(quantity_to_allocate):
                validation.add_issue(f"Cannot allocate {quantity_to_allocate} units (available: {batch.quantity_unallocated})", 1.0)
            
            # Check expiry
            if batch.is_expired:
                validation.add_issue("Inventory batch has expired", 1.0)
            
            # Check if expiring very soon (within 2 hours)
            if batch.expires_soon(hours=2):
                validation.add_issue("Inventory expires within 2 hours", 0.3)
            
            # Check dietary requirements if provided
            if request_requirements:
                dietary_issues = self._validate_dietary_requirements(batch, request_requirements)
                for issue in dietary_issues:
                    validation.add_issue(issue, 0.5)
            
            # Check food safety
            safety_issues = self._validate_food_safety(batch)
            for issue in safety_issues:
                validation.add_issue(issue, 0.7)
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Allocation validation failed: {str(e)}")
    
    def _validate_dietary_requirements(self, batch: InventoryBatch, requirements: Dict[str, Any]) -> List[str]:
        """Validate dietary requirements."""
        issues = []
        
        dietary_metadata = batch.dietary_metadata
        
        # Check vegetarian requirement
        if requirements.get("vegetarian", False) and not dietary_metadata.vegetarian:
            issues.append("Item is not vegetarian but vegetarian required")
        
        # Check vegan requirement
        if requirements.get("vegan", False) and not dietary_metadata.vegan:
            issues.append("Item is not vegan but vegan required")
        
        # Check gluten-free requirement
        if requirements.get("gluten_free", False) and not dietary_metadata.gluten_free:
            issues.append("Item is not gluten-free but gluten-free required")
        
        # Check allergen restrictions
        restricted_allergens = requirements.get("allergen_restrictions", [])
        for allergen in restricted_allergens:
            if allergen in dietary_metadata.allergens:
                issues.append(f"Item contains restricted allergen: {allergen}")
        
        return issues
    
    def _validate_food_safety(self, batch: InventoryBatch) -> List[str]:
        """Validate food safety requirements."""
        issues = []
        
        # Check if quality checked
        if not batch.quality_checked:
            issues.append("Item has not been quality checked")
        
        # Check temperature requirements for prepared meals
        if batch.resource_type == ResourceType.PREPARED_MEAL:
            if batch.temperature_requirements != "refrigerated":
                issues.append("Prepared meal should be refrigerated")
        
        # Check for damage
        if batch.status == InventoryStatus.DAMAGED:
            issues.append("Item is marked as damaged")
        
        return issues


# Create singleton instances for easy access
_get_current_inventory_tool = GetCurrentInventoryTool()
_get_available_inventory_tool = GetAvailableInventoryTool() 
_get_expiring_inventory_tool = GetExpiringInventoryTool()
_validate_inventory_allocation_tool = ValidateInventoryAllocationTool()

# Expose functions that use the singleton tools
get_current_inventory = _get_current_inventory_tool.execute
get_available_inventory = _get_available_inventory_tool.execute
get_expiring_inventory = _get_expiring_inventory_tool.execute
def validate_inventory_allocation(
    batch_id: str,
    quantity_to_allocate: int,
    request_requirements: Dict[str, Any] = None,
) -> ValidationResult:
    """Validate inventory allocation and return validation details."""

    result = _validate_inventory_allocation_tool.execute(
        batch_id=batch_id,
        quantity_to_allocate=quantity_to_allocate,
        request_requirements=request_requirements or {},
    )
    if result.success:
        return result.data
    return ValidationResult.invalid_result([result.error or "Validation failed"])
