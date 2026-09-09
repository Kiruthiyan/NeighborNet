"""Tests for NeighborNet data models."""

import pytest
from datetime import datetime, timedelta, time

from src.models import (
    User, AccountType, UserCapabilities,
    Organization, OrganizationType, Location, OperatingHours,
    InventoryBatch, ResourceType, InventoryStatus, DietaryMetadata,
    Request, RequestStatus, UrgencyLevel, DeliveryWindow,
    Volunteer, VolunteerStatus, VolunteerAvailability, AvailabilitySlot,
    Allocation, DeliveryAssignment, AssignmentStatus,
    Event, EventType, ProcessingStatus,
    Decision, DecisionType, RiskClassification,
    StrandsAuditLog, AuditActionType, AuditSeverity
)


class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self):
        """Test basic user creation."""
        user = User(
            account_type=AccountType.ADMIN,
            name="Test User",
            email="test@example.com"
        )

        assert user.user_id.startswith("user_")
        assert user.account_type == AccountType.ADMIN
        assert user.is_admin is True
        assert user.name == "Test User"
        assert user.is_active is True
        assert user.city == "Demo City"

    def test_user_dynamodb_conversion(self):
        """Test DynamoDB conversion."""
        user = User(
            capabilities=UserCapabilities(is_volunteer=True),
            name="Jane Doe",
            phone="555-1234"
        )

        dynamodb_item = user.to_dynamodb()

        assert "user_id" in dynamodb_item
        assert dynamodb_item["capabilities"]["is_volunteer"] is True
        assert dynamodb_item["name"] == "Jane Doe"
        assert "created_at" in dynamodb_item
        
        # Test round-trip conversion
        user_restored = User.from_dynamodb(dynamodb_item)
        assert user_restored.name == user.name
        assert user_restored.capabilities.is_volunteer == user.capabilities.is_volunteer


class TestOrganizationModel:
    """Test Organization model functionality."""
    
    def test_organization_creation(self):
        """Test organization creation."""
        location = Location(
            address="123 Main St",
            zip_code="12345",
            zone="central"
        )
        
        hours = OperatingHours(
            monday={"start": "09:00", "end": "17:00"},
            tuesday={"start": "09:00", "end": "17:00"}
        )
        
        org = Organization(
            name="Test Shelter",
            type=OrganizationType.SHELTER,
            location=location,
            operating_hours=hours
        )
        
        assert org.org_id.startswith("org_")
        assert org.type == OrganizationType.SHELTER
        assert org.location.zone == "central"
        assert org.is_active is True
    
    def test_operating_hours(self):
        """Test operating hours functionality."""
        hours = OperatingHours(
            monday={"start": "09:00", "end": "17:00"},
            tuesday={"start": "10:00", "end": "18:00"}
        )
        
        assert hours.is_open_at("monday", "12:00") is True
        assert hours.is_open_at("monday", "08:00") is False
        assert hours.is_open_at("monday", "18:00") is False
        assert hours.is_open_at("tuesday", "15:00") is True
        assert hours.is_open_at("wednesday", "12:00") is False


class TestInventoryModel:
    """Test Inventory model functionality."""
    
    def test_inventory_batch_creation(self):
        """Test inventory batch creation."""
        dietary_info = DietaryMetadata(
            vegetarian=True,
            gluten_free=True,
            calories_per_serving=350
        )
        
        batch = InventoryBatch(
            resource_type=ResourceType.PREPARED_MEAL,
            quantity_available=50,
            description="Vegetarian Pasta",
            donor_org_id="org_12345",
            location_id="org_12345",
            dietary_metadata=dietary_info,
            expiry_datetime=datetime.now() + timedelta(hours=24)
        )
        
        assert batch.batch_id.startswith("batch_")
        assert batch.resource_type == ResourceType.PREPARED_MEAL
        assert batch.quantity_unallocated == 50
        assert batch.can_allocate(25) is True
        assert batch.can_allocate(75) is False
        assert not batch.is_expired
    
    def test_inventory_allocation(self):
        """Test inventory allocation logic."""
        batch = InventoryBatch(
            resource_type=ResourceType.FRESH_PRODUCE,
            quantity_available=100,
            description="Fresh Apples",
            donor_org_id="org_123",
            location_id="org_123"
        )
        
        # Test allocation
        batch.quantity_allocated = 30
        assert batch.quantity_unallocated == 70
        assert batch.can_allocate(70) is True
        assert batch.can_allocate(71) is False
        
        # Test expiry
        batch.expiry_datetime = datetime.now() - timedelta(hours=1)
        assert batch.is_expired is True
        assert batch.can_allocate(10) is False


class TestRequestModel:
    """Test Request model functionality."""
    
    def test_request_creation(self):
        """Test request creation."""
        future_time = datetime.now() + timedelta(hours=12)
        window = DeliveryWindow(
            start=future_time - timedelta(hours=1),
            end=future_time + timedelta(hours=1)
        )
        
        dietary_restrictions = DietaryMetadata(
            vegetarian=True,
            allergens=["nuts"]
        )
        
        request = Request(
            requesting_org_id="org_shelter1",
            resource_type=ResourceType.PREPARED_MEAL,
            quantity_requested=100,
            urgency_level=UrgencyLevel.HIGH,
            required_by=future_time,
            delivery_window=window,
            dietary_restrictions=dietary_restrictions
        )
        
        assert request.request_id.startswith("req_")
        assert request.quantity_remaining == 100
        assert request.is_urgent is True
        assert not request.is_overdue
    
    def test_request_fulfillment_matching(self):
        """Test request-inventory matching."""
        request = Request(
            requesting_org_id="org_1",
            resource_type=ResourceType.PREPARED_MEAL,
            quantity_requested=50,
            urgency_level=UrgencyLevel.MEDIUM,
            required_by=datetime.now() + timedelta(hours=6),
            dietary_restrictions=DietaryMetadata(vegetarian=True)
        )
        
        # Matching inventory
        matching_batch = InventoryBatch(
            resource_type=ResourceType.PREPARED_MEAL,
            quantity_available=30,
            description="Vegetarian Meal",
            donor_org_id="org_2",
            location_id="org_2",
            dietary_metadata=DietaryMetadata(vegetarian=True)
        )
        
        assert request.can_fulfill_with(matching_batch) is True
        
        # Non-matching (different resource type)
        non_matching_batch = InventoryBatch(
            resource_type=ResourceType.FRESH_PRODUCE,
            quantity_available=30,
            description="Apples",
            donor_org_id="org_2",
            location_id="org_2"
        )
        
        assert request.can_fulfill_with(non_matching_batch) is False
        
        # Non-matching (dietary restrictions)
        non_vegetarian_batch = InventoryBatch(
            resource_type=ResourceType.PREPARED_MEAL,
            quantity_available=30,
            description="Chicken Meal",
            donor_org_id="org_2",
            location_id="org_2",
            dietary_metadata=DietaryMetadata(vegetarian=False)
        )
        
        assert request.can_fulfill_with(non_vegetarian_batch) is False


class TestVolunteerModel:
    """Test Volunteer model functionality."""
    
    def test_volunteer_creation(self):
        """Test volunteer creation."""
        availability = VolunteerAvailability(
            monday=[AvailabilitySlot(start_time=time(17, 0), end_time=time(20, 0))],
            saturday=[AvailabilitySlot(start_time=time(9, 0), end_time=time(17, 0))]
        )
        
        volunteer = Volunteer(
            user_id="user_123",
            name="John Volunteer",
            has_vehicle=True,
            vehicle_type="car",
            max_carry_capacity=50,
            preferred_zones=["central", "north"],
            availability=availability,
            total_deliveries=20,
            successful_deliveries=18
        )
        
        assert volunteer.volunteer_id.startswith("vol_")
        assert volunteer.success_rate == 0.9
        assert volunteer.is_available_for_assignment is True
        assert volunteer.availability.is_available_at("monday", time(18, 0)) is True
        assert volunteer.availability.is_available_at("tuesday", time(18, 0)) is False
    
    def test_volunteer_delivery_capabilities(self):
        """Test volunteer delivery capability matching."""
        volunteer = Volunteer(
            user_id="user_123",
            name="Test Volunteer",
            has_vehicle=True,
            max_carry_capacity=30,
            preferred_zones=["central"],
            cannot_handle=["frozen"]
        )
        
        # Can handle requirements
        good_requirements = {
            "requires_vehicle": True,
            "weight": 25,
            "zone": "central"
        }
        assert volunteer.can_handle_delivery(good_requirements) is True
        
        # Cannot handle - too heavy
        heavy_requirements = {
            "weight": 50
        }
        assert volunteer.can_handle_delivery(heavy_requirements) is False
        
        # Cannot handle - no vehicle
        no_vehicle_volunteer = Volunteer(
            user_id="user_456",
            name="Walker",
            has_vehicle=False
        )
        
        vehicle_requirements = {
            "requires_vehicle": True
        }
        assert no_vehicle_volunteer.can_handle_delivery(vehicle_requirements) is False


class TestAllocationModel:
    """Test Allocation and Assignment models."""
    
    def test_allocation_creation(self):
        """Test allocation creation."""
        allocation = Allocation(
            request_id="req_123",
            batch_id="batch_456",
            quantity_allocated=25,
            priority_score=0.8
        )
        
        assert allocation.allocation_id.startswith("alloc_")
        assert allocation.is_active is True
        assert not allocation.is_completed
    
    def test_delivery_assignment_creation(self):
        """Test delivery assignment creation."""
        assignment = DeliveryAssignment(
            volunteer_id="vol_123",
            allocation_ids=["alloc_1", "alloc_2"],
            pickup_location_id="org_restaurant1"
        )
        
        assert assignment.assignment_id.startswith("assign_")
        assert assignment.total_allocations == 2
        assert assignment.is_active is True
        
        # Test status transitions
        assignment.mark_pickup_completed()
        assert assignment.status == AssignmentStatus.IN_PROGRESS
        assert assignment.actual_pickup is not None
        
        assignment.mark_delivery_completed(
            confirmation={"signature": "John Doe"},
            notes="Delivered successfully"
        )
        assert assignment.status == AssignmentStatus.DELIVERED
        assert assignment.is_completed is True


class TestSeedDataGeneration:
    """Test seed data generation."""
    
    def test_seed_data_generation(self):
        """Test that seed data can be generated without errors."""
        from src.services.seed_data import generate_seed_data
        
        data = generate_seed_data()
        
        assert "users" in data
        assert "organizations" in data
        assert "volunteers" in data
        assert "inventory" in data
        assert "requests" in data
        
        # Verify we have reasonable amounts of data
        assert len(data["users"]) > 20  # coordinators + volunteers + donors
        assert len(data["organizations"]) >= 8  # shelters + food banks + restaurants
        assert len(data["volunteers"]) > 15  # Most users should be volunteers
        assert len(data["inventory"]) > 50  # Good variety of inventory
        assert len(data["requests"]) > 20   # Active requests from organizations
        
        # Verify data integrity
        for user in data["users"]:
            assert user.user_id.startswith("user_")
            assert isinstance(user.account_type, AccountType)
        
        for org in data["organizations"]:
            assert org.org_id.startswith("org_")
            assert isinstance(org.type, OrganizationType)
            assert org.location.zone in ["north", "central", "south"]
        
        for request in data["requests"]:
            assert request.request_id.startswith("req_")
            assert request.quantity_requested > 0
            assert request.required_by > datetime.now()


if __name__ == "__main__":
    pytest.main([__file__])