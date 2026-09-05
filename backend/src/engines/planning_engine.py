"""Deterministic planning for normal and disaster coordination tasks."""

from datetime import datetime, timedelta
from typing import Iterable, List, Optional

from src.models import (
    CoordinationTask,
    DisasterEvent,
    DisasterNeed,
    InventoryBatch,
    OperatingMode,
    Request,
    TaskLifecycle,
    TaskPriority,
    Volunteer,
)

from .risk_classifier import RiskClassifier
from .volunteer_matcher import VolunteerMatcher


class PlanningEngine:
    """Generate validated task proposals for both operating modes."""

    def __init__(self):
        self.matcher = VolunteerMatcher()
        self.risk_classifier = RiskClassifier()

    def create_normal_task(
        self,
        inventory: Iterable[InventoryBatch],
        requests: Iterable[Request],
        volunteers: Iterable[Volunteer],
    ) -> Optional[CoordinationTask]:
        """Create one normal delivery task from best obvious match."""

        for request in requests:
            for batch in inventory:
                if not request.can_fulfill_with(batch):
                    continue
                quantity = min(request.quantity_remaining, batch.quantity_unallocated)
                if quantity <= 0:
                    continue
                task = CoordinationTask(
                    operating_mode=OperatingMode.NORMAL,
                    title=f"Deliver {quantity} {batch.unit} to request",
                    description=(
                        f"Pick up {batch.description} from {batch.donor_org_id} "
                        f"and deliver to {request.requesting_org_id}."
                    ),
                    category="food_delivery",
                    request_id=request.request_id,
                    resource_batch_id=batch.batch_id,
                    pickup_location={"org_id": batch.location_id},
                    destination={"org_id": request.requesting_org_id},
                    quantity=quantity,
                    priority=TaskPriority(request.urgency_level.value),
                    required_skills=["food_delivery"],
                    required_capacity=quantity,
                    expected_completion_time=datetime.now() + timedelta(hours=2),
                )
                return self.assign_best_volunteer(task, volunteers)
        return None

    def create_disaster_tasks(
        self,
        disaster: DisasterEvent,
        accepted_volunteers: Iterable[Volunteer],
    ) -> List[CoordinationTask]:
        """Create tasks from disaster needs and assign best accepted volunteers."""

        tasks: List[CoordinationTask] = []
        remaining_volunteers = list(accepted_volunteers)
        for need in disaster.needs:
            task = self._task_from_need(disaster, need)
            assigned = self.assign_best_volunteer(task, remaining_volunteers)
            if assigned.volunteer_id:
                remaining_volunteers = [
                    volunteer
                    for volunteer in remaining_volunteers
                    if volunteer.volunteer_id != assigned.volunteer_id
                ]
            tasks.append(assigned)
        return tasks

    def assign_best_volunteer(
        self, task: CoordinationTask, volunteers: Iterable[Volunteer]
    ) -> CoordinationTask:
        """Assign best-scored volunteer if risk is GREEN."""

        ranked = self.matcher.rank(volunteers, task)
        best = next((match for match in ranked if match.score > 0), None)
        if not best:
            task.status = TaskLifecycle.NEEDS_ATTENTION
            task.validation_summary = {"valid": False, "reason": "No eligible volunteer"}
            return task

        action = task.model_dump()
        decision = self.risk_classifier.classify(action)
        task.risk_classification = decision.classification
        task.validation_summary = {
            "valid": decision.can_execute_autonomously,
            "score": best.score,
            "volunteer_match_reasons": best.reasons,
            "risk_reasons": decision.reasons,
        }

        if decision.can_execute_autonomously:
            task.assign(best.volunteer.volunteer_id)
        else:
            task.status = TaskLifecycle.NEEDS_ATTENTION
        return task

    def _task_from_need(
        self, disaster: DisasterEvent, need: DisasterNeed
    ) -> CoordinationTask:
        """Convert disaster need into assignable logistics task."""

        return CoordinationTask(
            operating_mode=OperatingMode.DISASTER,
            title=f"{need.category.replace('_', ' ').title()} for {disaster.title}",
            description=f"Complete {need.category} in {', '.join(disaster.affected_zones)}.",
            category=need.category,
            disaster_id=disaster.disaster_id,
            need_id=need.need_id,
            destination=need.location,
            affected_zones=disaster.affected_zones,
            quantity=need.quantity,
            priority=need.priority,
            required_skills=need.required_skills,
            required_capacity=need.required_capacity,
            expected_completion_time=datetime.now() + timedelta(hours=3),
        )
