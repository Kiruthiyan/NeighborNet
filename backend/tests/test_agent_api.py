"""Tests for the Strands Agents SDK powered /api/agent endpoint.

The real Bedrock model call is monkeypatched out so this suite runs without
AWS credentials or network access. What's under test is the wiring: the
FastAPI endpoint calls into src.agents.strands_orchestrator.run_instruction,
handles success and failure, and never bypasses the tool layer's safety
posture (no RED-tier tool exists to call in the first place).
"""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


@pytest.fixture
def client():
    """Authenticated as the seeded admin - /api/agent/instruct is
    coordinator-gated (admins are a superset), same as the disaster/decision
    endpoints it drives under the hood."""

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


def test_agent_instruct_success(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    def fake_run_instruction(instruction: str, model_id: str | None = None) -> str:
        assert "flood" in instruction.lower()
        return "Created the flood disaster and alerted 8 nearby volunteers."

    monkeypatch.setattr(
        "src.agents.strands_orchestrator.run_instruction", fake_run_instruction
    )

    response = client.post(
        "/api/agent/instruct",
        json={"instruction": "A flood just hit the south zone, please respond."},
    )
    assert response.status_code == 200
    assert "flood" in response.json()["response"].lower()


def test_agent_instruct_surfaces_upstream_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    def fake_run_instruction(instruction: str, model_id: str | None = None) -> str:
        raise RuntimeError("no aws credentials configured")

    monkeypatch.setattr(
        "src.agents.strands_orchestrator.run_instruction", fake_run_instruction
    )

    response = client.post(
        "/api/agent/instruct",
        json={"instruction": "Summarize current disaster status."},
    )
    assert response.status_code == 502
    error = response.json()["error"].lower()
    # The client-facing message must stay generic and must never leak the
    # raw upstream exception text (which can contain AWS account/IAM details).
    assert "bedrock" in error
    assert "no aws credentials configured" not in error


def test_agent_instruct_requires_authentication():
    service = get_coordination_service()
    service.reset()
    anonymous_client = TestClient(app)

    response = anonymous_client.post(
        "/api/agent/instruct", json={"instruction": "Summarize current disaster status."}
    )
    assert response.status_code == 401


def test_agent_instruct_requires_coordinator(monkeypatch: pytest.MonkeyPatch):
    """A plain recipient account (no coordinator capability) must be
    rejected before the agent - and its tools - ever run."""

    service = get_coordination_service()
    service.reset()
    plain_client = TestClient(app)

    signup = plain_client.post(
        "/api/auth/signup",
        json={"name": "Plain User", "email": "plain@example.com", "password": "s3curePassw0rd"},
    )
    assert signup.status_code == 201
    token = signup.json()["access_token"]

    def fail_if_called(instruction: str, model_id: str | None = None) -> str:
        raise AssertionError("run_instruction must not be reached for a non-coordinator")

    monkeypatch.setattr("src.agents.strands_orchestrator.run_instruction", fail_if_called)

    response = plain_client.post(
        "/api/agent/instruct",
        json={"instruction": "Summarize current disaster status."},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_strip_thinking_removes_reasoning_tags():
    from src.agents.strands_orchestrator import _strip_thinking

    raw = "<thinking>internal reasoning here</thinking> Created the disaster and alerted 8 volunteers."
    assert _strip_thinking(raw) == "Created the disaster and alerted 8 volunteers."
    assert _strip_thinking("No tags here.") == "No tags here."


def test_agent_tools_have_no_red_tier_actions():
    """The tool list itself is the safety boundary: there must be no tool
    that could perform a RED action (medical/evacuation/rescue/unsafe
    travel/restricted-zone entry)."""

    from src.agents.strands_tools import ALL_TOOLS

    red_keywords = ["evacuat", "medical", "rescue", "restricted_zone"]
    tool_names = [t.tool_name for t in ALL_TOOLS]
    for name in tool_names:
        for keyword in red_keywords:
            assert keyword not in name.lower()


def test_agent_tools_assignment_requires_explicit_call():
    """alert_nearby_volunteers and assign_accepted_volunteers must remain
    separate tools, so acceptance alone can never assign a task."""

    from src.agents.strands_tools import ALL_TOOLS

    tool_names = {t.tool_name for t in ALL_TOOLS}
    assert "alert_nearby_volunteers" in tool_names
    assert "assign_accepted_volunteers" in tool_names
