"""Deterministic volunteer scoring for normal and disaster tasks."""

from dataclasses import dataclass
from typing import Iterable, List, Optional, Set

from src.models import CoordinationTask, Volunteer


@dataclass
class VolunteerMatch:
    """Volunteer score and evidence."""

    volunteer: Volunteer
    score: float
    reasons: List[str]


class VolunteerMatcher:
    """Score volunteers without LLM capacity/safety decisions."""

    def score(
        self,
        volunteer: Volunteer,
        task: CoordinationTask,
        restricted_zones: Optional[Set[str]] = None,
    ) -> VolunteerMatch:
        """Score one volunteer for one task.

        `restricted_zones` is the system-wide set of zones currently under
        movement restriction (lockdown/quarantine/closed roads - see
        CoordinationService.restricted_zones), separate from a volunteer's
        own `travel_restricted`/`restricted_zones`. Either kind of
        restriction disqualifies the volunteer for a task in that zone
        regardless of distance - this is what lets a farther-away but
        authorized volunteer be selected over a nearer but restricted one.
        """

        score = 0.0
        reasons: List[str] = []

        if not volunteer.is_available_for_assignment:
            return VolunteerMatch(volunteer, 0.0, ["Volunteer unavailable"])

        if not volunteer.verified:
            return VolunteerMatch(volunteer, 0.0, ["Volunteer not verified"])

        if volunteer.travel_restricted:
            return VolunteerMatch(volunteer, 0.0, ["Volunteer is under a personal movement restriction"])

        task_zone_for_restriction = None
        if task.destination:
            task_zone_for_restriction = task.destination.get("zone")
        if not task_zone_for_restriction and task.affected_zones:
            task_zone_for_restriction = task.affected_zones[0]

        if task_zone_for_restriction:
            if task_zone_for_restriction in volunteer.restricted_zones:
                return VolunteerMatch(
                    volunteer, 0.0, [f"Volunteer is not authorized to enter zone '{task_zone_for_restriction}'"]
                )
            if restricted_zones and task_zone_for_restriction in restricted_zones:
                return VolunteerMatch(
                    volunteer, 0.0, [f"Zone '{task_zone_for_restriction}' is under movement restriction"]
                )

        if task.required_capacity and volunteer.max_carry_capacity:
            if volunteer.max_carry_capacity < task.required_capacity:
                return VolunteerMatch(volunteer, 0.0, ["Insufficient carrying capacity"])
            score += 20
            reasons.append("Capacity fits")
        elif task.required_capacity:
            score += 5
            reasons.append("Capacity unknown")

        volunteer_skills = set(volunteer.skills or volunteer.special_skills)
        required_skills = set(task.required_skills)
        if required_skills:
            matched = required_skills.intersection(volunteer_skills)
            if not matched:
                return VolunteerMatch(volunteer, 0.0, ["Missing required skills"])
            score += 25 * (len(matched) / len(required_skills))
            reasons.append("Required skills match")

        task_zone = None
        if task.destination:
            task_zone = task.destination.get("zone")
        if not task_zone and task.affected_zones:
            task_zone = task.affected_zones[0]

        if task_zone:
            if task_zone == volunteer.last_known_zone:
                score += 20
                reasons.append("Volunteer already near task zone")
            elif task_zone in volunteer.preferred_zones:
                score += 12
                reasons.append("Task in preferred zone")
            elif volunteer.preferred_service_area == task_zone:
                score += 10
                reasons.append("Task in preferred service area")

        if volunteer.current_task_count >= 1:
            # Hard capacity cap: one active task at a time. Without this,
            # nothing stops the same volunteer being matched to unlimited
            # concurrent tasks across separate planning/assignment calls.
            return VolunteerMatch(volunteer, 0.0, ["Already assigned to an active task"])
        score += 15
        reasons.append("No current task load")

        if task.route_safe and task.route_status == "open":
            score += 15
            reasons.append("Route is feasible")

        score += min(5, volunteer.reliability_score * 5)
        return VolunteerMatch(volunteer, round(score, 2), reasons)

    def rank(
        self,
        volunteers: Iterable[Volunteer],
        task: CoordinationTask,
        restricted_zones: Optional[Set[str]] = None,
    ) -> List[VolunteerMatch]:
        """Rank volunteers by deterministic fit."""

        matches = [self.score(volunteer, task, restricted_zones) for volunteer in volunteers]
        return sorted(matches, key=lambda match: match.score, reverse=True)
