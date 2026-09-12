"""Deterministic planning for normal and disaster coordination tasks."""

from datetime import datetime, timedelta
from typing import Iterable, List, Optional, Set, Tuple

from src.models import (
    Allocation,
    CoordinationTask,
    DisasterEvent,
    DisasterNeed,
    InventoryBatch,
    InventoryStatus,
    OperatingMode,
    Request,
    RequestStatus,
    TaskLifecycle,
    TaskPriority,
    Volunteer,
)

from .risk_classifier import RiskClassifier
from .volunteer_matcher import VolunteerMatcher

# Lower number = served first when assigning scarce accepted volunteers to
# disaster needs (see create_disaster_tasks). Without this, needs were
# assigned in whatever order they happened to appear in DisasterEvent.needs,
# so a LOW-priority need listed first could claim the only fitting volunteer
# ahead of a CRITICAL one listed later - the actual bug class
# feature/disaster-priority-matching is about.
_NEED_PRIORITY_ORDER = {
    TaskPriority.CRITICAL: 0,
    TaskPriority.HIGH: 1,
    TaskPriority.MEDIUM: 2,
    TaskPriority.LOW: 3,
}


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
        restricted_zones: Optional[Set[str]] = None,
    ) -> Optional[Tuple[CoordinationTask, Allocation]]:
        """Create one normal delivery task from the best obvious match, and
        persist the allocation onto the matched Request/InventoryBatch
        (mutated in place - callers pass the live state.inventory /
        state.requests lists) so a repeat call can never match the same
        supply twice. Skips batches that are expired, not AVAILABLE, or
        already fully allocated."""

        for request in requests:
            if request.quantity_remaining <= 0:
                continue
            for batch in inventory:
                if batch.status != InventoryStatus.AVAILABLE or batch.is_expired:
                    continue
                if not request.can_fulfill_with(batch):
                    continue
                quantity = min(request.quantity_remaining, batch.quantity_unallocated)
                if quantity <= 0:
                    continue

                # Persist the match onto the actual Request/InventoryBatch
                # objects - this is what makes matching non-repeatable:
                # quantity_remaining / quantity_unallocated are computed
                # properties derived from these fields.
                batch.quantity_allocated += quantity
                if batch.quantity_unallocated <= 0:
                    batch.status = InventoryStatus.ALLOCATED
                request.quantity_fulfilled += quantity
                request.status = (
                    RequestStatus.FULFILLED
                    if request.quantity_remaining <= 0
                    else RequestStatus.PARTIALLY_FULFILLED
                )

                allocation = Allocation(
                    request_id=request.request_id,
                    batch_id=batch.batch_id,
                    quantity_allocated=quantity,
                )
                # Composite DynamoDB key (allocation_id, plan_id) requires a
                # non-null range key; there's no multi-allocation "plan"
                # concept here, so each allocation is its own plan.
                allocation.plan_id = allocation.allocation_id

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
                    allocation_ids=[allocation.allocation_id],
                    pickup_location={"org_id": batch.location_id},
                    destination={"org_id": request.requesting_org_id},
                    quantity=quantity,
                    priority=TaskPriority(request.urgency_level.value),
                    required_skills=["food_delivery"],
                    required_capacity=quantity,
                    expected_completion_time=datetime.now() + timedelta(hours=2),
                )
                return self.assign_best_volunteer(task, volunteers, restricted_zones), allocation
        return None

    def create_disaster_tasks(
        self,
        disaster: DisasterEvent,
        accepted_volunteers: Iterable[Volunteer],
        restricted_zones: Optional[Set[str]] = None,
    ) -> List[CoordinationTask]:
        """Create tasks from disaster needs and assign best accepted
        volunteers, most urgent need first.

        Accepted volunteers are a scarce, shared pool - once one is assigned
        to a need they're removed from consideration for the rest of this
        call. Needs are processed CRITICAL -> HIGH -> MEDIUM -> LOW (see
        _NEED_PRIORITY_ORDER) rather than in whatever order they happen to
        be listed, so a more urgent need is never starved of the only
        fitting volunteer by a less urgent one that was simply declared
        first.
        """

        tasks: List[CoordinationTask] = []
        remaining_volunteers = list(accepted_volunteers)
        sorted_needs = sorted(
            disaster.needs, key=lambda need: _NEED_PRIORITY_ORDER.get(need.priority, 99)
        )
        for need in sorted_needs:
            task = self._task_from_need(disaster, need)
            assigned = self.assign_best_volunteer(task, remaining_volunteers, restricted_zones)
            if assigned.volunteer_id:
                remaining_volunteers = [
                    volunteer
                    for volunteer in remaining_volunteers
                    if volunteer.volunteer_id != assigned.volunteer_id
                ]
            tasks.append(assigned)
        return tasks

    def assign_best_volunteer(
        self,
        task: CoordinationTask,
        volunteers: Iterable[Volunteer],
        restricted_zones: Optional[Set[str]] = None,
    ) -> CoordinationTask:
        """Assign best-scored volunteer if risk is GREEN."""

        ranked = self.matcher.rank(volunteers, task, restricted_zones)
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
