"""NeighborNet orchestrator facade.

This local class mirrors the planned Strands Orchestrator contract while using
deterministic services for repeatable MVP demos.
"""

from typing import Dict

from src.agents.planner import PlannerAgent
from src.agents.recovery import RecoveryAgent
from src.agents.sentinel import SentinelAgent
from src.services.coordination import CoordinationService, get_coordination_service


class NeighborNetOrchestrator:
    """Coordinates Normal, Disaster, and Recovery workflows."""

    name = "NeighborNet Orchestrator"

    def __init__(self, service: CoordinationService | None = None):
        self.service = service or get_coordination_service()
        self.sentinel = SentinelAgent(self.service)
        self.planner = PlannerAgent(self.service)
        self.recovery = RecoveryAgent(self.service)

    def run_normal_mode(self) -> Dict[str, object]:
        """Run normal surplus-food matching flow."""

        task = self.planner.plan_normal()
        return {
            "agent": self.name,
            "workflow": "normal_mode",
            "task": task,
            "metrics": self.service.dashboard_readiness(),
        }

    def run_disaster_mode(self, disaster_id: str) -> Dict[str, object]:
        """Run disaster detection, alert dispatch, and task assignment."""

        sentinel_report = self.sentinel.process_disaster(disaster_id)
        alerts = self.service.dispatch_disaster(disaster_id)
        decline_index = 3 if len(alerts) > 3 else None
        for index, alert in enumerate(alerts):
            response = "decline" if index == decline_index else "accept"
            self.service.respond_to_alert(alert.alert_id, response)
        tasks = self.planner.plan_disaster(disaster_id)
        return {
            "agent": self.name,
            "workflow": "disaster_mode",
            "sentinel_report": sentinel_report,
            "alerts": alerts,
            "tasks": tasks,
            "metrics": self.service.disaster_overview(),
        }

    def run_recovery(self, disruption: Dict[str, object]) -> Dict[str, object]:
        """Run shared recovery workflow."""

        sentinel_report = self.sentinel.process_disruption(disruption)
        recovery_report = self.recovery.recover(disruption)
        return {
            "agent": self.name,
            "workflow": "recovery",
            "sentinel_report": sentinel_report,
            "recovery_report": recovery_report,
            "pending_decisions": self.service.state.decisions,
        }
