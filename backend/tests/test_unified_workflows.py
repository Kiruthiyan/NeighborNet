"""Tests for unified Normal + Disaster MVP workflows."""

from fastapi.testclient import TestClient

from src.demo.scenario_runner import run_demo
from src.engines import RecoveryEngine, RiskClassifier, VolunteerMatcher
from src.main import app
from src.models import (
    CoordinationTask,
    DisasterEvent,
    OperatingMode,
    RiskClassification,
    TaskLifecycle,
    TaskPriority,
    Volunteer,
    VolunteerAlert,
)
from src.services.coordination import CoordinationService


def test_disaster_event_and_alert_models():
    """Disaster and alert models expose required MVP semantics."""

    disaster = DisasterEvent(
        disaster_id="disaster_test",
        type="flood",
        title="Flood in Zone B",
        affected_zones=["south"],
        severity=TaskPriority.HIGH,
        created_by="admin",
    )
    alert = VolunteerAlert(
        volunteer_id="vol_1",
        disaster_id=disaster.disaster_id,
        task_category="food_delivery",
        location="south",
        assistance_required="Deliver food packs",
    )

    alert.accept()

    assert disaster.is_active
    assert alert.is_eligible_response
    assert alert.status.value == "accepted"


def test_volunteer_matcher_scores_skill_capacity_workload():
    """Matcher uses deterministic factors and rejects missing skills."""

    task = CoordinationTask(
        operating_mode=OperatingMode.DISASTER,
        title="Water delivery",
        description="Deliver water",
        category="water_distribution",
        required_skills=["logistics"],
        required_capacity=30,
        affected_zones=["south"],
        destination={"zone": "south"},
    )
    good = Volunteer(
        user_id="user_1",
        name="Good Volunteer",
        skills=["logistics", "driving"],
        max_carry_capacity=40,
        last_known_zone="south",
        verified=True,
    )
    bad = Volunteer(
        user_id="user_2",
        name="Bad Volunteer",
        skills=["packing"],
        max_carry_capacity=40,
        last_known_zone="south",
        verified=True,
    )

    ranked = VolunteerMatcher().rank([bad, good], task)

    assert ranked[0].volunteer.volunteer_id == good.volunteer_id
    assert ranked[0].score > 0
    assert ranked[1].score == 0


def test_risk_classifier_blocks_red_disaster_actions():
    """RED safety categories never become autonomous actions."""

    decision = RiskClassifier().classify(
        {
            "operating_mode": "disaster",
            "title": "Medical evacuation",
            "description": "Enter restricted zone for treatment",
            "route_safe": True,
        }
    )

    assert decision.classification == RiskClassification.RED
    assert not decision.can_execute_autonomously


def test_recovery_preserves_unaffected_tasks():
    """Recovery only replaces affected task and marks others preserved."""

    service = CoordinationService()
    task_a = CoordinationTask(
        task_id="task_a",
        title="Task A",
        description="Affected",
        volunteer_id=service.state.volunteers[0].volunteer_id,
        required_skills=["food_delivery"],
        required_capacity=5,
        status=TaskLifecycle.ASSIGNED,
    )
    task_b = CoordinationTask(
        task_id="task_b",
        title="Task B",
        description="Unaffected",
        volunteer_id=service.state.volunteers[1].volunteer_id,
        required_skills=["food_delivery"],
        required_capacity=5,
        status=TaskLifecycle.ASSIGNED,
    )

    result = RecoveryEngine().recover_tasks(
        [task_a, task_b],
        service.state.volunteers,
        {"task_ids": ["task_a"], "volunteer_id": task_a.volunteer_id},
    )

    assert result["affected_count"] == 1
    assert result["preserved_count"] == 1
    assert result["preserved"][0].task_id == "task_b"
    assert result["repaired"][0].original_task_id == "task_a"


def test_combined_demo_runs_and_approves_amber():
    """Demo covers normal, disaster, recovery, and HITL approval."""

    result = run_demo()

    assert result["normal"]["task"].operating_mode == OperatingMode.NORMAL
    assert result["disaster"]["tasks"]
    assert result["recovery"]["recovery_report"]["repaired_count"] >= 1
    assert result["approved_decision"].risk_classification == RiskClassification.AMBER
    assert result["metrics"]["pending_human_decisions"] == 0


def test_api_smoke_dashboard_and_disaster_dispatch():
    """FastAPI exposes core unified workflow endpoints."""

    client = TestClient(app)

    readiness = client.get("/api/dashboard/readiness")
    disasters = client.get("/api/disasters")

    assert readiness.status_code == 200
    assert disasters.status_code == 200
    assert "active_requests" in readiness.json()
