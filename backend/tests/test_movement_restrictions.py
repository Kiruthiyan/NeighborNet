"""Tests for feature/movement-restrictions: distance is not the same thing
as travel feasibility. A volunteer who is closer but restricted (personal
or zone-wide) must never be preferred over one who is farther but
authorized.
"""

import pytest
from fastapi.testclient import TestClient

from src.engines.volunteer_matcher import VolunteerMatcher
from src.main import app
from src.models import CoordinationTask, Volunteer
from src.services.coordination import get_coordination_service
from src.services.seed_data import DEFAULT_DEMO_PASSWORD


def _volunteer(volunteer_id, zone, **overrides):
    defaults = dict(
        volunteer_id=volunteer_id,
        user_id=f"user_{volunteer_id}",
        name=f"Volunteer {volunteer_id}",
        verified=True,
        phone_verified=True,
        skills=["food_delivery"],
        max_carry_capacity=50,
        last_known_zone=zone,
        current_task_count=0,
    )
    defaults.update(overrides)
    return Volunteer(**defaults)


def _task_for_zone(zone):
    return CoordinationTask(
        title="Deliver relief supplies",
        description="test",
        destination={"zone": zone},
        required_skills=["food_delivery"],
        required_capacity=10,
    )


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


class TestVolunteerLevelRestriction:
    def test_travel_restricted_volunteer_scores_zero(self):
        matcher = VolunteerMatcher()
        volunteer = _volunteer("vol_1", "south", travel_restricted=True)
        match = matcher.score(volunteer, _task_for_zone("south"))
        assert match.score == 0.0
        assert "restrict" in match.reasons[0].lower()

    def test_volunteer_restricted_from_specific_zone(self):
        matcher = VolunteerMatcher()
        volunteer = _volunteer("vol_1", "south", restricted_zones=["north"])
        # Restricted from "north" specifically, but this task is in "south" -
        # still eligible.
        match = matcher.score(volunteer, _task_for_zone("south"))
        assert match.score > 0

        blocked = matcher.score(volunteer, _task_for_zone("north"))
        assert blocked.score == 0.0

    def test_distance_does_not_override_restriction_scenario(self):
        """Plan's Scenario 6: nearest volunteer cannot travel, a farther one
        can - the farther, authorized volunteer must be the one selected."""

        matcher = VolunteerMatcher()
        near_but_restricted = _volunteer("vol_near", "south", travel_restricted=True)
        far_but_authorized = _volunteer("vol_far", "north")

        task = _task_for_zone("south")
        ranked = matcher.rank([near_but_restricted, far_but_authorized], task)

        best = next((m for m in ranked if m.score > 0), None)
        assert best is not None
        assert best.volunteer.volunteer_id == "vol_far"


class TestZoneWideRestriction:
    def test_system_restricted_zone_disqualifies_any_volunteer(self):
        matcher = VolunteerMatcher()
        volunteer = _volunteer("vol_1", "south")
        match = matcher.score(volunteer, _task_for_zone("south"), restricted_zones={"south"})
        assert match.score == 0.0

        # Unaffected in a different, unrestricted zone.
        unaffected = matcher.score(volunteer, _task_for_zone("north"), restricted_zones={"south"})
        assert unaffected.score >= 0


class TestZoneRestrictionApi:
    def test_coordinator_can_restrict_and_lift_a_zone(self, admin_client):
        response = admin_client.post(
            "/api/disruptions/zone-restrictions", json={"zone": "south", "restricted": True}
        )
        assert response.status_code == 200, response.text
        assert "south" in response.json()["restricted_zones"]

        listing = admin_client.get("/api/disruptions/zone-restrictions")
        assert "south" in listing.json()["restricted_zones"]

        lifted = admin_client.post(
            "/api/disruptions/zone-restrictions", json={"zone": "south", "restricted": False}
        )
        assert "south" not in lifted.json()["restricted_zones"]

    def test_non_coordinator_cannot_restrict_zone(self, admin_client):
        client = TestClient(app)
        signup = client.post(
            "/api/auth/signup",
            json={"name": "Resident", "email": "resident2@example.com", "password": "ResidentPass123!"},
        )
        client.headers["Authorization"] = f"Bearer {signup.json()['access_token']}"
        response = client.post(
            "/api/disruptions/zone-restrictions", json={"zone": "south", "restricted": True}
        )
        assert response.status_code == 403

    def test_restricting_zone_blocks_disaster_task_assignment_into_it(self, admin_client):
        """End-to-end: once a zone is restricted, assigning disaster tasks
        into it must not hand the task to a volunteer purely because they're
        the closest zone match - the restriction has to actually reach the
        matcher through the coordination/planning layers, not just exist as
        inert state."""

        admin_client.post(
            "/api/disruptions/zone-restrictions", json={"zone": "north", "restricted": True}
        )

        create_response = admin_client.post(
            "/api/disasters",
            json={
                "disaster_id": "disaster_movement_restriction_test",
                "type": "flood",
                "title": "Restriction test flood",
                "affected_zones": ["north"],
                "region": "north",
                "severity": "high",
                "created_by": "user_admin_test",
                "needs": [
                    {
                        "need_id": "need_restriction_test",
                        "category": "food_delivery",
                        "quantity": 5,
                        "priority": "high",
                        "location": {"zone": "north"},
                        "required_capacity": 5,
                    }
                ],
            },
        )
        assert create_response.status_code == 200, create_response.text
        disaster_id = create_response.json()["disaster_id"]

        admin_client.post(f"/api/disasters/{disaster_id}/dispatch")
        service = get_coordination_service()
        for alert in service.state.alerts:
            if alert.disaster_id == disaster_id:
                service.respond_to_alert(alert.alert_id, "accept")

        assign_response = admin_client.post(f"/api/disasters/{disaster_id}/assign")
        assert assign_response.status_code == 200, assign_response.text
        tasks = assign_response.json()
        assert tasks, "expected a task to be created for the need"
        # The zone is restricted, so no volunteer should have been assigned -
        # the task must be left NEEDS_ATTENTION rather than silently
        # dispatched into a locked-down zone.
        assert tasks[0]["volunteer_id"] is None
        assert tasks[0]["status"] == "needs_attention"
