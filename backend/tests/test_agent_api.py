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


@pytest.fixture
def client():
    service = get_coordination_service()
    service.reset()
    return TestClient(app)


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
    assert "credentials" in response.json()["error"].lower()


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
