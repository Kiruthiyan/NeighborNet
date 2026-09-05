"""Recovery agent facade."""

from typing import Dict

from src.services.coordination import CoordinationService


class RecoveryAgent:
    """Repairs disrupted tasks through deterministic recovery engine."""

    name = "Recovery Agent"

    def __init__(self, service: CoordinationService):
        self.service = service

    def recover(self, disruption: Dict[str, object]) -> Dict[str, object]:
        """Run shared minimal-disruption recovery."""

        return self.service.recover(disruption)
