"""Regression tests for the 2026-09 full-system audit fixes:
- normal-mode matching no longer silently crosses regions
- disaster volunteer alerting no longer bleeds across regions
- task acceptance can't be spoofed onto another volunteer
- request verification requires a coordinator
- contact PII / pickup OTP are redacted from non-owners on public listings
- task status can't skip/re-enter terminal states
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


def _signup(email, capabilities=None):
    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={"name": "Test User", "email": email, "password": "TestPass123!"},
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    if capabilities:
        test_client.patch("/api/auth/me/capabilities", json=capabilities)
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


class TestRegionScopedMatching:
    def test_normal_matching_does_not_cross_regions(self, admin_client):
        donor = _signup("donor.match.north@example.com", {"is_donor": True})
        requester = _signup("req.match.south@example.com")
        batch = _donate(donor, 50, region="north")
        req = _request(requester, 20, region="south")

        service = get_coordination_service()
        # Drain every matchable pair already in seed data first, so only
        # our north-batch/south-request pair remains as a candidate.
        while service.create_normal_task() is not None:
            pass

        stored_req = next(r for r in service.state.requests if r.request_id == req["request_id"])
        stored_batch = next(b for b in service.state.inventory if b.batch_id == batch["batch_id"])
        assert stored_req.quantity_fulfilled == 0
        assert stored_batch.quantity_allocated == 0

    def test_normal_matching_still_works_within_same_region(self, admin_client):
        donor = _signup("donor.match.same@example.com", {"is_donor": True})
        requester = _signup("req.match.same@example.com")
        _donate(donor, 50, region="north")
        _request(requester, 20, region="north")

        service = get_coordination_service()
        task = service.create_normal_task()
        assert task is not None

    def test_matching_unrestricted_when_region_unset(self, admin_client):
        donor = _signup("donor.match.legacy@example.com", {"is_donor": True})
        requester = _signup("req.match.legacy@example.com")
        _donate(donor, 50, region=None) if False else None
        response = donor.post(
            "/api/resources",
            json={"quantity_available": 50, "resource_type": "equipment", "unit": "units"},
        )
        assert response.status_code == 200, response.text
        response = requester.post(
            "/api/requests",
            json={"quantity_requested": 10, "resource_type": "equipment"},
        )
        assert response.status_code == 200, response.text

        service = get_coordination_service()
        task = service.create_normal_task()
        assert task is not None


class TestDisasterVolunteerRegionScoping:
    def test_dispatch_does_not_alert_volunteers_in_other_regions(self, admin_client):
        service = get_coordination_service()
        # Seeded volunteers span all three zones/regions; pick one known to
        # be in a different region than the disaster we create.
        other_region_volunteers = [
            v for v in service.state.volunteers if v.last_known_zone == "south" and v.verified
        ]
        assert other_region_volunteers, "seed data should include south volunteers"

        report = admin_client.post(
            "/api/disasters/report",
            json={
                "type": "flood",
                "title": "North flood",
                "region": "north",
                "affected_zones": [],
                "affected_location": {"description": "North district river bank"},
            },
        )
        assert report.status_code == 201, report.text
        disaster = report.json()
        assert disaster["affected_zones"] == []
        admin_client.post(f"/api/disasters/{disaster['disaster_id']}/verify", json={})
        admin_client.post(f"/api/disasters/{disaster['disaster_id']}/dispatch")

        alerts = [a for a in service.state.alerts if a.disaster_id == disaster["disaster_id"]]
        alerted_volunteer_ids = {a.volunteer_id for a in alerts}
        south_ids = {v.volunteer_id for v in other_region_volunteers}
        assert not (alerted_volunteer_ids & south_ids)

    def test_dispatch_still_alerts_in_region_volunteers_with_no_affected_zones(self, admin_client):
        service = get_coordination_service()
        north_volunteers = [
            v for v in service.state.volunteers if v.last_known_zone == "north" and v.verified
        ]
        assert north_volunteers, "seed data should include north volunteers"

        report = admin_client.post(
            "/api/disasters/report",
            json={
                "type": "flood",
                "title": "North flood 2",
                "region": "north",
                "affected_zones": [],
                "affected_location": {"description": "North district river bank"},
            },
        )
        assert report.status_code == 201, report.text
        disaster = report.json()
        admin_client.post(f"/api/disasters/{disaster['disaster_id']}/verify", json={})
        admin_client.post(f"/api/disasters/{disaster['disaster_id']}/dispatch")

        alerts = [a for a in service.state.alerts if a.disaster_id == disaster["disaster_id"]]
        assert len(alerts) > 0


class TestTaskAcceptanceOwnership:
    def test_volunteer_cannot_accept_task_as_another_volunteer(self, admin_client):
        service = get_coordination_service()
        other_volunteer = service.state.volunteers[0]
        task = service.create_normal_task()
        if task is None:
            pytest.skip("no matchable task in seed data")

        outsider = _signup("outsider.accept@example.com", {"is_volunteer": True})
        response = outsider.post(
            f"/api/tasks/{task.task_id}/accept",
            json={"volunteer_id": other_volunteer.volunteer_id},
        )
        assert response.status_code == 403


class TestRequestVerificationRequiresCoordinator:
    def test_unauthenticated_cannot_verify_request(self, admin_client):
        requester = _signup("req.verify@example.com")
        req = _request(requester, 5, region="north")
        anon = TestClient(app)
        response = anon.post(f"/api/requests/{req['request_id']}/verify")
        assert response.status_code in (401, 403)

    def test_coordinator_can_verify_request(self, admin_client):
        requester = _signup("req.verify2@example.com")
        req = _request(requester, 5, region="north")
        response = admin_client.post(f"/api/requests/{req['request_id']}/verify")
        assert response.status_code == 200, response.text


class TestPIIRedaction:
    def test_contact_info_hidden_from_other_users(self, admin_client):
        requester = _signup("req.pii@example.com")
        req = requester.post(
            "/api/requests",
            json={
                "quantity_requested": 5,
                "resource_type": "equipment",
                "region": "north",
                "contact_person": "Jane Doe",
                "contact_phone": "555-0100",
            },
        )
        assert req.status_code == 200, req.text

        outsider = _signup("req.pii.outsider@example.com")
        listing = outsider.get("/api/requests").json()
        row = next(r for r in listing if r["request_id"] == req.json()["request_id"])
        assert row["contact_phone"] is None
        assert row["contact_person"] is None

    def test_owner_still_sees_own_contact_info(self, admin_client):
        requester = _signup("req.pii.owner@example.com")
        req = requester.post(
            "/api/requests",
            json={
                "quantity_requested": 5,
                "resource_type": "equipment",
                "region": "north",
                "contact_person": "Jane Doe",
                "contact_phone": "555-0100",
            },
        )
        assert req.status_code == 200, req.text
        listing = requester.get("/api/requests").json()
        row = next(r for r in listing if r["request_id"] == req.json()["request_id"])
        assert row["contact_phone"] == "555-0100"

    def test_pickup_otp_hidden_from_other_users(self, admin_client):
        donor = _signup("donor.pii@example.com", {"is_donor": True})
        batch = _donate(donor, 10, region="north")
        assert batch.get("pickup_otp")

        outsider = _signup("donor.pii.outsider@example.com")
        listing = outsider.get("/api/resources").json()
        row = next(b for b in listing if b["batch_id"] == batch["batch_id"])
        assert row["pickup_otp"] is None


class TestTaskStatusTransitionGuard:
    def test_cannot_change_status_once_completed(self, admin_client):
        service = get_coordination_service()
        task = service.create_normal_task()
        if task is None:
            pytest.skip("no matchable task in seed data")
        service.update_task_status(task.task_id, service.state.tasks[0].status.__class__.COMPLETED)
        response = admin_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "in_progress"})
        assert response.status_code in (400, 409)

    def test_cannot_jump_to_completed_before_assignment(self, admin_client):
        service = get_coordination_service()
        task = service.create_normal_task()
        if task is None:
            pytest.skip("no matchable task in seed data")
        task.status = task.status.__class__.AVAILABLE
        response = admin_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "completed"})
        assert response.status_code in (400, 409)
