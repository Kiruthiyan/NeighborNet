"""Deterministic volunteer scoring for normal and disaster tasks."""

from dataclasses import dataclass
from typing import Iterable, List

from src.models import CoordinationTask, Volunteer


@dataclass
class VolunteerMatch:
    """Volunteer score and evidence."""

    volunteer: Volunteer
    score: float
    reasons: List[str]


class VolunteerMatcher:
    """Score volunteers without LLM capacity/safety decisions."""

    def score(self, volunteer: Volunteer, task: CoordinationTask) -> VolunteerMatch:
        """Score one volunteer for one task."""

        score = 0.0
        reasons: List[str] = []

        if not volunteer.is_available_for_assignment:
            return VolunteerMatch(volunteer, 0.0, ["Volunteer unavailable"])

        if not volunteer.verified:
            return VolunteerMatch(volunteer, 0.0, ["Volunteer not verified"])

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

        if volunteer.current_task_count == 0:
            score += 15
            reasons.append("No current task load")
        else:
            score += max(0, 10 - volunteer.current_task_count * 3)
            reasons.append("Workload considered")

        if task.route_safe and task.route_status == "open":
            score += 15
            reasons.append("Route is feasible")

        score += min(5, volunteer.reliability_score * 5)
        return VolunteerMatch(volunteer, round(score, 2), reasons)

    def rank(
        self, volunteers: Iterable[Volunteer], task: CoordinationTask
    ) -> List[VolunteerMatch]:
        """Rank volunteers by deterministic fit."""

        matches = [self.score(volunteer, task) for volunteer in volunteers]
        return sorted(matches, key=lambda match: match.score, reverse=True)
