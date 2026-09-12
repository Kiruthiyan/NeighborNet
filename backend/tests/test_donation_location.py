"""Tests for donation registration location fetching, coordinates, and pickup OTP generation."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def donor_client():
    service = get_coordination_service()
    service.reset()
    test_client = TestClient(app)
    login = test_client.post(
        "/api/auth/login",
        json={"email": "admin@neighbornet.org", "password": DEFAULT_DEMO_PASSWORD},
    )
    assert login.status_code == 200, login.text
    test_client.headers["Authorization"] = f"Bearer {login.json()['access_token']}"
    return test_client


def test_create_donation_with_location_and_otp(donor_client):
    payload = {
        "resource_type": "FOOD",
        "quantity": 25,
        "unit": "Portions",
        "item_name": "Fresh Cooked Meals",
        "pickup_location": "12 Station Road, Zone B, Rathmalana",
        "latitude": 6.8213,
        "longitude": 79.8862,
        "expiry_hours": 24,
        "notes": "Packed and ready for collection"
    }
    response = donor_client.post("/api/resources", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["quantity_available"] == 25
    assert data["description"] == "Fresh Cooked Meals"
    assert data["pickup_location"] == "12 Station Road, Zone B, Rathmalana"
    assert data["latitude"] == 6.8213
    assert data["longitude"] == 79.8862
    assert data["pickup_otp"] is not None
    assert len(data["pickup_otp"]) == 6


def test_create_donation_category_fallbacks(donor_client):
    categories = ["WATER", "MEDICAL", "CLOTHING", "EQUIPMENT"]
    for cat in categories:
        payload = {
            "resource_type": cat,
            "quantity": 10,
            "item_name": f"Test {cat} Item",
            "pickup_location": "Community Center Depot",
        }
        res = donor_client.post("/api/resources", json=payload)
        assert res.status_code == 200, res.text
        assert res.json()["quantity_available"] == 10
