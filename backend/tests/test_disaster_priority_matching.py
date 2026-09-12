"""Tests for feature/disaster-priority-matching: when accepted volunteers
are scarce, the most urgent disaster need must be served first regardless of
the order needs happen to be listed in.
"""

from src.engines.planning_engine import PlanningEngine
from src.models import DisasterEvent, DisasterNeed, TaskPriority, Volunteer


def _volunteer(volunteer_id="vol_1", zone="south"):
    return Volunteer(
        volunteer_id=volunteer_id,
        user_id=f"user_{volunteer_id}",
        name="Test Volunteer",
        verified=True,
        phone_verified=True,
        skills=["food_delivery", "logistics"],
        max_carry_capacity=50,
        last_known_zone=zone,
        current_task_count=0,
    )


def _disaster_with_needs(*needs):
    return DisasterEvent(
        disaster_id="disaster_priority_test",
        type="flood",
        title="Priority test flood",
        affected_zones=["south"],
        region="south",
        severity=TaskPriority.HIGH,
        created_by="admin",
        needs=list(needs),
    )


class TestDisasterPriorityMatching:
    def test_critical_need_served_before_low_need_even_if_listed_later(self):
        low_need = DisasterNeed(
            need_id="need_low",
            disaster_id="disaster_priority_test",
            category="pantry_delivery",
            quantity=5,
            priority=TaskPriority.LOW,
            location={"zone": "south"},
            required_capacity=5,
        )
        critical_need = DisasterNeed(
            need_id="need_critical",
            disaster_id="disaster_priority_test",
            category="water_distribution",
            quantity=10,
            priority=TaskPriority.CRITICAL,
            location={"zone": "south"},
            required_capacity=10,
        )
        # LOW is listed first, CRITICAL second - the fix must not depend on
        # list order.
        disaster = _disaster_with_needs(low_need, critical_need)

        only_volunteer = _volunteer()
        engine = PlanningEngine()
        tasks = engine.create_disaster_tasks(disaster, [only_volunteer])

        assert len(tasks) == 2
        critical_task = next(t for t in tasks if t.need_id == "need_critical")
        low_task = next(t for t in tasks if t.need_id == "need_low")

        assert critical_task.volunteer_id == only_volunteer.volunteer_id
        assert critical_task.status.value in ("assigned", "needs_attention")
        # The LOW task never got a volunteer - the only one was scarce and
        # went to the CRITICAL need instead.
        assert not low_task.volunteer_id

    def test_needs_processed_in_priority_order_with_enough_volunteers(self):
        """Sanity check: when supply isn't scarce, both still get assigned -
        priority ordering shouldn't break the normal-supply case."""

        high_need = DisasterNeed(
            need_id="need_high",
            disaster_id="disaster_priority_test",
            category="food_delivery",
            quantity=5,
            priority=TaskPriority.HIGH,
            location={"zone": "south"},
            required_capacity=5,
        )
        medium_need = DisasterNeed(
            need_id="need_medium",
            disaster_id="disaster_priority_test",
            category="food_delivery",
            quantity=5,
            priority=TaskPriority.MEDIUM,
            location={"zone": "south"},
            required_capacity=5,
        )
        disaster = _disaster_with_needs(medium_need, high_need)

        volunteers = [_volunteer("vol_1"), _volunteer("vol_2")]
        engine = PlanningEngine()
        tasks = engine.create_disaster_tasks(disaster, volunteers)

        assert len(tasks) == 2
        assigned_ids = {t.volunteer_id for t in tasks if t.volunteer_id}
        assert assigned_ids == {"vol_1", "vol_2"}
