"""Deterministic GREEN/AMBER/RED risk classification."""

from dataclasses import dataclass, field
from typing import Any, Dict, List

from src.models import OperatingMode, RiskClassification


RED_KEYWORDS = {
    "evacuation",
    "evacuate",
    "rescue",
    "medical",
    "treatment",
    "restricted",
    "unsafe",
    "authority",
}


@dataclass
class RiskDecision:
    """Risk classification with evidence suitable for audit/UI."""

    classification: RiskClassification
    reasons: List[str] = field(default_factory=list)
    confidence: float = 1.0

    @property
    def can_execute_autonomously(self) -> bool:
        """GREEN only can run without human approval."""

        return self.classification == RiskClassification.GREEN


class RiskClassifier:
    """Classify proposed logistics actions without model judgment."""

    def classify(self, action: Dict[str, Any]) -> RiskDecision:
        """Return GREEN/AMBER/RED for proposed action."""

        text = " ".join(
            str(action.get(key, ""))
            for key in ("title", "description", "category", "route_status")
        ).lower()
        mode = action.get("operating_mode", OperatingMode.NORMAL)
        if isinstance(mode, OperatingMode):
            mode = mode.value

        if any(keyword in text for keyword in RED_KEYWORDS):
            return RiskDecision(
                RiskClassification.RED,
                ["Action includes prohibited disaster safety category"],
                1.0,
            )

        if action.get("route_safe") is False:
            return RiskDecision(
                RiskClassification.RED,
                ["Route marked unsafe"],
                1.0,
            )

        if mode == OperatingMode.DISASTER.value:
            if action.get("major_redistribution") or action.get("uncertain_route"):
                return RiskDecision(
                    RiskClassification.AMBER,
                    ["Disaster response requires coordinator judgment"],
                    0.82,
                )
            if action.get("priority") == "critical" and action.get("resource_shortage"):
                return RiskDecision(
                    RiskClassification.AMBER,
                    ["Critical disaster shortage has competing priorities"],
                    0.8,
                )

        if action.get("validation_failed"):
            return RiskDecision(
                RiskClassification.AMBER,
                ["Validation failed or incomplete"],
                0.6,
            )

        return RiskDecision(
            RiskClassification.GREEN,
            ["Validated low-risk logistics action"],
            0.95,
        )
