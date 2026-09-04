"""
Pytest configuration and fixtures for NeighborNet Resilience tests.
"""

import asyncio
import os
from pathlib import Path
import pytest
from unittest.mock import Mock, patch

# Set test environment
os.environ["NODE_ENV"] = "test"
os.environ["DEBUG"] = "true"
os.environ["STRANDS_MODEL_PROVIDER"] = "mock"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_settings():
    """Mock application settings for testing."""
    from src.config import Settings
    
    return Settings(
        environment="test",
        debug=True,
        strands_model_provider="mock",
        database_url="dynamodb://localhost:8001",
        dynamodb_endpoint_url="http://localhost:8001",
        api_secret_key="test-secret-key",
        demo_mode=True,
    )


@pytest.fixture
def mock_strands_agent():
    """Mock Strands agent for testing."""
    agent = Mock()
    agent.name = "test_agent"
    agent.system_prompt = "Test system prompt"
    
    # Mock agent call method
    async def mock_call(prompt):
        return f"Mock response to: {prompt}"
    
    agent.__call__ = Mock(side_effect=mock_call)
    agent.stream_async = Mock()
    
    return agent


@pytest.fixture
def mock_database_service():
    """Mock database service for testing."""
    with patch("src.services.database.get_database_service") as mock:
        db_service = Mock()
        db_service.client = Mock()
        db_service.resource = Mock()
        mock.return_value = db_service
        yield db_service


@pytest.fixture
def test_inventory_data():
    """Sample inventory data for testing."""
    return {
        "batch_id": "inv_001",
        "resource_type": "prepared_meal",
        "quantity_available": 50,
        "quantity_allocated": 0,
        "expiry_datetime": "2025-03-10T18:00:00Z",
        "donor_org_id": "org_001",
        "location_id": "loc_001",
        "dietary_metadata": {
            "vegetarian": True,
            "vegan": False,
            "gluten_free": True,
            "allergens": []
        },
        "status": "available"
    }


@pytest.fixture
def test_request_data():
    """Sample request data for testing."""
    return {
        "request_id": "req_001",
        "requesting_org_id": "org_002",
        "resource_type": "prepared_meal",
        "quantity_requested": 25,
        "quantity_fulfilled": 0,
        "urgency_level": "medium",
        "required_by": "2025-03-10T20:00:00Z",
        "dietary_restrictions": {
            "vegetarian": False,
            "vegan": False,
            "gluten_free": True,
            "allergens": ["nuts"]
        },
        "delivery_window": {
            "start": "2025-03-10T18:00:00Z",
            "end": "2025-03-10T21:00:00Z"
        },
        "status": "pending"
    }


@pytest.fixture
def test_volunteer_data():
    """Sample volunteer data for testing."""
    return {
        "volunteer_id": "vol_001",
        "availability_schedule": {
            "monday": {"start": "09:00", "end": "17:00"},
            "tuesday": {"start": "09:00", "end": "17:00"},
            "wednesday": {"start": "09:00", "end": "17:00"}
        },
        "vehicle_capacity": 100,
        "coverage_zones": ["zone_north", "zone_central"],
        "delivery_experience": True,
        "status": "available"
    }


@pytest.fixture
def test_disruption_event():
    """Sample disruption event for testing."""
    return {
        "event_id": "event_001",
        "event_type": "volunteer_cancelled",
        "timestamp": "2025-03-10T15:30:00Z",
        "event_data": {
            "volunteer_id": "vol_001",
            "affected_assignments": ["assign_001", "assign_002"],
            "reason": "Vehicle breakdown"
        },
        "impact_assessment": {
            "severity": "medium",
            "affected_deliveries": 2,
            "recommended_action": "reassign"
        },
        "processing_status": "pending"
    }


@pytest.fixture
def sample_allocation_plan():
    """Sample allocation plan for testing recovery algorithms."""
    return {
        "plan_id": "plan_001",
        "created_at": "2025-03-10T14:00:00Z",
        "allocations": [
            {
                "allocation_id": "alloc_001",
                "request_id": "req_001",
                "batch_id": "inv_001",
                "quantity_allocated": 25,
                "volunteer_id": "vol_001",
                "assignment_id": "assign_001"
            },
            {
                "allocation_id": "alloc_002", 
                "request_id": "req_002",
                "batch_id": "inv_002",
                "quantity_allocated": 30,
                "volunteer_id": "vol_002",
                "assignment_id": "assign_002"
            }
        ],
        "status": "active"
    }