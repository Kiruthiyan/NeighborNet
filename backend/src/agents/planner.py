"""Planner agent facade."""

from typing import List, Optional

from src.models import CoordinationTask
from src.services.coordination import CoordinationService


class PlannerAgent:
    """Creates normal and disaster task assignments through deterministic engines."""

    name = "Planner Agent"

    def __init__(self, service: CoordinationService):
        self.service = service

    def plan_normal(self) -> Optional[CoordinationTask]:
        """Create one normal surplus food task."""

        return self.service.create_normal_task()

    def plan_disaster(self, disaster_id: str) -> List[CoordinationTask]:
        """Assign accepted volunteers to disaster tasks."""

        return self.service.assign_disaster_tasks(disaster_id)
