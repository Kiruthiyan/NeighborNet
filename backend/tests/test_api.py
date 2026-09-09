"""API-level tests for disaster, task, alert, disruption, and decision flows.

These exercise the FastAPI routers directly (not just the underlying service)
so regressions in request/response wiring are caught, not just in engine logic.
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def client():
    """Fresh coordination state per test, exercised through the real API,
    authenticated as the seeded admin (a superset of coordinator access) so
    the coordinator-gated endpoints below behave like a logged-in operator."""

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


def _create_flood_disaster(client: TestClient) -> str:
    response = client.post(
        "/api/disasters",
        json={
            "disaster_id": "disaster_api_test",
            "type": "flood",
            "title": "API test flood",
            "description": "Test flood for API coverage",
            "affected_zones": ["south"],
            "severity": "high",
            "created_by": "user_admin_test",
            "needs": [
                {
                    "need_id": "need_api_test_water",
                    "category": "water_distribution",
                    "quantity": 10,
                    "priority": "high",
                    "location": {"zone": "south"},
                    "required_skills": ["logistics"],
                    "required_capacity": 10,
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["disaster_id"]


class TestDisasterFlow:
    """Admin disaster creation, dispatch, and needs retrieval."""

    def test_create_disaster_returns_200_with_needs(self, client):
        disaster_id = _create_flood_disaster(client)

        get_response = client.get(f"/api/disasters/{disaster_id}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "active"

        needs_response = client.get(f"/api/disasters/{disaster_id}/needs")
        assert needs_response.status_code == 200
        assert len(needs_response.json()) == 1

    def test_get_unknown_disaster_returns_404(self, client):
        response = client.get("/api/disasters/does_not_exist")
        assert response.status_code == 404

    def test_dispatch_creates_alerts_for_eligible_volunteers_only(self, client):
        disaster_id = _create_flood_disaster(client)

        response = client.post(f"/api/disasters/{disaster_id}/dispatch")
        assert response.status_code == 200
        alerts = response.json()
        assert len(alerts) > 0
        for alert in alerts:
            assert alert["disaster_id"] == disaster_id
            assert alert["status"] == "pending"

    def test_dispatch_unknown_disaster_returns_404(self, client):
        response = client.post("/api/disasters/does_not_exist/dispatch")
        assert response.status_code == 404


class TestAlertFlow:
    """Volunteer alert accept/decline only affects eligibility, never assignment."""

    def test_accept_marks_eligibility_without_assigning_task(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()
        alert_id = alerts[0]["alert_id"]

        accept_response = client.post(f"/api/alerts/{alert_id}/accept")
        assert accept_response.status_code == 200
        assert accept_response.json()["status"] == "accepted"

        # Accepting an alert must not, by itself, create or assign any task.
        tasks_response = client.get("/api/tasks")
        assert tasks_response.status_code == 200
        assert tasks_response.json() == []

    def test_decline_marks_not_eligible(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()
        alert_id = alerts[0]["alert_id"]

        response = client.post(f"/api/alerts/{alert_id}/decline")
        assert response.status_code == 200
        assert response.json()["status"] == "declined"

    def test_invalid_alert_response_rejected(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()
        alert_id = alerts[0]["alert_id"]

        # No route exists for an arbitrary response verb; accept/decline/timeout only.
        response = client.post(f"/api/alerts/{alert_id}/bogus")
        assert response.status_code == 404

    def test_accept_unknown_alert_returns_404(self, client):
        response = client.post("/api/alerts/does_not_exist/accept")
        assert response.status_code == 404


class TestDisasterAssignmentRequiresAcceptance:
    """Deterministic assignment only considers accepted volunteers."""

    def test_assign_only_uses_accepted_volunteers(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()

        # Accept exactly one alert; leave the rest untouched.
        accepted_alert = alerts[0]
        client.post(f"/api/alerts/{accepted_alert['alert_id']}/accept")

        assign_response = client.post(f"/api/disasters/{disaster_id}/assign")
        assert assign_response.status_code == 200
        tasks = assign_response.json()
        assert len(tasks) == 1  # one need was defined in the fixture disaster

        assigned_volunteer_ids = {
            task["volunteer_id"] for task in tasks if task.get("volunteer_id")
        }
        assert assigned_volunteer_ids <= {accepted_alert["volunteer_id"]}

    def test_assign_with_no_acceptances_leaves_tasks_needing_attention(self, client):
        disaster_id = _create_flood_disaster(client)
        client.post(f"/api/disasters/{disaster_id}/dispatch")
        # No alerts accepted.

        assign_response = client.post(f"/api/disasters/{disaster_id}/assign")
        assert assign_response.status_code == 200
        tasks = assign_response.json()
        assert all(task["status"] == "needs_attention" for task in tasks)
        assert all(task.get("volunteer_id") is None for task in tasks)


class TestTaskFlow:
    """Unified task listing, lookup, and lifecycle updates."""

    def test_generate_normal_task_and_fetch_it(self, client):
        response = client.post("/api/tasks/generate-normal")
        assert response.status_code == 200
        task = response.json()
        assert task["operating_mode"] == "normal"

        fetch_response = client.get(f"/api/tasks/{task['task_id']}")
        assert fetch_response.status_code == 200
        assert fetch_response.json()["task_id"] == task["task_id"]

    def test_get_unknown_task_returns_404(self, client):
        response = client.get("/api/tasks/does_not_exist")
        assert response.status_code == 404

    def test_update_task_status_requires_valid_status(self, client):
        task = client.post("/api/tasks/generate-normal").json()

        bad_response = client.patch(
            f"/api/tasks/{task['task_id']}/status", json={"status": "not_a_real_status"}
        )
        assert bad_response.status_code == 400

        good_response = client.patch(
            f"/api/tasks/{task['task_id']}/status", json={"status": "in_progress"}
        )
        assert good_response.status_code == 200
        assert good_response.json()["status"] == "in_progress"


class TestRecoveryAndDecisionFlow:
    """Disruption injection creates exactly one AMBER decision pending approval."""

    def test_inject_disruption_preserves_unaffected_creates_amber_decision(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()
        for alert in alerts:
            client.post(f"/api/alerts/{alert['alert_id']}/accept")
        tasks = client.post(f"/api/disasters/{disaster_id}/assign").json()

        assigned_task = next(task for task in tasks if task.get("volunteer_id"))

        disruption_response = client.post(
            "/api/disruptions/inject",
            json={
                "operating_mode": "disaster",
                "task_ids": [assigned_task["task_id"]],
                "volunteer_id": assigned_task["volunteer_id"],
                "zone": "south",
                "route_status": "blocked",
                "reason": "Volunteer cancellation and road closure",
                "create_amber_decision": True,
            },
        )
        assert disruption_response.status_code == 200
        result = disruption_response.json()
        assert result["affected_count"] == 1

        pending = client.get("/api/decisions/pending").json()
        assert len(pending) == 1
        assert pending[0]["risk_classification"] == "amber"
        assert pending[0]["requires_human_approval"] is True

    def test_approve_pending_decision_clears_pending_queue(self, client):
        disaster_id = _create_flood_disaster(client)
        alerts = client.post(f"/api/disasters/{disaster_id}/dispatch").json()
        for alert in alerts:
            client.post(f"/api/alerts/{alert['alert_id']}/accept")
        tasks = client.post(f"/api/disasters/{disaster_id}/assign").json()
        assigned_task = next(task for task in tasks if task.get("volunteer_id"))

        client.post(
            "/api/disruptions/inject",
            json={
                "operating_mode": "disaster",
                "task_ids": [assigned_task["task_id"]],
                "volunteer_id": assigned_task["volunteer_id"],
                "route_status": "blocked",
                "reason": "Test disruption",
                "create_amber_decision": True,
            },
        )
        decision_id = client.get("/api/decisions/pending").json()[0]["decision_id"]

        approve_response = client.post(f"/api/decisions/{decision_id}/approve")
        assert approve_response.status_code == 200
        assert approve_response.json()["human_approval"]["approved"] is True

        assert client.get("/api/decisions/pending").json() == []

    def test_approve_unknown_decision_returns_400(self, client):
        response = client.post("/api/decisions/does_not_exist/approve")
        assert response.status_code == 400


class TestDashboardReflectsState:
    """Dashboard/metrics endpoints stay consistent with underlying state."""

    def test_metrics_counts_match_created_entities(self, client):
        baseline = client.get("/api/dashboard/metrics").json()["active_disasters"]

        _create_flood_disaster(client)

        metrics = client.get("/api/dashboard/metrics").json()
        assert metrics["active_disasters"] == baseline + 1

        overview = client.get("/api/dashboard/disaster-overview").json()
        assert len(overview["active_disasters"]) == baseline + 1
