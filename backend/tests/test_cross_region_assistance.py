"""Tests for feature/cross-region-assistance: when a region's local supply
can't cover a shortfall, another region's SURPLUS (after protecting its own
pending demand) can be offered - never its whole stock blindly.
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def admin_client():
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


def _signup(email):
    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={"name": "Test User", "email": email, "password": "TestPass123!"},
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    test_client.patch("/api/auth/me/capabilities", json={"is_donor": True, "is_volunteer": True})
    return test_client


def _donate(client, quantity, region, resource_type="equipment"):
    response = client.post(
        "/api/resources",
        json={
            "quantity_available": quantity,
            "resource_type": resource_type,
            "unit": "units",
            "region": region,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _request(client, quantity, region, resource_type="equipment"):
    response = client.post(
        "/api/requests",
        json={"quantity_requested": quantity, "resource_type": resource_type, "region": region},
    )
    assert response.status_code == 200, response.text
    return response.json()


class TestCrossRegionAssistance:
    def test_no_shortfall_when_local_supply_covers_need(self, admin_client):
        donor = _signup("donor.south@example.com")
        _donate(donor, 100, region="south")

        response = admin_client.get(
            "/api/requests/cross-region-assistance",
            params={"region": "south", "resource_type": "equipment", "quantity_needed": 40},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["shortfall"] == 0
        assert body["cross_region_candidates"] == []

    def test_shortfall_offers_other_regions_surplus(self, admin_client):
        donor_south = _signup("donor.south2@example.com")
        donor_north = _signup("donor.north@example.com")
        _donate(donor_south, 40, region="south")
        _donate(donor_north, 100, region="north")

        response = admin_client.get(
            "/api/requests/cross-region-assistance",
            params={"region": "south", "resource_type": "equipment", "quantity_needed": 100},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["local_available"] == 40
        assert body["shortfall"] == 60
        candidates = {c["region"]: c for c in body["cross_region_candidates"]}
        assert "north" in candidates
        assert candidates["north"]["available_surplus"] == 100

    def test_other_regions_own_pending_demand_is_protected(self, admin_client):
        """Region B (north) has its own pending request for most of its
        supply - only the leftover surplus may be offered to Region A."""

        donor_north = _signup("donor.north2@example.com")
        requester_north = _signup("requester.north@example.com")
        _donate(donor_north, 100, region="north")
        _request(requester_north, 90, region="north")

        response = admin_client.get(
            "/api/requests/cross-region-assistance",
            params={"region": "south", "resource_type": "equipment", "quantity_needed": 50},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        candidates = {c["region"]: c for c in body["cross_region_candidates"]}
        assert candidates["north"]["available_surplus"] == 10

    def test_unknown_region_rejected(self, admin_client):
        response = admin_client.get(
            "/api/requests/cross-region-assistance",
            params={"region": "atlantis", "resource_type": "equipment", "quantity_needed": 10},
        )
        assert response.status_code == 400

    def test_non_coordinator_cannot_query(self):
        client = _signup("resident.cross@example.com")
        response = client.get(
            "/api/requests/cross-region-assistance",
            params={"region": "south", "resource_type": "equipment", "quantity_needed": 10},
        )
        assert response.status_code == 403

    def test_request_and_batch_region_are_normalized(self, admin_client):
        donor = _signup("donor.case@example.com")
        batch = _donate(donor, 10, region="  SOUTH ")
        assert batch["region"] == "south"
