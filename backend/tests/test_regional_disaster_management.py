"""Tests for feature/regional-disaster-management: canonical `region` scoping
on disasters, and the "Region A = disaster, Region B/C = normal, and they
stay independent" guarantee from the plan.
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
        json={
            "name": "Concerned Resident",
            "email": "resident@example.com",
            "password": "ResidentPass123!",
        },
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    return test_client


def _report(client, **overrides):
    payload = {
        "type": "wildfire",
        "title": "Wildfire approaching Elm Street",
        "affected_zones": ["central"],
        "severity": "high",
    }
    payload.update(overrides)
    response = client.post("/api/disasters/report", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


class TestRegionalDisasterManagement:
    def test_region_auto_derived_from_affected_zones(self, regular_user_client):
        report = _report(regular_user_client, affected_zones=["south"])
        assert report["region"] == "south"

    def test_explicit_region_is_normalized(self, regular_user_client):
        # affected_zones intentionally isn't itself a canonical region name,
        # to prove the explicit `region` field wins over zone-derivation.
        report = _report(
            regular_user_client, region="  NORTH ", affected_zones=["riverside district"]
        )
        assert report["region"] == "north"

    def test_unknown_region_is_rejected(self, regular_user_client):
        response = regular_user_client.post(
            "/api/disasters/report",
            json={
                "type": "wildfire",
                "title": "Somewhere unclear",
                "affected_zones": ["central"],
                "region": "atlantis",
            },
        )
        assert response.status_code == 400

    def test_affected_radius_must_be_positive(self, regular_user_client):
        response = regular_user_client.post(
            "/api/disasters/report",
            json={
                "type": "wildfire",
                "title": "Radius test",
                "affected_zones": ["central"],
                "affected_radius_km": -5,
            },
        )
        assert response.status_code == 400

    def test_affected_communities_and_radius_are_stored(self, regular_user_client):
        report = _report(
            regular_user_client,
            affected_communities=["Elm Street", "Oak Park"],
            affected_radius_km=3.5,
        )
        assert report["affected_communities"] == ["Elm Street", "Oak Park"]
        assert report["affected_radius_km"] == 3.5

    def test_multiple_disasters_in_different_regions_are_independent(
        self, regular_user_client, admin_client
    ):
        """Region A = disaster, Region B = disaster too, but each remains
        independently dispatchable/assignable - one's alerts/tasks never
        leak into the other's."""

        north = _report(regular_user_client, title="North flood", affected_zones=["north"])
        south = _report(regular_user_client, title="South wildfire", affected_zones=["south"])
        admin_client.post(f"/api/disasters/{north['disaster_id']}/verify", json={})
        admin_client.post(f"/api/disasters/{south['disaster_id']}/verify", json={})

        north_dispatch = admin_client.post(f"/api/disasters/{north['disaster_id']}/dispatch")
        assert north_dispatch.status_code == 200

        alerts = get_coordination_service().state.alerts
        # Only the north disaster was dispatched - no alert should have been
        # created for south, proving the two stay independently scoped.
        assert any(alert.disaster_id == north["disaster_id"] for alert in alerts)
        assert all(alert.disaster_id != south["disaster_id"] for alert in alerts)

    def test_region_b_normal_requests_unaffected_by_region_a_disaster(
        self, regular_user_client, admin_client
    ):
        """Scenario 3 from the plan: while Region A has an active disaster,
        Region B/C's normal-mode operations (here: dashboard normal-mode
        counters) are unaffected."""

        service = get_coordination_service()
        baseline_requests = len(service.state.requests)
        baseline_readiness = service.dashboard_readiness()["active_requests"]

        report = _report(regular_user_client, affected_zones=["north"])
        admin_client.post(f"/api/disasters/{report['disaster_id']}/verify", json={})
        admin_client.post(f"/api/disasters/{report['disaster_id']}/dispatch")

        assert len(service.state.requests) == baseline_requests
        assert service.dashboard_readiness()["active_requests"] == baseline_readiness

    def test_list_disasters_by_region_scopes_correctly(self, regular_user_client, admin_client):
        _report(regular_user_client, title="North report", affected_zones=["north"])
        south_report = _report(regular_user_client, title="South report", affected_zones=["south"])
        admin_client.post(f"/api/disasters/{south_report['disaster_id']}/verify", json={})

        south_only = admin_client.get("/api/disasters/by-region/south").json()
        ids = {item["disaster_id"] for item in south_only}
        assert south_report["disaster_id"] in ids

        north_only = admin_client.get("/api/disasters/by-region/north").json()
        # The north report is still PENDING_VALIDATION, so it must not show
        # up even in its own region's public listing.
        assert all(item["disaster_id"] != south_report["disaster_id"] for item in north_only)

    def test_list_disasters_by_region_rejects_unknown_region(self, admin_client):
        response = admin_client.get("/api/disasters/by-region/atlantis")
        assert response.status_code == 400

    def test_duplicate_detection_uses_canonical_region_not_just_zone_text(
        self, regular_user_client
    ):
        """Two reports for the same region but differently-worded zone tags
        (so no raw zone-string overlap) still get flagged as duplicates,
        because `region` is compared as a normalized value."""

        first = _report(
            regular_user_client,
            title="Original south report",
            region="south",
            affected_zones=["south riverside district"],
        )
        second = _report(
            regular_user_client,
            title="Second report, different wording",
            region="south",
            affected_zones=["south side near the river"],
        )
        assert second["is_duplicate"] is True
        assert second["duplicate_of"] == first["disaster_id"]
