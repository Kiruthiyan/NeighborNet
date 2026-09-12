"""Tests for feature/resource-allocation (+ partial fulfillment): safe
normal-mode matching, ownership-gated cancellation, and invalid-state-
transition guards on inventory batches and community requests.
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


def _signup(admin_client, email, name="Test User"):
    """A fresh plain user, given donor+volunteer capability so it can both
    donate and request (mirrors how a real resident would use the app)."""

    test_client = TestClient(app)
    signup = test_client.post(
        "/api/auth/signup",
        json={"name": name, "email": email, "password": "TestPass123!"},
    )
    assert signup.status_code == 201, signup.text
    test_client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
    test_client.patch("/api/auth/me/capabilities", json={"is_donor": True, "is_volunteer": True})
    return test_client


@pytest.fixture
def donor_a(admin_client):
    return _signup(admin_client, "donor.a@example.com", "Donor A")


@pytest.fixture
def donor_b(admin_client):
    return _signup(admin_client, "donor.b@example.com", "Donor B")


@pytest.fixture
def requester_a(admin_client):
    return _signup(admin_client, "requester.a@example.com", "Requester A")


@pytest.fixture
def requester_b(admin_client):
    return _signup(admin_client, "requester.b@example.com", "Requester B")


def _donate(client, quantity, resource_type="equipment"):
    response = client.post(
        "/api/resources",
        json={"quantity_available": quantity, "resource_type": resource_type, "unit": "meals"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _request(client, quantity, resource_type="equipment"):
    response = client.post(
        "/api/requests",
        json={"quantity_requested": quantity, "resource_type": resource_type},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _generate_all_normal_tasks(admin_client, max_iterations=300):
    """Repeatedly call generate-normal until no more matches exist.

    Seed data (see seed_data.generate_seed_data) leaves its own genuine
    pending food/resource matches unconsumed for demo purposes, all sharing
    this same FIFO match queue - draining those takes far more than a
    handful of calls before this test's own (type-isolated) donation/request
    pair is ever reached."""

    tasks = []
    for _ in range(max_iterations):
        response = admin_client.post("/api/tasks/generate-normal")
        if response.status_code == 409:
            break
        assert response.status_code == 200, response.text
        tasks.append(response.json())
    return tasks


class TestResourceAllocationScenario1:
    """The plan's literal Scenario 1: 100 meals, requests 50/30/40 ->
    50 + 30 + 20 = 100 allocated, 20 unmet."""

    def test_partial_fulfillment_matches_plan_scenario(
        self, admin_client, donor_a, requester_a, requester_b
    ):
        _donate(donor_a, 100)
        req_a = _request(requester_a, 50)
        req_b = _request(requester_b, 30)
        req_c = _request(requester_a, 40)

        _generate_all_normal_tasks(admin_client)

        service = get_coordination_service()
        by_id = {r.request_id: r for r in service.state.requests}
        final_a = by_id[req_a["request_id"]]
        final_b = by_id[req_b["request_id"]]
        final_c = by_id[req_c["request_id"]]

        assert final_a.quantity_fulfilled == 50
        assert final_a.status.value == "fulfilled"
        assert final_b.quantity_fulfilled == 30
        assert final_b.status.value == "fulfilled"
        # Only 20 of the 100 remained for the third (40-unit) request.
        assert final_c.quantity_fulfilled == 20
        assert final_c.quantity_remaining == 20
        assert final_c.status.value == "partially_fulfilled"

        batch = service.state.inventory[-1]
        assert batch.quantity_allocated == 100
        assert batch.quantity_unallocated == 0
        # Never allow allocated > available.
        assert batch.quantity_allocated <= batch.quantity_available


class TestResourceAllocationValidation:
    def test_negative_donation_quantity_rejected(self, donor_a):
        response = donor_a.post(
            "/api/resources", json={"quantity_available": -5, "resource_type": "pantry_item"}
        )
        assert response.status_code == 400

    def test_zero_donation_quantity_rejected(self, donor_a):
        response = donor_a.post(
            "/api/resources", json={"quantity_available": 0, "resource_type": "pantry_item"}
        )
        assert response.status_code == 400

    def test_negative_request_quantity_rejected(self, requester_a):
        response = requester_a.post(
            "/api/requests", json={"quantity_requested": -1, "resource_type": "pantry_item"}
        )
        assert response.status_code == 400

    def test_zero_request_quantity_rejected(self, requester_a):
        response = requester_a.post(
            "/api/requests", json={"quantity_requested": 0, "resource_type": "pantry_item"}
        )
        assert response.status_code == 400


class TestInventoryCancellation:
    def test_owner_can_cancel_own_unallocated_batch(self, donor_a):
        batch = _donate(donor_a, 20)
        response = donor_a.post(f"/api/resources/{batch['batch_id']}/cancel")
        assert response.status_code == 200, response.text
        assert response.json()["batch"]["status"] == "cancelled"

    def test_other_donor_cannot_cancel(self, donor_a, donor_b):
        batch = _donate(donor_a, 20)
        response = donor_b.post(f"/api/resources/{batch['batch_id']}/cancel")
        assert response.status_code == 403

    def test_coordinator_can_cancel_any_batch(self, donor_a, admin_client):
        batch = _donate(donor_a, 20)
        response = admin_client.post(f"/api/resources/{batch['batch_id']}/cancel")
        assert response.status_code == 200, response.text

    def test_cannot_cancel_already_cancelled_batch(self, donor_a):
        batch = _donate(donor_a, 20)
        donor_a.post(f"/api/resources/{batch['batch_id']}/cancel")
        second = donor_a.post(f"/api/resources/{batch['batch_id']}/cancel")
        assert second.status_code == 409

    def test_cancel_unknown_batch_returns_404(self, donor_a):
        response = donor_a.post("/api/resources/does_not_exist/cancel")
        assert response.status_code == 404

    def test_cancelling_batch_with_active_task_triggers_recovery(
        self, admin_client, donor_a, requester_a
    ):
        _donate(donor_a, 50)
        _request(requester_a, 30)
        tasks = _generate_all_normal_tasks(admin_client)
        assert tasks, "expected at least one normal task to be created"

        service = get_coordination_service()
        batch_id = service.state.inventory[-1].batch_id

        response = donor_a.post(f"/api/resources/{batch_id}/cancel")
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["affected_task_ids"], "expected the in-flight task to be flagged"
        assert body["recovery_result"] is not None


class TestRequestCancellation:
    def test_owner_can_cancel_own_pending_request(self, requester_a):
        req = _request(requester_a, 10)
        response = requester_a.post(f"/api/requests/{req['request_id']}/cancel")
        assert response.status_code == 200, response.text
        assert response.json()["request"]["status"] == "cancelled"

    def test_other_requester_cannot_cancel(self, requester_a, requester_b):
        req = _request(requester_a, 10)
        response = requester_b.post(f"/api/requests/{req['request_id']}/cancel")
        assert response.status_code == 403

    def test_coordinator_can_cancel_any_request(self, requester_a, admin_client):
        req = _request(requester_a, 10)
        response = admin_client.post(f"/api/requests/{req['request_id']}/cancel")
        assert response.status_code == 200, response.text

    def test_cannot_cancel_already_cancelled_request(self, requester_a):
        req = _request(requester_a, 10)
        requester_a.post(f"/api/requests/{req['request_id']}/cancel")
        second = requester_a.post(f"/api/requests/{req['request_id']}/cancel")
        assert second.status_code == 409

    def test_cannot_cancel_fulfilled_request(self, admin_client, donor_a, requester_a):
        _donate(donor_a, 50)
        req = _request(requester_a, 10)
        _generate_all_normal_tasks(admin_client)

        service = get_coordination_service()
        updated = next(r for r in service.state.requests if r.request_id == req["request_id"])
        assert updated.status.value == "fulfilled"

        response = requester_a.post(f"/api/requests/{req['request_id']}/cancel")
        assert response.status_code == 409

    def test_cancel_unknown_request_returns_404(self, requester_a):
        response = requester_a.post("/api/requests/does_not_exist/cancel")
        assert response.status_code == 404
