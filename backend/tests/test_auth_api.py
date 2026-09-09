"""Tests for signup/login/me, capability self-toggle, admin CRUD, and invites."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def client():
    service = get_coordination_service()
    service.reset()
    return TestClient(app)


def _signup(client: TestClient, email: str, name: str = "Test User", password: str = "s3curePassw0rd", invite_token: str = None):
    payload = {"name": name, "email": email, "password": password}
    if invite_token:
        payload["invite_token"] = invite_token
    return client.post("/api/auth/signup", json=payload)


def _login_as_admin(client: TestClient) -> str:
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@neighbornet.org", "password": DEFAULT_DEMO_PASSWORD},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


class TestSignupLoginMe:
    def test_signup_creates_recipient_only_user(self, client):
        response = _signup(client, "newperson@example.com")
        assert response.status_code == 201, response.text
        body = response.json()
        assert body["user"]["account_type"] == "user"
        assert body["user"]["is_admin"] is False
        assert body["user"]["is_coordinator"] is False
        assert body["user"]["is_donor"] is False
        assert body["user"]["is_volunteer"] is False

    def test_signup_duplicate_email_rejected(self, client):
        _signup(client, "dupe@example.com")
        response = _signup(client, "dupe@example.com")
        assert response.status_code == 409

    def test_login_wrong_password_rejected(self, client):
        _signup(client, "someone@example.com", password="correct-horse-battery")
        response = client.post(
            "/api/auth/login",
            json={"email": "someone@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    def test_me_requires_auth(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code == 401

    def test_me_returns_current_profile(self, client):
        signup = _signup(client, "profile@example.com")
        token = signup.json()["access_token"]
        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["email"] == "profile@example.com"


class TestCapabilitySelfToggle:
    def test_can_self_toggle_donor_and_volunteer(self, client):
        signup = _signup(client, "toggler@example.com")
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        response = client.patch(
            "/api/auth/me/capabilities",
            json={"is_donor": True, "is_volunteer": True},
            headers=headers,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["is_donor"] is True
        assert body["is_volunteer"] is True
        assert body["is_coordinator"] is False

    def test_cannot_self_toggle_coordinator(self, client):
        """The capability-update body has no is_coordinator field at all -
        it's rejected as an unknown field / simply ignored, and the
        capability never turns on."""
        signup = _signup(client, "wannabe-coordinator@example.com")
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        client.patch(
            "/api/auth/me/capabilities",
            json={"is_donor": True},
            headers=headers,
        )
        me = client.get("/api/auth/me", headers=headers).json()
        assert me["is_coordinator"] is False


class TestAdminUserManagement:
    def test_non_admin_cannot_list_users(self, client):
        signup = _signup(client, "regular@example.com")
        token = signup.json()["access_token"]
        response = client.get(
            "/api/admin/users", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403

    def test_admin_can_grant_coordinator(self, client):
        admin_token = _login_as_admin(client)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        signup = _signup(client, "future-coordinator@example.com")
        user_id = signup.json()["user"]["user_id"]

        response = client.patch(
            f"/api/admin/users/{user_id}",
            json={"is_coordinator": True},
            headers=admin_headers,
        )
        assert response.status_code == 200
        assert response.json()["is_coordinator"] is True

    def test_admin_can_delete_user(self, client):
        admin_token = _login_as_admin(client)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        signup = _signup(client, "to-delete@example.com")
        user_id = signup.json()["user"]["user_id"]

        delete_response = client.delete(
            f"/api/admin/users/{user_id}", headers=admin_headers
        )
        assert delete_response.status_code == 204

        users = client.get("/api/admin/users", headers=admin_headers).json()
        assert all(u["user_id"] != user_id for u in users)


class TestInvitations:
    def test_admin_can_invite_and_invitee_signs_up_with_granted_capability(self, client):
        admin_token = _login_as_admin(client)
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        invite_response = client.post(
            "/api/admin/invitations",
            json={"email": "invited-coordinator@example.com", "grant_coordinator": True},
            headers=admin_headers,
        )
        assert invite_response.status_code == 201
        invite = invite_response.json()
        assert invite["granted_capabilities"]["is_coordinator"] is True

        signup_response = _signup(
            client,
            "invited-coordinator@example.com",
            invite_token=invite["token"],
        )
        assert signup_response.status_code == 201
        assert signup_response.json()["user"]["is_coordinator"] is True

    def test_non_admin_cannot_create_invitation(self, client):
        signup = _signup(client, "plain-user@example.com")
        token = signup.json()["access_token"]
        response = client.post(
            "/api/admin/invitations",
            json={"email": "someone-else@example.com"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 403
