"""Minimal-disruption recovery engine."""

from typing import Dict, Iterable, List

from src.models import CoordinationTask, TaskLifecycle, Volunteer

from .planning_engine import PlanningEngine


class RecoveryEngine:
    """Repair affected tasks and preserve unaffected tasks."""

    def __init__(self):
        self.planning = PlanningEngine()

    def recover_tasks(
        self,
        tasks: Iterable[CoordinationTask],
        volunteers: Iterable[Volunteer],
        disruption: Dict[str, object],
    ) -> Dict[str, object]:
        """Recover from volunteer/route/resource/task disruptions."""

        task_list = list(tasks)
        affected = self._affected_tasks(task_list, disruption)
        affected_ids = {task.task_id for task in affected}
        preserved = []
        repaired = []

        for task in task_list:
            if task.task_id not in affected_ids:
                task.preserved = True
                preserved.append(task)
                continue

            failed_volunteer = disruption.get("volunteer_id")
            available = [
                volunteer
                for volunteer in volunteers
                if volunteer.volunteer_id != failed_volunteer
            ]
            replacement = task.model_copy(deep=True)
            replacement.task_id = f"{task.task_id}_recovery"
            replacement.original_task_id = task.task_id
            replacement.recovery_reason = str(disruption.get("reason", "disrupted"))
            replacement.volunteer_id = None
            replacement.status = TaskLifecycle.AVAILABLE

            if disruption.get("route_status") == "blocked":
                replacement.route_status = "rerouted"
                replacement.validation_summary["route_change"] = "Alternate route required"

            repaired.append(self.planning.assign_best_volunteer(replacement, available))

        return {
            "preserved": preserved,
            "repaired": repaired,
            "affected_count": len(affected),
            "preserved_count": len(preserved),
            "repaired_count": len(repaired),
        }

    def _affected_tasks(
        self, tasks: List[CoordinationTask], disruption: Dict[str, object]
    ) -> List[CoordinationTask]:
        """Find tasks impacted by disruption."""

        affected_ids = set(disruption.get("task_ids") or [])
        volunteer_id = disruption.get("volunteer_id")
        route_zone = disruption.get("zone")

        affected = []
        for task in tasks:
            if task.task_id in affected_ids:
                affected.append(task)
            elif volunteer_id and task.volunteer_id == volunteer_id:
                affected.append(task)
            elif route_zone and route_zone in task.affected_zones:
                affected.append(task)
        return affected
