"""Tests for feature/location-privacy: volunteer live GPS and contact PII
must not be exposed to unauthenticated callers or non-coordinator users.
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


@pytest.fixture
def regular_user_client(admin_client):
    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={"name": "Resident", "email": "resident@example.com", "password": "ResidentPass123!"},
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    return test_client


class TestVolunteerLocationPrivacy:
    def test_anonymous_cannot_list_volunteers(self):
        client = TestClient(app)
        response = client.get("/api/volunteers")
        assert response.status_code == 401

    def test_signed_in_non_coordinator_sees_no_contact_or_live_location(
        self, regular_user_client
    ):
        response = regular_user_client.get("/api/volunteers")
        assert response.status_code == 200
        volunteers = response.json()
        assert volunteers, "expected seeded volunteers to be present"
        for v in volunteers:
            assert "phone" not in v
            assert "email" not in v
            assert "current_location" not in v
            assert "emergency_contact_name" not in v
            assert "emergency_contact_phone" not in v
            # Still enough to coordinate with them.
            assert "name" in v
            assert "last_known_zone" in v

    def test_coordinator_sees_full_contact_and_location(self, admin_client):
        response = admin_client.get("/api/volunteers")
        assert response.status_code == 200
        volunteers = response.json()
        assert volunteers
        assert "phone" in volunteers[0]
        assert "current_location" in volunteers[0]

    def test_anonymous_cannot_list_eligible_volunteers(self):
        client = TestClient(app)
        response = client.get("/api/volunteers/eligible")
        assert response.status_code == 401
