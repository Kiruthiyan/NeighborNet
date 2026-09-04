"""Tests for deterministic tools."""

import pytest
from datetime import datetime, timedelta

from src.tools import (
    get_current_inventory,
    get_available_inventory,
    get_active_requests,
    get_urgent_requests,
    get_available_volunteers,
    create_allocation,
    validate_allocation,
    validate_food_safety,
    assess_risk_level
)
from src.models import ResourceType, UrgencyLevel


class TestInventoryTools:
    """Test inventory management tools."""
    
    def test_get_current_inventory(self):
        """Test getting current inventory."""
        result = get_current_inventory()
        
        assert result.success
        assert isinstance(result.data, list)
        assert len(result.data) > 0
        assert "total_items" in result.metadata
        
        # Test with filters
        result = get_current_inventory(resource_type=ResourceType.PREPARED_MEAL)
        assert result.success
        
    def test_get_available_inventory(self):
        """Test getting available inventory."""
        result = get_available_inventory(min_quantity=5)
        
        assert result.success
        assert isinstance(result.data, list)
        assert "total_available" in result.metadata
        assert "total_quantity" in result.metadata


class TestRequestTools:
    """Test request management tools."""
    
    def test_get_active_requests(self):
        """Test getting active requests."""
        result = get_active_requests()
        
        assert result.success
        assert isinstance(result.data, list)
        assert len(result.data) > 0
        assert "total_requests" in result.metadata
    
    def test_get_urgent_requests(self):
        """Test getting urgent requests."""
        result = get_urgent_requests(max_hours_remaining=12)
        
        assert result.success
        assert isinstance(result.data, list)
        assert "total_urgent" in result.metadata
        
        # Check that urgent requests have urgency scores
        if result.data:
            for request in result.data:
                assert "urgency_score" in request
                assert "urgency_reasons" in request


class TestVolunteerTools:
    """Test volunteer management tools."""
    
    def test_get_available_volunteers(self):
        """Test getting available volunteers."""
        result = get_available_volunteers()
        
        assert result.success
        assert isinstance(result.data, list)
        assert "total_available" in result.metadata
        
        # Test with filters
        result = get_available_volunteers(has_vehicle=True, min_capacity=20)
        assert result.success


class TestAllocationTools:
    """Test allocation management tools."""
    
    def test_create_allocation_workflow(self):
        """Test creating and validating an allocation."""
        # First get some test data
        inventory_result = get_available_inventory()
        requests_result = get_active_requests()
        
        assert inventory_result.success
        assert requests_result.success
        assert len(inventory_result.data) > 0
        assert len(requests_result.data) > 0
        
        # Get first available inventory and request
        inventory_item = inventory_result.data[0]
        request_item = requests_result.data[0]
        
        # Create allocation
        allocation_result = create_allocation(
            request_id=request_item["request_id"],
            batch_id=inventory_item["batch_id"],
            quantity=min(10, inventory_item["quantity_available"]),
            priority_score=0.8
        )
        
        assert allocation_result.success
        assert "allocation_id" in allocation_result.metadata
        
        # Validate the allocation
        allocation_data = allocation_result.data
        validation_result = validate_allocation(allocation_data)
        
        assert validation_result.success
        validation = validation_result.data
        assert hasattr(validation, 'valid')
        assert hasattr(validation, 'score')


class TestSafetyTools:
    """Test safety validation tools."""
    
    def test_validate_food_safety(self):
        """Test food safety validation."""
        # Get some inventory to test
        inventory_result = get_available_inventory()
        assert inventory_result.success
        assert len(inventory_result.data) > 0
        
        inventory_item = inventory_result.data[0]
        
        # Test food safety validation
        validation_result = validate_food_safety(
            inventory_batch_data=inventory_item,
            delivery_context={
                "planned_delivery_time": datetime.now() + timedelta(hours=2),
                "estimated_delivery_hours": 2
            }
        )
        
        assert validation_result.success
        validation = validation_result.data
        assert hasattr(validation, 'valid')
        assert hasattr(validation, 'issues')
    
    def test_assess_risk_level(self):
        """Test risk level assessment."""
        # Test allocation risk assessment
        allocation_data = {
            "quantity_allocated": 50,
            "expiry_datetime": (datetime.now() + timedelta(hours=12)).isoformat(),
            "recipient_count": 30
        }
        
        risk_result = assess_risk_level(allocation_data, "allocation")
        
        assert risk_result.success
        assessment = risk_result.data
        assert hasattr(assessment, 'level')
        assert hasattr(assessment, 'confidence')
        assert hasattr(assessment, 'reasons')
        assert hasattr(assessment, 'recommendations')
        
        # Test assignment risk assessment
        assignment_data = {
            "volunteer": {
                "total_deliveries": 15,
                "success_rate": 0.95
            },
            "delivery_locations": ["loc1", "loc2"],
            "hours_until_required": 8,
            "recipient_count": 25
        }
        
        risk_result = assess_risk_level(assignment_data, "assignment")
        assert risk_result.success


class TestToolIntegration:
    """Test integration between different tools."""
    
    def test_end_to_end_allocation_flow(self):
        """Test complete allocation flow."""
        # 1. Get urgent requests
        urgent_result = get_urgent_requests()
        assert urgent_result.success
        
        if not urgent_result.data:
            pytest.skip("No urgent requests in test data")
        
        urgent_request = urgent_result.data[0]
        resource_type = urgent_request.get("resource_type")
        
        # 2. Get matching available inventory
        inventory_result = get_available_inventory(
            resource_type=ResourceType(resource_type) if resource_type else None
        )
        assert inventory_result.success
        
        if not inventory_result.data:
            pytest.skip("No matching inventory available")
        
        inventory_item = inventory_result.data[0]
        
        # 3. Validate food safety
        safety_result = validate_food_safety(inventory_item)
        assert safety_result.success
        
        # 4. Create allocation if safe
        if safety_result.data.valid:
            allocation_result = create_allocation(
                request_id=urgent_request["request_id"],
                batch_id=inventory_item["batch_id"],
                quantity=min(urgent_request.get("quantity_remaining", 10), inventory_item["quantity_available"]),
                priority_score=0.9  # High priority for urgent request
            )
            assert allocation_result.success
            
            # 5. Validate the allocation
            validation_result = validate_allocation(allocation_result.data)
            assert validation_result.success
            
            # 6. Assess risk
            risk_result = assess_risk_level(allocation_result.data, "allocation")
            assert risk_result.success
            
            # The flow should complete successfully
            print(f"✓ End-to-end allocation flow completed successfully")
            print(f"  - Request: {urgent_request['request_id']}")
            print(f"  - Batch: {inventory_item['batch_id']}")
            print(f"  - Allocation: {allocation_result.metadata['allocation_id']}")
            print(f"  - Risk Level: {risk_result.data.level.value}")


if __name__ == "__main__":
    pytest.main([__file__])