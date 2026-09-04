"""Sentinel agent facade for disruption/disaster detection."""

from typing import Dict

from src.services.coordination import CoordinationService


class SentinelAgent:
    """Processes events and prepares impact summaries."""

    name = "Sentinel Agent"

    def __init__(self, service: CoordinationService):
        self.service = service

    def process_disaster(self, disaster_id: str) -> Dict[str, object]:
        """Process disaster event and identify affected zone/volunteer scope."""

        disaster = self.service.get_disaster(disaster_id)
        return {
            "agent": self.name,
            "event": "disaster_processed",
            "disaster_id": disaster.disaster_id,
            "affected_zones": disaster.affected_zones,
            "needs": [need.category for need in disaster.needs],
            "nearby_volunteers": self.service.disaster_overview()["nearby_volunteers"],
        }

    def process_disruption(self, disruption: Dict[str, object]) -> Dict[str, object]:
        """Summarize affected task disruption."""

        task_ids = disruption.get("task_ids") or []
        return {
            "agent": self.name,
            "event": "disruption_detected",
            "affected_task_ids": task_ids,
            "reason": disruption.get("reason", "unknown"),
        }
