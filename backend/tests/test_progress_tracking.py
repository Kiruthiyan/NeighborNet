"""Tests for the real volunteer progress-monitoring flow:
acceptance persistence, OTP-gated pickup/delivery, ownership on
status/telemetry/cannot-continue, requester visibility, completion, and
invalid transitions/unauthorized access.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.models import CoordinationTask, Request, RequestStatus, TaskLifecycle, UrgencyLevel, Volunteer
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
    """Sign up a fresh test user and return (client, user_id)."""

    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={"name": "Test User", "email": email, "password": "TestPass123!"},
    )
    assert signup.status_code == 201, signup.text
    body = signup.json()
    test_client.headers["Authorization"] = f"Bearer {body['access_token']}"
    return test_client, body["user"]["user_id"]


def _make_volunteer(user_id: str) -> Volunteer:
    volunteer = Volunteer(user_id=user_id, name="Test Volunteer")
    get_coordination_service().state.volunteers.append(volunteer)
    return volunteer


def _make_task(volunteer_id: str | None = None, request_id: str | None = None, status=TaskLifecycle.ASSIGNED) -> CoordinationTask:
    task = CoordinationTask(
        title="Deliver supplies",
        description="Deliver supplies to shelter",
        volunteer_id=volunteer_id,
        request_id=request_id,
        status=status,
    )
    get_coordination_service().state.tasks.append(task)
    return task


class TestAcceptancePersistence:
    def test_accept_persists_volunteer_and_status(self, admin_client):
        client, user_id = _signup("accept.persist@example.com")
        volunteer = _make_volunteer(user_id)
        task = _make_task(status=TaskLifecycle.AVAILABLE)

        response = client.post(f"/api/tasks/{task.task_id}/accept", json={})
        assert response.status_code == 200, response.text

        refetched = client.get(f"/api/tasks/{task.task_id}").json()
        assert refetched["status"] == "assigned"
        assert refetched["volunteer_id"] == volunteer.volunteer_id

        verifications = client.get(f"/api/tasks/{task.task_id}/verification").json()
        assert verifications["pickup_code"] is not None
        assert verifications["delivery_code"] is not None


class TestOtpGating:
    def test_delivery_before_pickup_rejected(self, admin_client):
        client, user_id = _signup("otp.gate@example.com")
        volunteer = _make_volunteer(user_id)
        task = _make_task(volunteer_id=volunteer.volunteer_id)
        codes = client.get(f"/api/tasks/{task.task_id}/verification").json()

        response = client.post(
            f"/api/tasks/{task.task_id}/verify-delivery",
            json={"code": codes["delivery_code"]["otp_code"]},
        )
        assert response.status_code == 400

    def test_pickup_then_delivery_completes_task_and_fulfills_request(self, admin_client):
        client, user_id = _signup("otp.flow@example.com")
        volunteer = _make_volunteer(user_id)

        service = get_coordination_service()
        req = Request(
            requesting_org_id="org-otp-flow",
            resource_type="equipment",
            quantity_requested=5,
            urgency_level=UrgencyLevel.MEDIUM,
            required_by=datetime.now(timezone.utc) + timedelta(days=1),
        )
        service.state.requests.append(req)
        task = _make_task(volunteer_id=volunteer.volunteer_id, request_id=req.request_id)
        codes = client.get(f"/api/tasks/{task.task_id}/verification").json()

        pickup = client.post(
            f"/api/tasks/{task.task_id}/verify-pickup",
            json={"code": codes["pickup_code"]["otp_code"]},
        )
        assert pickup.status_code == 200, pickup.text
        assert client.get(f"/api/tasks/{task.task_id}").json()["status"] == "in_progress"

        delivery = client.post(
            f"/api/tasks/{task.task_id}/verify-delivery",
            json={"code": codes["delivery_code"]["otp_code"]},
        )
        assert delivery.status_code == 200, delivery.text
        assert client.get(f"/api/tasks/{task.task_id}").json()["status"] == "completed"

        stored_req = next(r for r in service.state.requests if r.request_id == req.request_id)
        assert stored_req.status == RequestStatus.FULFILLED


class TestStatusPatchBypassClosed:
    def test_non_coordinator_cannot_patch_completed(self, admin_client):
        client, user_id = _signup("bypass.completed@example.com")
        volunteer = _make_volunteer(user_id)
        task = _make_task(volunteer_id=volunteer.volunteer_id)

        response = client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "completed"})
        assert response.status_code == 403

    def test_non_coordinator_cannot_patch_in_progress(self, admin_client):
        client, user_id = _signup("bypass.inprogress@example.com")
        volunteer = _make_volunteer(user_id)
        task = _make_task(volunteer_id=volunteer.volunteer_id)

        response = client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "in_progress"})
        assert response.status_code == 403

    def test_coordinator_can_still_patch(self, admin_client):
        volunteer = _make_volunteer("some-user-id")
        task = _make_task(volunteer_id=volunteer.volunteer_id)

        response = admin_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "needs_attention"})
        assert response.status_code == 200, response.text


class TestOwnership:
    def _assigned_task_for_stranger(self, admin_client):
        owner_client, owner_user_id = _signup("owner.task@example.com")
        owner_volunteer = _make_volunteer(owner_user_id)
        task = _make_task(volunteer_id=owner_volunteer.volunteer_id)

        stranger_client, stranger_user_id = _signup("stranger.task@example.com")
        _make_volunteer(stranger_user_id)
        return task, stranger_client

    def test_foreign_volunteer_blocked_from_telemetry(self, admin_client):
        task, stranger_client = self._assigned_task_for_stranger(admin_client)
        response = stranger_client.post(f"/api/tasks/{task.task_id}/telemetry", json={"lat": 1.0, "lng": 2.0})
        assert response.status_code == 403

    def test_foreign_volunteer_blocked_from_cannot_continue(self, admin_client):
        task, stranger_client = self._assigned_task_for_stranger(admin_client)
        response = stranger_client.post(f"/api/tasks/{task.task_id}/cannot-continue", json={"reason": "spoof"})
        assert response.status_code == 403

    def test_foreign_volunteer_blocked_from_status_patch(self, admin_client):
        task, stranger_client = self._assigned_task_for_stranger(admin_client)
        response = stranger_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "needs_attention"})
        assert response.status_code == 403

    def test_owning_volunteer_can_report_telemetry(self, admin_client):
        client, user_id = _signup("owner.telemetry@example.com")
        volunteer = _make_volunteer(user_id)
        task = _make_task(volunteer_id=volunteer.volunteer_id)

        response = client.post(f"/api/tasks/{task.task_id}/telemetry", json={"lat": 6.93, "lng": 79.86})
        assert response.status_code == 200, response.text


class TestRequesterVisibility:
    def test_requester_sees_real_task_status_via_tasks_list(self, admin_client):
        vol_client, vol_user_id = _signup("visibility.volunteer@example.com")
        volunteer = _make_volunteer(vol_user_id)

        requester_client, _ = _signup("visibility.requester@example.com")
        service = get_coordination_service()
        req = Request(
            requesting_org_id="org-visibility",
            resource_type="equipment",
            quantity_requested=5,
            urgency_level=UrgencyLevel.MEDIUM,
            required_by=datetime.now(timezone.utc) + timedelta(days=1),
        )
        service.state.requests.append(req)
        task = _make_task(volunteer_id=volunteer.volunteer_id, request_id=req.request_id)
        codes = vol_client.get(f"/api/tasks/{task.task_id}/verification").json()
        vol_client.post(
            f"/api/tasks/{task.task_id}/verify-pickup",
            json={"code": codes["pickup_code"]["otp_code"]},
        )

        listing = requester_client.get("/api/tasks").json()
        row = next(t for t in listing if t["task_id"] == task.task_id)
        assert row["status"] == "in_progress"
        assert row["request_id"] == req.request_id


class TestVolunteersMe:
    def test_returns_own_record(self, admin_client):
        client, user_id = _signup("me.volunteer@example.com")
        volunteer = _make_volunteer(user_id)

        response = client.get("/api/volunteers/me")
        assert response.status_code == 200, response.text
        assert response.json()["volunteer_id"] == volunteer.volunteer_id

    def test_404_when_no_volunteer_profile(self, admin_client):
        client, _ = _signup("me.novolunteer@example.com")
        response = client.get("/api/volunteers/me")
        assert response.status_code == 404


class TestInvalidTransitions:
    def test_cannot_jump_available_to_completed(self, admin_client):
        task = _make_task(status=TaskLifecycle.AVAILABLE)
        response = admin_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "completed"})
        assert response.status_code == 400

    def test_cannot_transition_out_of_terminal_state(self, admin_client):
        task = _make_task(status=TaskLifecycle.COMPLETED)
        response = admin_client.patch(f"/api/tasks/{task.task_id}/status", json={"status": "in_progress"})
        assert response.status_code == 400


class TestUnauthorizedAccess:
    def test_verify_pickup_requires_auth(self, admin_client):
        task = _make_task()
        anon = TestClient(app)
        response = anon.post(f"/api/tasks/{task.task_id}/verify-pickup", json={"code": "000000"})
        assert response.status_code in (401, 403)

    def test_telemetry_requires_auth(self, admin_client):
        task = _make_task()
        anon = TestClient(app)
        response = anon.post(f"/api/tasks/{task.task_id}/telemetry", json={"lat": 1.0, "lng": 2.0})
        assert response.status_code in (401, 403)
