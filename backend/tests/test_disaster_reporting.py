"""Tests for feature/disaster-reporting: citizen-submitted disaster reports.

Covers the REPORT -> PENDING VALIDATION lifecycle step only. Verification/
activation (PENDING_VALIDATION -> ACTIVE) is feature/disaster-verification
and is not implemented yet - these tests only assert that a report never
auto-activates and never lets volunteers be mobilized before a coordinator
reviews it.
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def admin_client():
    """Fresh state per test, authenticated as the seeded admin/coordinator."""

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
    """A brand new, plain `user` account (no donor/volunteer/coordinator
    capabilities) - the case the plan calls out explicitly: any authenticated
    user, not just a coordinator, must be able to file a report."""

    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={
            "name": "Concerned Resident",
            "email": "resident@example.com",
            "password": "ResidentPass123!",
        },
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    return test_client


def _report_payload(**overrides):
    # Seed data already includes an ACTIVE flood disaster in zone "south"
    # (see seed_data._generate_disaster_fixture) - deliberately using a
    # different type/zone here so these tests exercise a clean report,
    # not an accidental duplicate of the seed fixture. The duplicate-
    # detection tests below construct their own collisions explicitly.
    payload = {
        "type": "wildfire",
        "title": "Wildfire approaching Elm Street",
        "description": "Fire is spreading fast, several homes affected.",
        "affected_zones": ["central"],
        "severity": "high",
        "evidence": ["https://example.com/photo1.jpg"],
    }
    payload.update(overrides)
    return payload


class TestDisasterReporting:
    def test_regular_user_can_report_disaster(self, regular_user_client):
        response = regular_user_client.post("/api/disasters/report", json=_report_payload())
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["status"] == "pending_validation"
        assert body["reported_by"] is not None
        assert body["is_duplicate"] is False
        assert body["duplicate_of"] is None

    def test_unauthenticated_report_returns_401(self):
        client = TestClient(app)
        response = client.post("/api/disasters/report", json=_report_payload())
        assert response.status_code == 401

    def test_missing_location_and_zone_returns_400(self, regular_user_client):
        response = regular_user_client.post(
            "/api/disasters/report", json=_report_payload(affected_zones=[])
        )
        assert response.status_code == 400
        assert "location" in response.json()["error"].lower()

    def test_missing_title_returns_422(self, regular_user_client):
        # Pydantic schema-level validation (min_length=3) rejects this before
        # it ever reaches the service layer.
        response = regular_user_client.post(
            "/api/disasters/report", json=_report_payload(title="")
        )
        assert response.status_code == 422

    def test_invalid_severity_returns_400(self, regular_user_client):
        response = regular_user_client.post(
            "/api/disasters/report", json=_report_payload(severity="catastrophic-ish")
        )
        assert response.status_code == 400

    def test_pending_report_cannot_be_dispatched(self, regular_user_client, admin_client):
        report = regular_user_client.post("/api/disasters/report", json=_report_payload()).json()
        disaster_id = report["disaster_id"]

        # Coordinator-gated, but even a coordinator can't dispatch a report
        # that hasn't been verified/activated yet.
        dispatch = admin_client.post(f"/api/disasters/{disaster_id}/dispatch")
        assert dispatch.status_code == 409
        assert "verified" in dispatch.json()["error"].lower() or "pending" in dispatch.json()["error"].lower()

    def test_pending_report_cannot_be_assigned(self, regular_user_client, admin_client):
        report = regular_user_client.post("/api/disasters/report", json=_report_payload()).json()
        disaster_id = report["disaster_id"]

        assign = admin_client.post(f"/api/disasters/{disaster_id}/assign")
        assert assign.status_code == 409

    def test_pending_report_excluded_from_active_disaster_counts(
        self, regular_user_client, admin_client
    ):
        baseline = admin_client.get("/api/dashboard/metrics").json()["active_disasters"]
        regular_user_client.post("/api/disasters/report", json=_report_payload())

        metrics = admin_client.get("/api/dashboard/metrics").json()
        assert metrics["active_disasters"] == baseline

    def test_duplicate_report_is_flagged_not_dropped(self, regular_user_client):
        first = regular_user_client.post("/api/disasters/report", json=_report_payload()).json()

        second = regular_user_client.post(
            "/api/disasters/report",
            json=_report_payload(title="Same flood, different reporter wording"),
        ).json()

        assert second["is_duplicate"] is True
        assert second["duplicate_of"] == first["disaster_id"]
        # Still created (not silently discarded) so a coordinator can triage it.
        assert second["status"] == "pending_validation"

    def test_different_zone_is_not_flagged_as_duplicate(self, regular_user_client):
        regular_user_client.post("/api/disasters/report", json=_report_payload())

        other = regular_user_client.post(
            "/api/disasters/report",
            json=_report_payload(title="Unrelated flood", type="flood", affected_zones=["north"]),
        ).json()

        assert other["is_duplicate"] is False
        assert other["duplicate_of"] is None

    def test_coordinator_direct_create_is_still_active_immediately(self, admin_client):
        """Regression check: coordinator-created disasters (existing
        create_disaster path) are unaffected by this feature - they still go
        straight to ACTIVE, unlike a citizen report."""

        response = admin_client.post(
            "/api/disasters",
            json={
                "disaster_id": "disaster_regression_test",
                "type": "flood",
                "title": "Coordinator-declared flood",
                "affected_zones": ["east"],
                "severity": "high",
                "created_by": "user_admin_test",
            },
        )
        assert response.status_code == 200, response.text
        assert response.json()["status"] == "active"
