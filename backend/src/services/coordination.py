"""Local coordination state and workflows for the MVP.

This service is intentionally in-memory for the local demo/API slice. DynamoDB
table definitions exist separately for persistence wiring.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

import structlog

from src.engines import PlanningEngine, RecoveryEngine
from src.services.database import get_database_service
from src.models import (
    CoordinationTask,
    Decision,
    DecisionType,
    DisasterEvent,
    DisasterNeed,
    Event,
    EventType,
    Invitation,
    InventoryBatch,
    OperatingMode,
    Request,
    RiskClassification,
    TaskLifecycle,
    TaskPriority,
    User,
    Volunteer,
    VolunteerAlert,
    VolunteerAlertStatus,
)
from src.services.dynamo_store import get_dynamo_store
from src.services.seed_data import generate_seed_data

# DynamoDB table names, matching database.py's table definitions.
TABLE_DISASTERS = "DisasterEvents"
TABLE_ALERTS = "VolunteerAlerts"
TABLE_TASKS = "Tasks"
TABLE_DECISIONS = "Decisions"
TABLE_VOLUNTEERS = "Volunteers"
TABLE_USERS = "Users"
TABLE_INVITATIONS = "Invitations"

logger = structlog.get_logger(__name__)


@dataclass
class CoordinationState:
    """Shared local state for demo workflows."""

    users: List[User] = field(default_factory=list)
    inventory: List[InventoryBatch] = field(default_factory=list)
    requests: List[Request] = field(default_factory=list)
    volunteers: List[Volunteer] = field(default_factory=list)
    disasters: List[DisasterEvent] = field(default_factory=list)
    disaster_needs: List[DisasterNeed] = field(default_factory=list)
    alerts: List[VolunteerAlert] = field(default_factory=list)
    tasks: List[CoordinationTask] = field(default_factory=list)
    decisions: List[Decision] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)
    invitations: List[Invitation] = field(default_factory=list)


class CoordinationService:
    """High-level local workflows for Normal and Disaster modes."""

    def __init__(self):
        self.planning = PlanningEngine()
        self.recovery = RecoveryEngine()
        self.state = CoordinationState()
        self.store = get_dynamo_store()
        if not (self.store.enabled and self.load_from_dynamodb()):
            self.reset()

    def reset(self) -> Dict[str, int]:
        """Reset local state from seed data."""

        seed = generate_seed_data()
        self.state = CoordinationState(
            users=seed["users"],
            inventory=seed["inventory"],
            requests=seed["requests"],
            volunteers=seed["volunteers"],
            disasters=seed["disasters"],
            disaster_needs=seed["disaster_needs"],
        )
        if self.store.enabled:
            # First run against a fresh/empty shared table: seed it so every
            # teammate's backend starts from the same shared state.
            for volunteer in self.state.volunteers:
                self.store.put(TABLE_VOLUNTEERS, volunteer.model_dump(mode="json"))
            for user in self.state.users:
                self.store.put(TABLE_USERS, user.model_dump(mode="json"))
        return self.summary_counts()

    def load_from_dynamodb(self) -> bool:
        """Rehydrate state from the shared DynamoDB tables. Returns True if
        any persisted data was found (so callers can skip reseeding)."""

        volunteer_items = self.store.scan_all(TABLE_VOLUNTEERS)
        if not volunteer_items:
            return False

        seed = generate_seed_data()
        self.state = CoordinationState(
            users=[User.model_validate(item) for item in self.store.scan_all(TABLE_USERS)]
            or seed["users"],
            inventory=seed["inventory"],
            requests=seed["requests"],
            volunteers=[Volunteer.model_validate(item) for item in volunteer_items],
            disasters=[
                DisasterEvent.model_validate(item)
                for item in self.store.scan_all(TABLE_DISASTERS)
            ],
        )
        self.state.alerts = [
            VolunteerAlert.model_validate(item) for item in self.store.scan_all(TABLE_ALERTS)
        ]
        self.state.tasks = [
            CoordinationTask.model_validate(item) for item in self.store.scan_all(TABLE_TASKS)
        ]
        self.state.decisions = [
            Decision.model_validate(item) for item in self.store.scan_all(TABLE_DECISIONS)
        ]
        self.state.invitations = [
            Invitation.model_validate(item) for item in self.store.scan_all(TABLE_INVITATIONS)
        ]
        return True

    def _persist(self, table_name: str, model) -> None:
        """Write-through one model to the shared DynamoDB table, if enabled."""

        self.store.put(table_name, model.model_dump(mode="json"))

    # -- User & invitation management ------------------------------------

    def get_user_by_email(self, email: str) -> Optional[User]:
        email_lower = email.strip().lower()
        return next(
            (u for u in self.state.users if (u.email or "").strip().lower() == email_lower),
            None,
        )

    def get_user(self, user_id: str) -> Optional[User]:
        return next((u for u in self.state.users if u.user_id == user_id), None)

    def create_user(self, user: User) -> User:
        self.state.users.append(user)
        self._persist(TABLE_USERS, user)
        return user

    def update_user(self, user: User) -> User:
        user.update_timestamp()
        for index, existing in enumerate(self.state.users):
            if existing.user_id == user.user_id:
                self.state.users[index] = user
                break
        self._persist(TABLE_USERS, user)
        return user

    def delete_user(self, user_id: str) -> bool:
        before = len(self.state.users)
        self.state.users = [u for u in self.state.users if u.user_id != user_id]
        deleted = len(self.state.users) < before
        if deleted and self.store.enabled:
            try:
                get_database_service().resource.Table(TABLE_USERS).delete_item(
                    Key={"user_id": user_id}
                )
            except Exception as exc:  # pragma: no cover - depends on live AWS
                logger.warning("dynamodb_delete_failed", table=TABLE_USERS, error=str(exc))
        return deleted

    def create_invitation(self, invitation: Invitation) -> Invitation:
        self.state.invitations.append(invitation)
        self._persist(TABLE_INVITATIONS, invitation)
        return invitation

    def get_invitation_by_token(self, token: str) -> Optional[Invitation]:
        return next((i for i in self.state.invitations if i.token == token), None)

    def update_invitation(self, invitation: Invitation) -> Invitation:
        invitation.update_timestamp()
        for index, existing in enumerate(self.state.invitations):
            if existing.invite_id == invitation.invite_id:
                self.state.invitations[index] = invitation
                break
        self._persist(TABLE_INVITATIONS, invitation)
        return invitation

    def summary_counts(self) -> Dict[str, int]:
        """Return entity counts for health/dashboard."""

        return {
            "users": len(self.state.users),
            "inventory": len(self.state.inventory),
            "requests": len(self.state.requests),
            "volunteers": len(self.state.volunteers),
            "disasters": len(self.state.disasters),
            "alerts": len(self.state.alerts),
            "tasks": len(self.state.tasks),
            "decisions": len(self.state.decisions),
            "events": len(self.state.events),
        }

    def dashboard_readiness(self) -> Dict[str, object]:
        """Aggregate normal/disaster readiness for dashboard."""

        active_tasks = [task for task in self.state.tasks if task.is_active]
        completed_tasks = [
            task for task in self.state.tasks if task.status == TaskLifecycle.COMPLETED
        ]
        pending_decisions = [
            decision
            for decision in self.state.decisions
            if decision.requires_human_approval and not decision.human_approval
        ]
        return {
            "community_readiness": 82,
            "active_requests": len(self.state.requests),
            "inventory_batches": len(self.state.inventory),
            "active_volunteers": len(
                [
                    volunteer
                    for volunteer in self.state.volunteers
                    if volunteer.is_available_for_assignment
                ]
            ),
            "active_disasters": len(
                [disaster for disaster in self.state.disasters if disaster.is_active]
            ),
            "active_tasks": len(active_tasks),
            "completed_tasks": len(completed_tasks),
            "pending_human_decisions": len(pending_decisions),
            "human_decisions_avoided": len(
                [
                    task
                    for task in self.state.tasks
                    if task.risk_classification == RiskClassification.GREEN
                ]
            ),
        }

    def disaster_overview(self) -> Dict[str, object]:
        """Return disaster response dashboard data."""

        active = [disaster for disaster in self.state.disasters if disaster.is_active]
        alerts = self.state.alerts
        tasks = [
            task
            for task in self.state.tasks
            if task.operating_mode == OperatingMode.DISASTER
        ]
        return {
            "active_disasters": active,
            "nearby_volunteers": len(self._eligible_disaster_volunteers(active[0]) if active else []),
            "volunteers_alerted": len(alerts),
            "volunteers_accepted": len(
                [alert for alert in alerts if alert.status == VolunteerAlertStatus.ACCEPTED]
            ),
            "tasks_assigned": len(
                [task for task in tasks if task.status == TaskLifecycle.ASSIGNED]
            ),
            "tasks_completed": len(
                [task for task in tasks if task.status == TaskLifecycle.COMPLETED]
            ),
            "unresolved_tasks": len(
                [task for task in tasks if task.status != TaskLifecycle.COMPLETED]
            ),
            "recovery_actions": len(
                [task for task in tasks if task.original_task_id is not None]
            ),
        }

    def create_normal_task(self) -> Optional[CoordinationTask]:
        """Plan and store one normal food delivery task."""

        task = self.planning.create_normal_task(
            self.state.inventory,
            self.state.requests,
            self.state.volunteers,
        )
        if task:
            task.task_id = "task_normal_surplus_delivery"
            self.state.tasks.append(task)
            self._persist(TABLE_TASKS, task)
            self._record_event("Normal surplus delivery task created", "normal")
        return task

    def create_disaster(self, payload: Dict[str, object]) -> DisasterEvent:
        """Create admin disaster event."""

        needs_payload = payload.get("needs") or []
        disaster_id = str(payload.get("disaster_id") or f"disaster_{len(self.state.disasters)+1}")
        disaster = DisasterEvent(
            disaster_id=disaster_id,
            type=str(payload.get("type", "flood")),
            title=str(payload.get("title", "Flood detected")),
            description=str(payload.get("description", "")),
            affected_location=dict(payload.get("affected_location", {})),
            affected_zones=list(payload.get("affected_zones", ["south"])),
            severity=TaskPriority(str(payload.get("severity", "high")).lower()),
            created_by=str(payload.get("created_by", "admin")),
        )
        for index, need in enumerate(needs_payload):
            disaster.needs.append(
                DisasterNeed(
                    need_id=str(need.get("need_id", f"{disaster_id}_need_{index+1}")),
                    disaster_id=disaster.disaster_id,
                    category=str(need.get("category", "food_delivery")),
                    quantity=int(need.get("quantity", 1)),
                    priority=TaskPriority(str(need.get("priority", "high")).lower()),
                    location=dict(need.get("location", {})),
                    required_skills=list(need.get("required_skills", [])),
                    required_capacity=int(need.get("required_capacity", 0)),
                )
            )
        self.state.disasters.append(disaster)
        self.state.disaster_needs.extend(disaster.needs)
        self._persist(TABLE_DISASTERS, disaster)
        self._record_event(f"Disaster created: {disaster.title}", "disaster")
        return disaster

    def dispatch_disaster(self, disaster_id: str) -> List[VolunteerAlert]:
        """Alert nearby verified volunteers for an active disaster."""

        disaster = self.get_disaster(disaster_id)
        volunteers = self._eligible_disaster_volunteers(disaster)
        existing = {
            (alert.volunteer_id, alert.disaster_id)
            for alert in self.state.alerts
        }
        new_alerts: List[VolunteerAlert] = []
        for volunteer in volunteers[:8]:
            key = (volunteer.volunteer_id, disaster.disaster_id)
            if key in existing:
                continue
            alert = VolunteerAlert(
                volunteer_id=volunteer.volunteer_id,
                disaster_id=disaster.disaster_id,
                task_category=", ".join(need.category for need in disaster.needs),
                location=", ".join(disaster.affected_zones),
                approximate_distance=self._zone_distance(volunteer, disaster),
                urgency=disaster.severity,
                assistance_required="Food delivery, water distribution, or shelter support",
            )
            self.state.alerts.append(alert)
            self._persist(TABLE_ALERTS, alert)
            new_alerts.append(alert)
        self._record_event(f"Disaster alerts sent: {len(new_alerts)}", "disaster")
        return new_alerts

    def respond_to_alert(self, alert_id: str, response: str) -> VolunteerAlert:
        """Accept, decline, or timeout volunteer alert."""

        alert = self.get_alert(alert_id)
        if response == "accept":
            alert.accept()
        elif response == "decline":
            alert.decline()
        elif response == "timeout":
            alert.timeout()
        else:
            raise ValueError("response must be accept, decline, or timeout")
        self._persist(TABLE_ALERTS, alert)
        self._record_event(f"Volunteer alert {response}: {alert_id}", "disaster")
        return alert

    def assign_disaster_tasks(self, disaster_id: str) -> List[CoordinationTask]:
        """Assign accepted volunteers to disaster tasks."""

        disaster = self.get_disaster(disaster_id)
        accepted_ids = {
            alert.volunteer_id
            for alert in self.state.alerts
            if alert.disaster_id == disaster_id
            and alert.status == VolunteerAlertStatus.ACCEPTED
        }
        volunteers = [
            volunteer
            for volunteer in self.state.volunteers
            if volunteer.volunteer_id in accepted_ids
        ]
        tasks = self.planning.create_disaster_tasks(disaster, volunteers)
        for index, task in enumerate(tasks, start=1):
            task.task_id = f"task_{disaster_id}_{index}"
        self.state.tasks.extend(tasks)
        for task in tasks:
            self._persist(TABLE_TASKS, task)
        self._record_event(f"Disaster tasks assigned: {len(tasks)}", "disaster")
        return tasks

    def update_task_status(self, task_id: str, status: TaskLifecycle) -> CoordinationTask:
        """Update task status."""

        task = self.get_task(task_id)
        task.status = status
        task.updated_at = datetime.now()
        self._persist(TABLE_TASKS, task)
        self._record_event(f"Task status changed: {task_id} -> {status.value}", task.operating_mode.value)
        return task

    def recover(self, disruption: Dict[str, object]) -> Dict[str, object]:
        """Run shared recovery flow and create AMBER if needed."""

        result = self.recovery.recover_tasks(
            self.state.tasks,
            self.state.volunteers,
            disruption,
        )
        repaired = result["repaired"]
        self.state.tasks.extend(repaired)
        for task in repaired:
            self._persist(TABLE_TASKS, task)

        if disruption.get("create_amber_decision", True):
            decision = Decision(
                decision_id="decision_meaningful_amber_conflict",
                decision_type=DecisionType.RECOVERY_STRATEGY,
                title="Approve disaster recovery conflict",
                description="Two high-priority tasks compete for the same best volunteer.",
                context={
                    "triggering_event": disruption,
                    "affected_count": result["affected_count"],
                    "preserved_count": result["preserved_count"],
                },
                risk_classification=RiskClassification.AMBER,
                requires_human_approval=True,
            )
            decision.add_option(
                "Approve reassignment",
                "Use next-best verified volunteer and monitor completion.",
                pros=["Restores coverage quickly"],
                risks=["Adds delay to lower-priority task"],
                confidence_level=0.84,
            )
            self.state.decisions.append(decision)
            self._persist(TABLE_DECISIONS, decision)

        self._record_event("Recovery completed", str(disruption.get("operating_mode", "disaster")))
        return result

    def approve_decision(self, decision_id: str, coordinator_id: str) -> Decision:
        """Approve AMBER decision and mark workflow resumable."""

        decision = self.get_decision(decision_id)
        if decision.risk_classification == RiskClassification.RED:
            raise ValueError("RED decisions cannot be approved for autonomous execution")
        if decision.options:
            decision.selected_option_id = decision.options[0].option_id
        decision.approve(coordinator_id, "Coordinator", "coordinator")
        decision.decided_at = datetime.now()
        self._persist(TABLE_DECISIONS, decision)
        self._record_event(f"Decision approved: {decision_id}", "disaster")
        return decision

    def get_disaster(self, disaster_id: str) -> DisasterEvent:
        """Fetch disaster by ID."""

        return self._find(self.state.disasters, "disaster_id", disaster_id)

    def get_alert(self, alert_id: str) -> VolunteerAlert:
        """Fetch alert by ID."""

        return self._find(self.state.alerts, "alert_id", alert_id)

    def get_task(self, task_id: str) -> CoordinationTask:
        """Fetch task by ID."""

        return self._find(self.state.tasks, "task_id", task_id)

    def get_decision(self, decision_id: str) -> Decision:
        """Fetch decision by ID."""

        return self._find(self.state.decisions, "decision_id", decision_id)

    def _eligible_disaster_volunteers(self, disaster: DisasterEvent) -> List[Volunteer]:
        """Filter nearby, verified, currently available volunteers."""

        affected = set(disaster.affected_zones)
        return [
            volunteer
            for volunteer in self.state.volunteers
            if volunteer.verified
            and volunteer.is_available_for_assignment
            and (
                not affected
                or volunteer.last_known_zone in affected
                or bool(affected.intersection(set(volunteer.preferred_zones)))
                or volunteer.preferred_service_area in affected
            )
        ]

    def _zone_distance(self, volunteer: Volunteer, disaster: DisasterEvent) -> float:
        """Small deterministic distance proxy for demo."""

        if volunteer.last_known_zone in disaster.affected_zones:
            return 1.2
        if volunteer.preferred_service_area in disaster.affected_zones:
            return 2.4
        return 4.8

    def _record_event(self, description: str, mode: str) -> None:
        """Record auditable local event."""

        self.state.events.append(
            Event(
                event_type=EventType.PERFORMANCE_ALERT
                if "metric" in description.lower()
                else EventType.ORGANIZATION_STATUS_CHANGED,
                description=description,
                source="system",
                event_data={"operating_mode": mode},
            )
        )

    @staticmethod
    def _find(items: List[object], attr: str, value: str):
        """Find item by attr or raise."""

        for item in items:
            if getattr(item, attr) == value:
                return item
        raise ValueError(f"{attr} not found: {value}")


_coordination_service: Optional[CoordinationService] = None


def get_coordination_service() -> CoordinationService:
    """Return singleton coordination service."""

    global _coordination_service
    if _coordination_service is None:
        _coordination_service = CoordinationService()
    return _coordination_service
