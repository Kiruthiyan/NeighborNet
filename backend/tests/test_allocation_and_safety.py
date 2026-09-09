"""Regression tests for the P0/P1 fixes: real allocation bookkeeping,
capacity-limited volunteer assignment, the AMBER approval gate, and
authorization on previously-open mutating endpoints."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def client():
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


def _clear_inventory_and_requests() -> None:
    """Seed data ships with plenty of its own matchable inventory/requests,
    which would otherwise satisfy generate-normal before the test's own
    controlled donation/request is reached. Clearing makes matching
    deterministic for these tests."""

    service = get_coordination_service()
    service.state.inventory.clear()
    service.state.requests.clear()


def _donate(client: TestClient, quantity: int = 10, **overrides) -> dict:
    payload = {
        "resource_type": "pantry_item",
        "quantity_available": quantity,
        "description": "Canned soup",
        "unit": "cans",
        "donor_org_id": "org_test_donor",
        "location_id": "org_test_donor",
        **overrides,
    }
    response = client.post("/api/inventory", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def _request(client: TestClient, quantity: int = 10, **overrides) -> dict:
    payload = {
        "resource_type": "pantry_item",
        "quantity_requested": quantity,
        "requesting_org_id": "org_test_recipient",
        **overrides,
    }
    response = client.post("/api/requests", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


class TestAllocationFlow:
    """Flow 1: donor -> request -> matching -> allocation persisted."""

    def test_matching_persists_allocation_and_decrements_quantities(self, client):
        _clear_inventory_and_requests()
        batch = _donate(client, quantity=10)
        request = _request(client, quantity=6)

        task_response = client.post("/api/tasks/generate-normal")
        assert task_response.status_code == 200, task_response.text
        task = task_response.json()
        assert task["quantity"] == 6
        assert task["allocation_ids"]

        updated_batch = next(
            b for b in client.get("/api/inventory").json() if b["batch_id"] == batch["batch_id"]
        )
        updated_request = next(
            r for r in client.get("/api/requests").json() if r["request_id"] == request["request_id"]
        )
        assert updated_batch["quantity_allocated"] == 6
        assert updated_request["quantity_fulfilled"] == 6
        assert updated_request["status"] == "fulfilled"

    def test_repeat_call_does_not_rematch_same_supply(self, client):
        """Flow 2 (over-allocation): once a batch/request pair is fully
        matched, a second call must not match it again."""

        _clear_inventory_and_requests()
        _donate(client, quantity=5)
        _request(client, quantity=5)

        first = client.post("/api/tasks/generate-normal")
        assert first.status_code == 200

        second = client.post("/api/tasks/generate-normal")
        assert second.status_code == 409

    def test_partial_allocation_leaves_request_partially_fulfilled(self, client):
        _clear_inventory_and_requests()
        _donate(client, quantity=3)
        request = _request(client, quantity=10)

        task = client.post("/api/tasks/generate-normal").json()
        assert task["quantity"] == 3

        updated_request = next(
            r for r in client.get("/api/requests").json() if r["request_id"] == request["request_id"]
        )
        assert updated_request["quantity_fulfilled"] == 3
        assert updated_request["status"] == "partially_fulfilled"


class TestExpiryAndAvailability:
    """Flow 3: expired inventory must never be allocated."""

    def test_expired_batch_is_never_matched(self, client):
        _clear_inventory_and_requests()
        past = (datetime.now() - timedelta(days=1)).isoformat()
        _donate(client, quantity=10, expiry_datetime=past)
        _request(client, quantity=5)

        response = client.post("/api/tasks/generate-normal")
        assert response.status_code == 409


class TestDonationAndRequestValidation:
    def test_donation_requires_positive_quantity(self, client):
        response = client.post(
            "/api/inventory",
            json={
                "resource_type": "pantry_item",
                "quantity_available": 0,
                "description": "Nothing",
                "donor_org_id": "org_x",
                "location_id": "org_x",
            },
        )
        assert response.status_code == 400

    def test_request_requires_positive_quantity(self, client):
        response = client.post(
            "/api/requests",
            json={"resource_type": "pantry_item", "quantity_requested": 0},
        )
        assert response.status_code == 400

    def test_donation_requires_donor_capability(self, client):
        signup = client.post(
            "/api/auth/signup",
            json={"name": "Plain User", "email": "plainuser@example.com", "password": "s3curePassw0rd"},
        )
        token = signup.json()["access_token"]
        response = client.post(
            "/api/inventory",
            json={
                "resource_type": "pantry_item",
                "quantity_available": 5,
                "description": "Rice",
                "donor_org_id": "org_x",
                "location_id": "org_x",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403


class TestVolunteerCapacity:
    """Flow 4: a volunteer cannot receive unlimited active assignments."""

    def test_volunteer_with_active_task_is_not_matched_again(self, client):
        service = get_coordination_service()
        volunteer = service.state.volunteers[0]
        volunteer.current_task_count = 1
        volunteer.availability_status = "available"

        from src.engines.volunteer_matcher import VolunteerMatcher
        from src.models import CoordinationTask

        task = CoordinationTask(
            title="Test delivery",
            description="Test",
            required_skills=[],
            required_capacity=0,
        )
        match = VolunteerMatcher().score(volunteer, task)
        assert match.score == 0.0

    def test_task_completion_releases_volunteer_capacity(self, client):
        _donate(client, quantity=5)
        _request(client, quantity=5)
        task = client.post("/api/tasks/generate-normal").json()
        volunteer_id = task.get("volunteer_id")
        if not volunteer_id:
            pytest.skip("no volunteer available in seed data for this match")

        service = get_coordination_service()
        volunteer = next(v for v in service.state.volunteers if v.volunteer_id == volunteer_id)
        assert volunteer.current_task_count == 1

        complete = client.patch(f"/api/tasks/{task['task_id']}/status", json={"status": "completed"})
        assert complete.status_code == 200
        assert volunteer.current_task_count == 0
        assert volunteer.availability_status == "available"


class TestAmberApprovalGate:
    """Flow 7: AMBER action must not mutate state until approved, and must
    execute exactly once."""

    def _disrupt(self, client: TestClient) -> tuple[str, str]:
        disaster = client.post(
            "/api/disasters",
            json={
                "type": "flood",
                "title": "Amber gate test flood",
                "affected_zones": ["south"],
                "needs": [
                    {
                        "need_id": "need_amber_test",
                        "category": "food_delivery",
                        "quantity": 5,
                        "required_capacity": 5,
                    }
                ],
            },
        ).json()
        alerts = client.post(f"/api/disasters/{disaster['disaster_id']}/dispatch").json()
        for alert in alerts:
            client.post(f"/api/alerts/{alert['alert_id']}/accept")
        tasks = client.post(f"/api/disasters/{disaster['disaster_id']}/assign").json()
        assigned = next((t for t in tasks if t.get("volunteer_id")), None)
        if assigned is None:
            pytest.skip("no volunteer assigned in seed data for this disaster")

        before_task_count = len(client.get("/api/tasks").json())
        response = client.post(
            "/api/disruptions/inject",
            json={
                "operating_mode": "disaster",
                "task_ids": [assigned["task_id"]],
                "volunteer_id": assigned["volunteer_id"],
                "reason": "Amber gate test disruption",
                "create_amber_decision": True,
            },
        )
        assert response.status_code == 200
        return assigned["task_id"], before_task_count

    def test_state_unchanged_until_approved(self, client):
        original_task_id, before_task_count = self._disrupt(client)

        # No new task, and the original task must still be ASSIGNED, not
        # SUPERSEDED - the reassignment must not have happened yet.
        after_task_count = len(client.get("/api/tasks").json())
        assert after_task_count == before_task_count

        original = client.get(f"/api/tasks/{original_task_id}").json()
        assert original["status"] != "superseded"

    def test_approval_applies_plan_exactly_once(self, client):
        original_task_id, before_task_count = self._disrupt(client)
        decision_id = client.get("/api/decisions/pending").json()[0]["decision_id"]

        approve = client.post(f"/api/decisions/{decision_id}/approve")
        assert approve.status_code == 200

        after_task_count = len(client.get("/api/tasks").json())
        assert after_task_count == before_task_count + 1

        original = client.get(f"/api/tasks/{original_task_id}").json()
        assert original["status"] == "superseded"

        # Re-approving the same (already-decided) decision must not apply
        # the plan again.
        second_approve = client.post(f"/api/decisions/{decision_id}/approve")
        assert second_approve.status_code == 400
        assert len(client.get("/api/tasks").json()) == after_task_count


class TestAuthorizationOnMutatingEndpoints:
    """Flow 9: unauthenticated/unauthorized callers cannot mutate protected
    state."""

    def test_inject_disruption_requires_coordinator(self):
        anon = TestClient(app)
        response = anon.post("/api/disruptions/inject", json={"task_ids": []})
        assert response.status_code == 401

    def test_generate_normal_task_requires_coordinator(self):
        anon = TestClient(app)
        response = anon.post("/api/tasks/generate-normal")
        assert response.status_code == 401

    def test_task_status_update_requires_auth(self):
        anon = TestClient(app)
        response = anon.patch("/api/tasks/some_task_id/status", json={"status": "completed"})
        assert response.status_code == 401

    def test_alert_timeout_requires_coordinator(self):
        anon = TestClient(app)
        response = anon.post("/api/alerts/some_alert_id/timeout")
        assert response.status_code == 401

    def test_regular_user_cannot_accept_someone_elses_alert(self, client):
        service = get_coordination_service()
        service.reset()
        signup = client.post(
            "/api/auth/signup",
            json={"name": "Random User", "email": "randomuser@example.com", "password": "s3curePassw0rd"},
        )
        token = signup.json()["access_token"]

        disaster = client.post(
            "/api/disasters",
            json={"type": "flood", "title": "Auth test flood", "affected_zones": ["south"]},
        ).json()
        alerts = client.post(f"/api/disasters/{disaster['disaster_id']}/dispatch").json()
        if not alerts:
            pytest.skip("no volunteers eligible in seed data")

        anon = TestClient(app)
        anon.headers["Authorization"] = f"Bearer {token}"
        response = anon.post(f"/api/alerts/{alerts[0]['alert_id']}/accept")
        assert response.status_code == 403


class TestDisasterAssignIdempotent:
    """Flow 5/6: repeated assignment for the same disaster must not
    duplicate tasks."""

    def test_assign_twice_does_not_duplicate_tasks(self, client):
        disaster = client.post(
            "/api/disasters",
            json={
                "type": "flood",
                "title": "Idempotency test flood",
                "affected_zones": ["south"],
                "needs": [
                    {"need_id": "need_idem_1", "category": "food_delivery", "quantity": 5}
                ],
            },
        ).json()
        alerts = client.post(f"/api/disasters/{disaster['disaster_id']}/dispatch").json()
        for alert in alerts:
            client.post(f"/api/alerts/{alert['alert_id']}/accept")

        first = client.post(f"/api/disasters/{disaster['disaster_id']}/assign").json()
        second = client.post(f"/api/disasters/{disaster['disaster_id']}/assign").json()

        assert len(second) == 0
        all_tasks = [t for t in client.get("/api/tasks").json() if t["disaster_id"] == disaster["disaster_id"]]
        assert len(all_tasks) == len(first)
