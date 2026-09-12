"""Tests for feature/disaster-verification: the admin review step that
promotes a citizen report (see feature/disaster-reporting) from
PENDING_VALIDATION to ACTIVE, or rejects it.
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
        "description": "Fire is spreading fast, several homes affected.",
        "affected_zones": ["central"],
        "severity": "medium",
        "evidence": ["https://example.com/photo1.jpg"],
    }
    payload.update(overrides)
    response = client.post("/api/disasters/report", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


class TestDisasterVerification:
    def test_coordinator_can_verify_pending_report(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        response = admin_client.post(f"/api/disasters/{report['disaster_id']}/verify", json={})
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "active"
        assert body["reviewed_by"] is not None
        assert body["reviewed_at"] is not None

    def test_regular_user_cannot_verify(self, regular_user_client):
        report = _report(regular_user_client)
        response = regular_user_client.post(
            f"/api/disasters/{report['disaster_id']}/verify", json={}
        )
        assert response.status_code == 403

    def test_verify_can_correct_uncertain_severity(self, regular_user_client, admin_client):
        report = _report(regular_user_client, severity="medium")
        response = admin_client.post(
            f"/api/disasters/{report['disaster_id']}/verify",
            json={"severity": "critical", "notes": "Reassessed on scene"},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["severity"] == "critical"
        assert body["review_notes"] == "Reassessed on scene"

    def test_verified_disaster_can_now_be_dispatched(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        admin_client.post(f"/api/disasters/{report['disaster_id']}/verify", json={})
        dispatch = admin_client.post(f"/api/disasters/{report['disaster_id']}/dispatch")
        assert dispatch.status_code == 200, dispatch.text

    def test_reject_pending_report(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        response = admin_client.post(
            f"/api/disasters/{report['disaster_id']}/reject",
            json={"reason": "false_report", "notes": "Could not confirm on scene"},
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "rejected"
        assert body["rejection_reason"] == "false_report"
        assert body["reviewed_by"] is not None

    def test_reject_requires_nonempty_reason(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        response = admin_client.post(
            f"/api/disasters/{report['disaster_id']}/reject", json={"reason": ""}
        )
        assert response.status_code == 422

    def test_regular_user_cannot_reject(self, regular_user_client):
        report = _report(regular_user_client)
        response = regular_user_client.post(
            f"/api/disasters/{report['disaster_id']}/reject", json={"reason": "false_report"}
        )
        assert response.status_code == 403

    def test_cannot_reverify_already_active_disaster(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        admin_client.post(f"/api/disasters/{report['disaster_id']}/verify", json={})
        second = admin_client.post(f"/api/disasters/{report['disaster_id']}/verify", json={})
        assert second.status_code == 409

    def test_cannot_reject_already_rejected_disaster(self, regular_user_client, admin_client):
        report = _report(regular_user_client)
        admin_client.post(
            f"/api/disasters/{report['disaster_id']}/reject", json={"reason": "false_report"}
        )
        second = admin_client.post(
            f"/api/disasters/{report['disaster_id']}/reject", json={"reason": "false_report"}
        )
        assert second.status_code == 409

    def test_verify_unknown_disaster_returns_404(self, admin_client):
        response = admin_client.post("/api/disasters/does_not_exist/verify", json={})
        assert response.status_code == 404

    def test_pending_queue_lists_only_unreviewed_reports(self, regular_user_client, admin_client):
        pending = _report(regular_user_client, title="Still pending")
        approved = _report(regular_user_client, title="Will be approved", affected_zones=["north"])
        admin_client.post(f"/api/disasters/{approved['disaster_id']}/verify", json={})

        queue = admin_client.get("/api/disasters/pending")
        assert queue.status_code == 200
        ids = {item["disaster_id"] for item in queue.json()}
        assert pending["disaster_id"] in ids
        assert approved["disaster_id"] not in ids

    def test_pending_queue_is_coordinator_only(self, regular_user_client):
        response = regular_user_client.get("/api/disasters/pending")
        assert response.status_code == 403

    def test_public_list_hides_pending_and_rejected(self, regular_user_client, admin_client):
        pending = _report(regular_user_client, title="Unreviewed report")
        rejected = _report(regular_user_client, title="Will be rejected", affected_zones=["north"])
        admin_client.post(
            f"/api/disasters/{rejected['disaster_id']}/reject", json={"reason": "false_report"}
        )

        public_list = admin_client.get("/api/disasters")
        ids = {item["disaster_id"] for item in public_list.json()}
        assert pending["disaster_id"] not in ids
        assert rejected["disaster_id"] not in ids

    def test_rejecting_duplicate_merges_evidence_into_canonical(
        self, regular_user_client, admin_client
    ):
        first = _report(regular_user_client, evidence=["https://example.com/original.jpg"])
        duplicate = _report(
            regular_user_client,
            title="Same wildfire, second reporter",
            evidence=["https://example.com/corroborating.jpg"],
        )
        assert duplicate["is_duplicate"] is True
        assert duplicate["duplicate_of"] == first["disaster_id"]

        admin_client.post(
            f"/api/disasters/{duplicate['disaster_id']}/reject", json={"reason": "duplicate"}
        )

        canonical = admin_client.get(f"/api/disasters/{first['disaster_id']}").json()
        assert "https://example.com/corroborating.jpg" in canonical["evidence"]
