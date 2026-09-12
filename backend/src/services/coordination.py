"""Local coordination state and workflows for the MVP.

This service is intentionally in-memory for the local demo/API slice. DynamoDB
table definitions exist separately for persistence wiring.
"""

import math
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import structlog

from src.engines import PlanningEngine, RecoveryEngine
from src.services.database import get_database_service
from src.models import (
    Allocation,
    AuditActionType,
    AuditSeverity,
    CoordinationTask,
    Decision,
    DecisionType,
    DietaryMetadata,
    DisasterEvent,
    DisasterNeed,
    DisasterStatus,
    Event,
    EventType,
    Invitation,
    InventoryBatch,
    KNOWN_REGIONS,
    OperatingMode,
    Request,
    RequestStatus,
    ResourceType,
    RiskClassification,
    StrandsAuditLog,
    TaskLifecycle,
    TaskPriority,
    TaskVerificationCode,
    UrgencyLevel,
    User,
    VerificationCodeType,
    VerificationStatus,
    Volunteer,
    VolunteerAlert,
    VolunteerAlertStatus,
    normalize_region,
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
TABLE_INVENTORY = "Inventory"
TABLE_REQUESTS = "Requests"
TABLE_ALLOCATIONS = "Allocations"
TABLE_STRANDS_AUDIT_LOGS = "StrandsAuditLogs"
TABLE_VERIFICATION = "TaskVerificationCodes"

logger = structlog.get_logger(__name__)


class DisasterNotVerifiedError(ValueError):
    """Raised when an action requires an ACTIVE/MONITORING disaster but the
    target is still PENDING_VALIDATION (or already RESOLVED). Subclasses
    ValueError so existing callers that only catch ValueError still work,
    but the API layer catches this first to return 409 instead of the 404/400
    used for "not found"/bad-input ValueErrors."""


class DisasterReviewStateError(ValueError):
    """Raised by verify_disaster/reject_disaster when the target disaster
    isn't PENDING_VALIDATION (already reviewed, or never a citizen report in
    the first place). Subclasses ValueError for the same reason as
    DisasterNotVerifiedError above; the API layer maps this to 409."""


def _resolve_region(payload: Dict[str, object], affected_zones: List[str]) -> Optional[str]:
    """Region is the canonical geographic scope for a disaster (see
    DisasterEvent.region / normalize_region). Uses an explicit `region` in
    the payload if given (raises ValueError if it isn't a known region),
    otherwise best-effort derives it from the first affected zone that
    happens to match a known region name. Falls back to None (unspecified)
    rather than failing outright - `affected_zones` may carry finer-grained
    sub-area tags that aren't themselves region names."""

    explicit = payload.get("region")
    if explicit:
        return normalize_region(str(explicit))
    for zone in affected_zones:
        try:
            return normalize_region(zone)
        except ValueError:
            continue
    return None


def _parse_radius(value: object) -> Optional[float]:
    """Parse/validate an optional affected_radius_km payload value."""

    if value is None:
        return None
    try:
        radius = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid affected_radius_km: {value!r}") from exc
    if radius <= 0:
        raise ValueError("affected_radius_km must be positive")
    return radius


@dataclass
class CoordinationState:
    """Shared local state for demo workflows."""

    users: List[User] = field(default_factory=list)
    inventory: List[InventoryBatch] = field(default_factory=list)
    requests: List[Request] = field(default_factory=list)
    allocations: List[Allocation] = field(default_factory=list)
    volunteers: List[Volunteer] = field(default_factory=list)
    disasters: List[DisasterEvent] = field(default_factory=list)
    disaster_needs: List[DisasterNeed] = field(default_factory=list)
    alerts: List[VolunteerAlert] = field(default_factory=list)
    tasks: List[CoordinationTask] = field(default_factory=list)
    decisions: List[Decision] = field(default_factory=list)
    events: List[Event] = field(default_factory=list)
    invitations: List[Invitation] = field(default_factory=list)
    strands_audit_logs: List[StrandsAuditLog] = field(default_factory=list)
    verification_codes: List[TaskVerificationCode] = field(default_factory=list)


class CoordinationService:
    """High-level local workflows for Normal and Disaster modes."""

    def __init__(self):
        self.planning = PlanningEngine()
        self.recovery = RecoveryEngine()
        self.state = CoordinationState()
        self.store = get_dynamo_store()
        self._task_lock = threading.Lock()
        # Recovery plans staged behind a pending AMBER Decision, keyed by
        # decision_id, not applied to operational state until a coordinator
        # approves them. Intentionally in-memory only (see approve_decision) -
        # a process restart loses unapplied plans rather than silently
        # resurrecting a stale one.
        self._pending_recovery_plans: Dict[str, Dict[str, object]] = {}
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
            for batch in self.state.inventory:
                self.store.put(TABLE_INVENTORY, batch.model_dump(mode="json"))
            for request in self.state.requests:
                self.store.put(TABLE_REQUESTS, request.model_dump(mode="json"))
        return self.summary_counts()

    def load_from_dynamodb(self) -> bool:
        """Rehydrate state from the shared DynamoDB tables. Returns True if
        any persisted data was found (so callers can skip reseeding)."""

        volunteer_items = self.store.scan_all(TABLE_VOLUNTEERS)
        if not volunteer_items:
            return False

        seed = generate_seed_data()
        inventory_items = self.store.scan_all(TABLE_INVENTORY)
        request_items = self.store.scan_all(TABLE_REQUESTS)
        self.state = CoordinationState(
            users=[User.model_validate(item) for item in self.store.scan_all(TABLE_USERS)]
            or seed["users"],
            # Fall back to seed data only if the shared table is genuinely
            # empty (first run) - once allocations exist, reseeding here
            # would silently erase real donor/request/allocation state on
            # every restart.
            inventory=[InventoryBatch.model_validate(item) for item in inventory_items]
            or seed["inventory"],
            requests=[Request.model_validate(item) for item in request_items]
            or seed["requests"],
            allocations=[
                Allocation.model_validate(item) for item in self.store.scan_all(TABLE_ALLOCATIONS)
            ],
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
        self.state.strands_audit_logs = [
            StrandsAuditLog.model_validate(item)
            for item in self.store.scan_all(TABLE_STRANDS_AUDIT_LOGS)
        ]
        self.state.verification_codes = [
            TaskVerificationCode.model_validate(item)
            for item in self.store.scan_all(TABLE_VERIFICATION)
        ]
        self._backfill_legacy_auth_fields(seed)
        return True

    def _backfill_legacy_auth_fields(self, seed: Dict[str, list]) -> None:
        """One-time migration for a shared DynamoDB table seeded before
        authentication existed: those records have no password_hash and no
        admin account at all. Patches auth fields onto matching seed users
        (matched by email) and adds the seed admin if missing entirely -
        idempotent, and never touches a real user who already has a
        password_hash (i.e. anyone who signed up through /api/auth/signup)."""

        seed_by_email = {u.email: u for u in seed["users"] if u.email}
        existing_emails = {u.email for u in self.state.users if u.email}
        patched = False

        for user in self.state.users:
            if user.password_hash or not user.email:
                continue
            seed_user = seed_by_email.get(user.email)
            if seed_user is None:
                continue
            user.account_type = seed_user.account_type
            user.capabilities = seed_user.capabilities
            user.password_hash = seed_user.password_hash
            user.email_verified = seed_user.email_verified
            self._persist(TABLE_USERS, user)
            patched = True

        seed_admin = next((u for u in seed["users"] if u.is_admin), None)
        if seed_admin is not None and seed_admin.email not in existing_emails:
            self.state.users.append(seed_admin)
            self._persist(TABLE_USERS, seed_admin)
            patched = True

        if patched:
            logger.info("backfilled_legacy_user_auth_fields", table=TABLE_USERS)

    def _bind_volunteer(self, volunteer_id: Optional[str]) -> None:
        """Mark a volunteer as carrying an active task, so the matcher's
        hard capacity cap (see VolunteerMatcher.score) actually reflects
        reality instead of a field nothing ever updates."""

        if not volunteer_id:
            return
        volunteer = next((v for v in self.state.volunteers if v.volunteer_id == volunteer_id), None)
        if volunteer is None:
            return
        volunteer.current_task_count += 1
        volunteer.availability_status = "busy"
        self._persist(TABLE_VOLUNTEERS, volunteer)

    def _release_volunteer(self, volunteer_id: Optional[str]) -> None:
        """Free capacity when a volunteer's task ends (completed, cancelled,
        failed, or superseded by a recovery replacement)."""

        if not volunteer_id:
            return
        volunteer = next((v for v in self.state.volunteers if v.volunteer_id == volunteer_id), None)
        if volunteer is None:
            return
        volunteer.current_task_count = max(0, volunteer.current_task_count - 1)
        if volunteer.current_task_count == 0:
            volunteer.availability_status = "available"
        self._persist(TABLE_VOLUNTEERS, volunteer)

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

    def get_volunteer_by_user_id(self, user_id: str) -> Optional[Volunteer]:
        return next((v for v in self.state.volunteers if v.user_id == user_id), None)

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

    def _community_readiness(self, pending_decisions_count: int) -> int:
        """Composite 0-100 readiness score computed from real state: how
        much of the volunteer pool is free, how well requests are being
        fulfilled, and how large the human-approval backlog is. Replaces a
        constant 82 that never reflected any actual system state."""

        total_volunteers = len(self.state.volunteers) or 1
        available_volunteers = len(
            [v for v in self.state.volunteers if v.is_available_for_assignment]
        )
        volunteer_coverage = available_volunteers / total_volunteers

        total_requests = len(self.state.requests) or 1
        fulfilled_requests = len(
            [
                r
                for r in self.state.requests
                if r.status in (RequestStatus.FULFILLED, RequestStatus.PARTIALLY_FULFILLED)
            ]
        )
        fulfillment_rate = fulfilled_requests / total_requests

        decision_backlog_penalty = min(1.0, pending_decisions_count * 0.1)

        score = (
            volunteer_coverage * 0.5
            + fulfillment_rate * 0.3
            + (1 - decision_backlog_penalty) * 0.2
        ) * 100
        return round(max(0.0, min(100.0, score)))

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
            "community_readiness": self._community_readiness(len(pending_decisions)),
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
        """Plan and store one normal food delivery task, persisting the
        allocation it consumes so the same supply can never be matched
        twice. Each call advances state - repeat calls produce a new task
        against the next remaining match, or None once nothing matches."""

        result = self.planning.create_normal_task(
            self.state.inventory,
            self.state.requests,
            self.state.volunteers,
        )
        if not result:
            return None
        task, allocation = result

        self.state.tasks.append(task)
        self.state.allocations.append(allocation)
        self._persist(TABLE_TASKS, task)
        self._persist(TABLE_ALLOCATIONS, allocation)
        self._bind_volunteer(task.volunteer_id)
        self.generate_task_verification_codes(task)

        batch = next((b for b in self.state.inventory if b.batch_id == allocation.batch_id), None)
        request = next((r for r in self.state.requests if r.request_id == allocation.request_id), None)
        if batch is not None:
            self._persist(TABLE_INVENTORY, batch)
        if request is not None:
            self._persist(TABLE_REQUESTS, request)

        self._record_event(
            f"Normal surplus delivery task created: {allocation.quantity_allocated} units allocated",
            "normal",
        )
        return task

    def create_inventory_batch(self, payload: Dict[str, object], donor: User) -> InventoryBatch:
        """Record a donor's surplus food/resource donation."""
        import random

        quantity = int(payload.get("quantity_available", payload.get("quantity", 0)) or 0)
        if quantity <= 0:
            raise ValueError("quantity_available must be positive")

        raw_type = str(payload.get("resource_type", "pantry_item")).lower()
        try:
            res_type = ResourceType(raw_type)
        except ValueError:
            res_type_map = {
                "food": ResourceType.FOOD,
                "water": ResourceType.WATER,
                "medical": ResourceType.MEDICAL,
                "clothing": ResourceType.CLOTHING,
                "equipment": ResourceType.EQUIPMENT,
            }
            res_type = res_type_map.get(raw_type, ResourceType.PANTRY_ITEM)

        item_name = str(payload.get("item_name") or payload.get("description") or "Donated items")
        pickup_loc = str(payload.get("pickup_location") or payload.get("location_id") or "")
        lat_val = payload.get("latitude")
        lng_val = payload.get("longitude")
        pickup_otp = str(payload.get("pickup_otp") or random.randint(700000, 999999))

        dietary_payload = payload.get("dietary_metadata") or {}
        batch = InventoryBatch(
            resource_type=res_type,
            quantity_available=quantity,
            description=item_name,
            item_name=item_name,
            brand=payload.get("brand"),
            size=payload.get("size"),
            unit=str(payload.get("unit", "items")),
            expiry_datetime=payload.get("expiry_datetime"),
            donor_org_id=str(payload.get("donor_org_id") or donor.user_id),
            location_id=pickup_loc or str(donor.user_id),
            storage_location=pickup_loc,
            pickup_location=pickup_loc,
            latitude=float(lat_val) if lat_val is not None else None,
            longitude=float(lng_val) if lng_val is not None else None,
            pickup_otp=pickup_otp,
            dietary_metadata=DietaryMetadata(**dietary_payload) if isinstance(dietary_payload, dict) else DietaryMetadata(),
            temperature_requirements=payload.get("temperature_requirements"),
        )
        self.state.inventory.append(batch)
        self._persist(TABLE_INVENTORY, batch)
        self._record_event(
            f"Inventory donated: {batch.quantity_available} {batch.unit} of {batch.description}",
            "normal",
        )
        return batch

    def create_request(self, payload: Dict[str, object], requester: User) -> Request:
        """Record a community resource request."""

        quantity = int(payload.get("quantity_requested", payload.get("quantity", 0)) or 0)
        if quantity <= 0:
            raise ValueError("quantity_requested must be positive")

        required_by = payload.get("required_by") or (datetime.now() + timedelta(hours=24))
        dietary_payload = payload.get("dietary_restrictions") or {}
        request = Request(
            requesting_org_id=str(payload.get("requesting_org_id") or requester.user_id),
            resource_type=ResourceType(str(payload.get("resource_type", "pantry_item")).lower()),
            quantity_requested=quantity,
            urgency_level=UrgencyLevel(str(payload.get("urgency_level", "medium")).lower()),
            required_by=required_by,
            dietary_restrictions=DietaryMetadata(**dietary_payload) if dietary_payload else DietaryMetadata(),
            purpose=payload.get("purpose"),
            recipient_count=payload.get("recipient_count"),
            notes=payload.get("notes"),
            contact_person=payload.get("contact_person") or requester.name,
            contact_phone=payload.get("contact_phone"),
        )
        self.state.requests.append(request)
        self._persist(TABLE_REQUESTS, request)
        self._record_event(
            f"Request created: {request.quantity_requested} x {request.resource_type.value}",
            "normal",
        )
        return request

    def create_disaster(self, payload: Dict[str, object]) -> DisasterEvent:
        """Create admin disaster event."""

        needs_payload = payload.get("needs") or []
        disaster_id = str(payload.get("disaster_id") or f"disaster_{len(self.state.disasters)+1}")
        affected_zones = list(payload.get("affected_zones", ["south"]))
        region = _resolve_region(payload, affected_zones)
        affected_radius_km = _parse_radius(payload.get("affected_radius_km"))
        disaster = DisasterEvent(
            disaster_id=disaster_id,
            type=str(payload.get("type", "flood")),
            title=str(payload.get("title", "Flood detected")),
            description=str(payload.get("description", "")),
            affected_location=dict(payload.get("affected_location", {})),
            affected_zones=affected_zones,
            region=region,
            affected_radius_km=affected_radius_km,
            affected_communities=[str(c) for c in (payload.get("affected_communities") or [])],
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

    def report_disaster(self, reporter_id: str, payload: Dict[str, object]) -> DisasterEvent:
        """Citizen-reported disaster (any authenticated user).

        Unlike `create_disaster` (coordinator-only, goes ACTIVE immediately),
        a report always starts PENDING_VALIDATION and never auto-activates -
        `dispatch_disaster`/`assign_disaster_tasks` both refuse to act on it
        until a coordinator verifies/activates it (see
        feature/disaster-verification). This is what enforces "a normal user
        must not automatically activate a disaster."
        """

        disaster_type = str(payload.get("type") or "").strip()
        title = str(payload.get("title") or "").strip()
        affected_location = dict(payload.get("affected_location") or {})
        affected_zones = [
            str(zone).strip() for zone in (payload.get("affected_zones") or []) if str(zone).strip()
        ]

        if not disaster_type:
            raise ValueError("Disaster type is required")
        if not title:
            raise ValueError("Title is required")
        if not affected_location and not affected_zones:
            raise ValueError("A disaster report must include a location or an affected zone")

        try:
            severity = TaskPriority(str(payload.get("severity", "high")).lower())
        except ValueError as exc:
            raise ValueError(f"Invalid severity: {payload.get('severity')!r}") from exc

        region = _resolve_region(payload, affected_zones)
        affected_radius_km = _parse_radius(payload.get("affected_radius_km"))
        affected_communities = [
            str(item).strip() for item in (payload.get("affected_communities") or []) if str(item).strip()
        ]

        evidence = [str(item) for item in (payload.get("evidence") or [])]
        duplicate_of = self._find_duplicate_disaster(
            disaster_type, affected_zones, affected_location, region
        )

        disaster = DisasterEvent(
            type=disaster_type,
            title=title,
            description=str(payload.get("description") or ""),
            affected_location=affected_location,
            affected_zones=affected_zones,
            region=region,
            affected_radius_km=affected_radius_km,
            affected_communities=affected_communities,
            severity=severity,
            status=DisasterStatus.PENDING_VALIDATION,
            reported_by=reporter_id,
            created_by=reporter_id,
            evidence=evidence,
            is_duplicate=duplicate_of is not None,
            duplicate_of=duplicate_of,
        )
        self.state.disasters.append(disaster)
        self._persist(TABLE_DISASTERS, disaster)
        note = f" [possible duplicate of {duplicate_of}]" if duplicate_of else ""
        self._record_event(f"Disaster reported (pending validation): {disaster.title}{note}", "disaster")
        return disaster

    def _find_duplicate_disaster(
        self,
        disaster_type: str,
        affected_zones: List[str],
        affected_location: Dict[str, object],
        region: Optional[str] = None,
        window_hours: int = 24,
    ) -> Optional[str]:
        """Best-effort duplicate detection: same type, and (overlapping zone,
        identical location, or same canonical region), reported within the
        last `window_hours`, and not already resolved. Returns the existing
        disaster_id if found, so the new report can be flagged rather than
        silently created as if it were unrelated - it is still created (not
        dropped) so a coordinator can triage/merge it during verification.

        Comparing `region` (not just raw `affected_zones` strings) is what
        catches two reports of the same incident phrased with slightly
        different zone text but the same canonical region - the whole reason
        `region` is validated/normalized (see normalize_region) rather than
        left as free text."""

        cutoff = datetime.now() - timedelta(hours=window_hours)
        zone_set = set(affected_zones)
        for existing in self.state.disasters:
            if existing.type != disaster_type:
                continue
            if existing.status == DisasterStatus.RESOLVED:
                continue
            if existing.created_at < cutoff:
                continue
            same_zone = bool(zone_set and zone_set.intersection(existing.affected_zones))
            same_location = bool(
                affected_location and affected_location == existing.affected_location
            )
            same_region = bool(region and existing.region and region == existing.region)
            if same_zone or same_location or same_region:
                return existing.disaster_id
        return None

    def list_disasters_by_region(self, region: str) -> List[DisasterEvent]:
        """Disasters (excluding pending/rejected reports) scoped to one
        canonical region - lets a resident or coordinator see what's
        happening in their own region without seeing every other region's
        activity. Raises ValueError for an unrecognized region."""

        normalized = normalize_region(region)
        hidden = {DisasterStatus.PENDING_VALIDATION, DisasterStatus.REJECTED}
        return [
            disaster
            for disaster in self.state.disasters
            if disaster.region == normalized and disaster.status not in hidden
        ]

    def list_pending_disasters(self) -> List[DisasterEvent]:
        """Admin review queue: citizen reports awaiting verification."""

        return [
            disaster
            for disaster in self.state.disasters
            if disaster.status == DisasterStatus.PENDING_VALIDATION
        ]

    def verify_disaster(
        self,
        coordinator_id: str,
        disaster_id: str,
        notes: Optional[str] = None,
        severity_override: Optional[str] = None,
    ) -> DisasterEvent:
        """Coordinator/admin review step: PENDING_VALIDATION -> ACTIVE.

        `severity_override` lets the reviewer correct an "uncertain severity"
        a citizen reporter may have gotten wrong, without requiring a
        separate edit call. Only a PENDING_VALIDATION disaster can be
        verified - this is the only path that promotes a report to ACTIVE,
        and it always requires require_coordinator at the API layer."""

        disaster = self.get_disaster(disaster_id)
        if disaster.status != DisasterStatus.PENDING_VALIDATION:
            raise DisasterReviewStateError(
                f"Disaster {disaster_id} is '{disaster.status.value}' - only a "
                "PENDING_VALIDATION report can be verified/activated."
            )

        if severity_override:
            try:
                disaster.severity = TaskPriority(str(severity_override).lower())
            except ValueError as exc:
                raise ValueError(f"Invalid severity: {severity_override!r}") from exc

        disaster.status = DisasterStatus.ACTIVE
        disaster.reviewed_by = coordinator_id
        disaster.reviewed_at = datetime.now()
        disaster.review_notes = notes
        disaster.update_timestamp()
        self._persist(TABLE_DISASTERS, disaster)
        self._record_event(f"Disaster verified and activated: {disaster.title}", "disaster")
        return disaster

    def reject_disaster(
        self,
        coordinator_id: str,
        disaster_id: str,
        reason: str,
        notes: Optional[str] = None,
    ) -> DisasterEvent:
        """Coordinator/admin review step: PENDING_VALIDATION -> REJECTED.

        Covers false reports, incomplete reports, conflicting/duplicate
        reports, and malicious reports - `reason` records which. When
        rejecting a report already flagged as a duplicate (see
        `_find_duplicate_disaster`), its evidence is folded into the
        canonical disaster instead of being lost, so a corroborating report
        still contributes even though it doesn't become its own incident."""

        disaster = self.get_disaster(disaster_id)
        if disaster.status != DisasterStatus.PENDING_VALIDATION:
            raise DisasterReviewStateError(
                f"Disaster {disaster_id} is '{disaster.status.value}' - only a "
                "PENDING_VALIDATION report can be rejected."
            )

        reason = (reason or "").strip()
        if not reason:
            raise ValueError("A rejection reason is required")

        disaster.status = DisasterStatus.REJECTED
        disaster.reviewed_by = coordinator_id
        disaster.reviewed_at = datetime.now()
        disaster.review_notes = notes
        disaster.rejection_reason = reason
        disaster.update_timestamp()

        if reason.lower() == "duplicate" and disaster.duplicate_of:
            canonical = next(
                (d for d in self.state.disasters if d.disaster_id == disaster.duplicate_of),
                None,
            )
            if canonical is not None:
                for item in disaster.evidence:
                    if item not in canonical.evidence:
                        canonical.evidence.append(item)
                canonical.update_timestamp()
                self._persist(TABLE_DISASTERS, canonical)

        self._persist(TABLE_DISASTERS, disaster)
        self._record_event(
            f"Disaster report rejected ({disaster.rejection_reason}): {disaster.title}", "disaster"
        )
        return disaster

    def dispatch_disaster(self, disaster_id: str) -> List[VolunteerAlert]:
        """Alert nearby verified volunteers for an active disaster."""

        disaster = self.get_disaster(disaster_id)
        if not disaster.is_active:
            raise DisasterNotVerifiedError(
                f"Disaster {disaster_id} is '{disaster.status.value}' - it must be "
                "verified/active before volunteer alerts can be sent."
            )
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
        """Assign accepted volunteers to disaster tasks.

        Idempotent: a need that already has a live (non-superseded) task is
        skipped, so calling this twice for the same disaster never creates
        duplicate tasks. Volunteers already carrying an active task are
        excluded up front (belt-and-braces on top of the matcher's own
        capacity cap)."""

        disaster = self.get_disaster(disaster_id)
        if not disaster.is_active:
            raise DisasterNotVerifiedError(
                f"Disaster {disaster_id} is '{disaster.status.value}' - it must be "
                "verified/active before volunteers can be assigned to tasks."
            )
        existing_need_ids = {
            task.need_id
            for task in self.state.tasks
            if task.disaster_id == disaster_id
            and task.need_id
            and task.status != TaskLifecycle.SUPERSEDED
        }
        pending_needs = [need for need in disaster.needs if need.need_id not in existing_need_ids]
        if not pending_needs:
            return []

        accepted_ids = {
            alert.volunteer_id
            for alert in self.state.alerts
            if alert.disaster_id == disaster_id
            and alert.status == VolunteerAlertStatus.ACCEPTED
        }
        volunteers = [
            volunteer
            for volunteer in self.state.volunteers
            if volunteer.volunteer_id in accepted_ids and volunteer.current_task_count == 0
        ]
        pending_disaster = disaster.model_copy(update={"needs": pending_needs})
        tasks = self.planning.create_disaster_tasks(pending_disaster, volunteers)
        self.state.tasks.extend(tasks)
        for task in tasks:
            self._persist(TABLE_TASKS, task)
            self._bind_volunteer(task.volunteer_id)
            self.generate_task_verification_codes(task)
        self._record_event(f"Disaster tasks assigned: {len(tasks)}", "disaster")
        return tasks

    def update_task_status(self, task_id: str, status: TaskLifecycle) -> CoordinationTask:
        """Update task status. Releases the assigned volunteer's capacity
        once the task reaches a terminal state."""

        task = self.get_task(task_id)
        was_active = task.is_active
        task.status = status
        task.updated_at = datetime.now()
        self._persist(TABLE_TASKS, task)
        if was_active and not task.is_active:
            self._release_volunteer(task.volunteer_id)
        self._record_event(f"Task status changed: {task_id} -> {status.value}", task.operating_mode.value)
        return task

    def recover(self, disruption: Dict[str, object]) -> Dict[str, object]:
        """Compute a recovery plan for a disruption.

        GREEN (create_amber_decision=False, an internal/system-triggered
        repair with no meaningful tradeoff): applied immediately.

        AMBER (default): the plan is staged behind a pending Decision and
        NOT applied to operational state - no task is reassigned, and no
        original task is retired - until a coordinator calls
        approve_decision(). This is the actual safety gate; previously the
        reassignment happened here unconditionally and the Decision record
        was just an after-the-fact notification.
        """

        result = self.recovery.recover_tasks(
            self.state.tasks,
            self.state.volunteers,
            disruption,
        )

        if not disruption.get("create_amber_decision", True):
            self._apply_recovery_plan(result)
            self._record_event(
                "Recovery completed", str(disruption.get("operating_mode", "disaster"))
            )
            return {**result, "pending_approval": False}

        reason = disruption.get("reason")
        zone = disruption.get("zone")
        volunteer_id = disruption.get("volunteer_id")

        title = f"Approve recovery: {reason}" if reason else "Approve disaster recovery conflict"

        description_parts = [
            str(reason) if reason else "A disruption affected active recovery tasks.",
        ]
        if volunteer_id:
            description_parts.append(f"Volunteer {volunteer_id} unavailable.")
        if zone:
            description_parts.append(f"Zone affected: {zone}.")
        description_parts.append(
            f"{result['affected_count']} task(s) affected, "
            f"{result['repaired_count']} repair(s) proposed pending approval."
        )
        description = " ".join(description_parts)

        decision = Decision(
            decision_type=DecisionType.RECOVERY_STRATEGY,
            title=title,
            description=description,
            context={
                "triggering_event": disruption,
                "affected_count": result["affected_count"],
                "preserved_count": result["preserved_count"],
                "repaired_count": result["repaired_count"],
            },
            risk_classification=RiskClassification.AMBER,
            requires_human_approval=True,
        )
        option = decision.add_option(
            "Approve reassignment",
            "Use next-best verified volunteer and monitor completion.",
            pros=["Restores coverage quickly"],
            risks=["Adds delay to lower-priority task"],
            confidence_level=0.84,
        )
        decision.selected_option_id = option.option_id
        self.state.decisions.append(decision)
        self._persist(TABLE_DECISIONS, decision)

        # Not persisted to DynamoDB: an unapplied plan surviving a restart
        # would be stale (volunteer availability may have already changed by
        # the time anyone approves it). If the process restarts before
        # approval, approve_decision() below detects the missing plan rather
        # than silently no-op'ing.
        self._pending_recovery_plans[decision.decision_id] = result

        self._record_event(
            f"Recovery pending approval: {result['repaired_count']} task(s) proposed",
            str(disruption.get("operating_mode", "disaster")),
        )
        return {
            "preserved": result["preserved"],
            "repaired": result["repaired"],
            "superseded": result["superseded"],
            "affected_count": result["affected_count"],
            "preserved_count": result["preserved_count"],
            "repaired_count": result["repaired_count"],
            "pending_approval": True,
            "decision_id": decision.decision_id,
        }

    def _apply_recovery_plan(self, plan: Dict[str, object]) -> None:
        """Mutate operational state: add the repaired tasks, retire the
        originals they replace. The only place recovery actually changes
        `state.tasks` - called either immediately (GREEN) or from
        approve_decision (AMBER)."""

        repaired = plan["repaired"]
        superseded = plan["superseded"]
        self.state.tasks.extend(repaired)
        for task in repaired:
            self._persist(TABLE_TASKS, task)
            self._bind_volunteer(task.volunteer_id)
            self.generate_task_verification_codes(task)
        for task in superseded:
            # Same object referenced in self.state.tasks. RecoveryEngine
            # deliberately leaves it untouched during planning (see
            # RecoveryEngine.recover_tasks) - actually retiring it only
            # happens here, at the moment the plan is applied.
            freed_volunteer_id = task.volunteer_id
            task.status = TaskLifecycle.SUPERSEDED
            task.recovery_reason = task.recovery_reason or "Superseded by recovery reassignment"
            task.updated_at = datetime.now()
            # Invalidate old verification codes for superseded task
            for vcode in self.state.verification_codes:
                if vcode.task_id == task.task_id and vcode.status == VerificationStatus.PENDING:
                    vcode.invalidate()
                    self._persist(TABLE_VERIFICATION, vcode)
            self._persist(TABLE_TASKS, task)
            self._release_volunteer(freed_volunteer_id)

    def approve_decision(self, decision_id: str, coordinator_id: str) -> Decision:
        """Approve a pending decision and, for a recovery decision, execute
        its staged plan exactly once."""

        decision = self.get_decision(decision_id)
        if decision.risk_classification == RiskClassification.RED:
            raise ValueError("RED decisions cannot be approved for autonomous execution")
        if decision.human_approval is not None:
            raise ValueError("Decision has already been decided")

        if decision.decision_type == DecisionType.RECOVERY_STRATEGY:
            plan = self._pending_recovery_plans.pop(decision_id, None)
            if plan is not None:
                self._apply_recovery_plan(plan)
                decision.implementation_notes = (
                    f"Applied {plan['repaired_count']} repaired task(s)."
                )
            else:
                decision.implementation_notes = (
                    "No staged plan was found (server restarted before "
                    "approval); no tasks were changed. Re-trigger the "
                    "disruption to generate a fresh plan."
                )

        if decision.options:
            decision.selected_option_id = decision.options[0].option_id
        decision.approve(coordinator_id, "Coordinator", "coordinator")
        decision.decided_at = datetime.now()
        decision.implementation_started = True
        decision.implementation_completed = True
        self._persist(TABLE_DECISIONS, decision)
        self._record_event(f"Decision approved: {decision_id}", "disaster")
        return decision

    def reject_decision(
        self, decision_id: str, coordinator_id: str, coordinator_name: str, reason: str
    ) -> Decision:
        """Reject a pending decision. Its staged plan (if any) is discarded,
        never applied."""

        decision = self.get_decision(decision_id)
        if decision.human_approval is not None:
            raise ValueError("Decision has already been decided")

        self._pending_recovery_plans.pop(decision_id, None)
        decision.reject(coordinator_id, coordinator_name, "coordinator", reason)
        decision.decided_at = datetime.now()
        self._persist(TABLE_DECISIONS, decision)
        self._record_event(f"Decision rejected: {decision_id}", "disaster")
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

    def record_strands_audit(
        self,
        tool_name: str,
        params: Dict[str, object],
        result: object = None,
        error: Optional[str] = None,
    ) -> StrandsAuditLog:
        """Record one Strands agent tool invocation. Called from every tool
        in src/agents/strands_tools.py - this is the actual per-instruction,
        per-tool trail the audit claims; previously nothing on the live
        agent path wrote to StrandsAuditLog at all."""

        log = StrandsAuditLog(
            action_type=AuditActionType.AGENT_TOOL_EXECUTION,
            severity=AuditSeverity.ERROR if error else AuditSeverity.INFO,
            actor_type="agent",
            actor_id="strands_orchestrator",
            actor_name="NeighborNet Orchestrator",
            action_description=f"Strands agent called tool: {tool_name}",
            resource_type="strands_tool",
            resource_id=tool_name,
            event_context={"params": params},
            metadata={"result": result} if result is not None else {},
        )
        if error:
            log.add_error(error)
        self.state.strands_audit_logs.append(log)
        self._persist(TABLE_STRANDS_AUDIT_LOGS, log)
        return log

    # -- Task Verification System ----------------------------------------

    def generate_task_verification_codes(
        self, task: CoordinationTask
    ) -> Tuple[TaskVerificationCode, TaskVerificationCode]:
        """Generate unique one-time verification codes for pickup and delivery."""

        # Invalidate existing pending codes for this task
        for existing in self.state.verification_codes:
            if existing.task_id == task.task_id and existing.status == VerificationStatus.PENDING:
                existing.invalidate()
                self._persist(TABLE_VERIFICATION, existing)

        pickup_code = TaskVerificationCode(
            task_id=task.task_id,
            code_type=VerificationCodeType.PICKUP,
        )
        delivery_code = TaskVerificationCode(
            task_id=task.task_id,
            code_type=VerificationCodeType.DELIVERY,
        )

        self.state.verification_codes.extend([pickup_code, delivery_code])
        self._persist(TABLE_VERIFICATION, pickup_code)
        self._persist(TABLE_VERIFICATION, delivery_code)

        task.pickup_verification_id = pickup_code.verification_id
        task.delivery_verification_id = delivery_code.verification_id
        self._persist(TABLE_TASKS, task)

        return pickup_code, delivery_code

    def get_task_verifications(self, task_id: str) -> Dict[str, Any]:
        """Retrieve verification status and codes for a task."""

        task = self.get_task(task_id)
        codes = [c for c in self.state.verification_codes if c.task_id == task_id]

        pickup_code = next((c for c in reversed(codes) if c.code_type == VerificationCodeType.PICKUP and c.status == VerificationStatus.PENDING), None)
        if not pickup_code:
            pickup_code = next((c for c in reversed(codes) if c.code_type == VerificationCodeType.PICKUP), None)

        delivery_code = next((c for c in reversed(codes) if c.code_type == VerificationCodeType.DELIVERY and c.status == VerificationStatus.PENDING), None)
        if not delivery_code:
            delivery_code = next((c for c in reversed(codes) if c.code_type == VerificationCodeType.DELIVERY), None)

        if not pickup_code or not delivery_code:
            pickup_code, delivery_code = self.generate_task_verification_codes(task)

        return {
            "task_id": task.task_id,
            "pickup_verified": task.pickup_verified,
            "delivery_verified": task.delivery_verified,
            "status": task.status,
            "pickup_code": pickup_code.model_dump(mode="json") if pickup_code else None,
            "delivery_code": delivery_code.model_dump(mode="json") if delivery_code else None,
        }

    def verify_task_pickup(
        self, task_id: str, code_or_qr: str, volunteer_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify donation pickup using OTP or QR code."""

        task = self.get_task(task_id)
        if task.pickup_verified:
            raise ValueError("Pickup has already been verified for this task")
        if volunteer_user_id and task.donor_user_id and volunteer_user_id == task.donor_user_id:
            raise ValueError("Trust Rule Violated: Volunteer cannot verify pickup for their own donation")

        codes = [
            c for c in self.state.verification_codes
            if c.task_id == task_id and c.code_type == VerificationCodeType.PICKUP
        ]

        clean_input = code_or_qr.strip()
        matched_code = None

        for c in reversed(codes):
            if not c.is_valid:
                continue
            if clean_input in (c.otp_code, c.qr_payload):
                matched_code = c
                break
            try:
                parsed = json.loads(clean_input)
                if parsed.get("code") == c.otp_code or parsed.get("verification_id") == c.verification_id:
                    matched_code = c
                    break
            except Exception:
                pass

        if matched_code is None:
            raise ValueError("Invalid, expired, or non-matching pickup verification code")

        matched_code.mark_verified(volunteer_user_id or task.volunteer_id or "system")
        self._persist(TABLE_VERIFICATION, matched_code)

        task.pickup_verified = True
        task.status = TaskLifecycle.IN_PROGRESS
        task.update_timestamp()
        self._persist(TABLE_TASKS, task)

        self._record_event(f"Pickup verified for task {task_id}", task.operating_mode.value)
        return {
            "success": True,
            "message": "Pickup verified successfully",
            "task": task,
            "verification": matched_code.model_dump(mode="json"),
        }

    def verify_task_delivery(
        self, task_id: str, code_or_qr: str, volunteer_user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verify donation delivery using OTP or QR code."""

        task = self.get_task(task_id)
        if not task.pickup_verified:
            raise ValueError("Pickup must be verified before delivery can be verified")
        if task.delivery_verified or task.status == TaskLifecycle.COMPLETED:
            raise ValueError("Delivery has already been verified for this task")
        if volunteer_user_id and task.recipient_user_id and volunteer_user_id == task.recipient_user_id:
            raise ValueError("Trust Rule Violated: Volunteer cannot verify delivery for their own request")

        codes = [
            c for c in self.state.verification_codes
            if c.task_id == task_id and c.code_type == VerificationCodeType.DELIVERY
        ]

        clean_input = code_or_qr.strip()
        matched_code = None

        for c in reversed(codes):
            if not c.is_valid:
                continue
            if clean_input in (c.otp_code, c.qr_payload):
                matched_code = c
                break
            try:
                parsed = json.loads(clean_input)
                if parsed.get("code") == c.otp_code or parsed.get("verification_id") == c.verification_id:
                    matched_code = c
                    break
            except Exception:
                pass

        if matched_code is None:
            raise ValueError("Invalid, expired, or non-matching delivery verification code")

        matched_code.mark_verified(volunteer_user_id or task.volunteer_id or "system")
        self._persist(TABLE_VERIFICATION, matched_code)

        task.delivery_verified = True
        task.mark_completed()
        self._persist(TABLE_TASKS, task)
        self._release_volunteer(task.volunteer_id)

        if task.request_id:
            req = next((r for r in self.state.requests if r.request_id == task.request_id), None)
            if req:
                req.status = RequestStatus.FULFILLED
                self._persist(TABLE_REQUESTS, req)

        self._record_event(f"Delivery verified and task completed for task {task_id}", task.operating_mode.value)
        return {
            "success": True,
            "message": "Delivery verified and task marked completed",
            "task": task,
            "verification": matched_code.model_dump(mode="json"),
        }

    def reassign_task_volunteer(self, task_id: str, new_volunteer_id: str) -> Dict[str, Any]:
        """Reassign task to a new volunteer, invalidating old codes and generating new ones."""

        task = self.get_task(task_id)
        old_volunteer_id = task.volunteer_id

        if old_volunteer_id:
            self._release_volunteer(old_volunteer_id)

        task.assign(new_volunteer_id)
        self._bind_volunteer(new_volunteer_id)
        self._persist(TABLE_TASKS, task)

        pickup_code, delivery_code = self.generate_task_verification_codes(task)

        self._record_event(
            f"Task {task_id} reassigned to volunteer {new_volunteer_id}. Old verification codes invalidated.",
            task.operating_mode.value,
        )
        return {
            "task": task,
            "old_volunteer_id": old_volunteer_id,
            "new_volunteer_id": new_volunteer_id,
            "pickup_code": pickup_code.model_dump(mode="json"),
            "delivery_code": delivery_code.model_dump(mode="json"),
        }

    def verify_request(self, request_id: str) -> Request:
        """Verify a request's phone number, location, and duplicate check."""

        request = next((r for r in self.state.requests if r.request_id == request_id), None)
        if not request:
            raise ValueError(f"Request {request_id} not found")

        # Duplicate check: any other request with same requesting_org_id & resource_type
        duplicates = [
            r for r in self.state.requests
            if r.request_id != request_id
            and r.requesting_org_id == request.requesting_org_id
            and r.resource_type == request.resource_type
            and r.quantity_requested == request.quantity_requested
            and r.status != RequestStatus.CANCELLED
        ]

        if duplicates:
            request.is_duplicate = True
            request.request_verified = False
            self._persist(TABLE_REQUESTS, request)
            self._record_event(f"Request {request_id} flagged as duplicate of {duplicates[0].request_id}", "normal")
            raise ValueError(f"Duplicate request detected: matches existing request {duplicates[0].request_id}")

        request.phone_verified = True
        request.location_verified = True
        request.request_verified = True
        request.is_duplicate = False
        self._persist(TABLE_REQUESTS, request)
        self._record_event(f"Request {request_id} verified (Phone & Location verified)", "normal")
        return request

    def atomic_accept_task(self, task_id: str, volunteer_id: str) -> CoordinationTask:
        """Atomic thread-safe acceptance of a task by a volunteer."""

        with self._task_lock:
            task = self.get_task(task_id)

            volunteer = next((v for v in self.state.volunteers if v.volunteer_id == volunteer_id), None)
            if volunteer and not (volunteer.phone_verified and volunteer.verified):
                raise ValueError("Volunteer must have a verified phone number to accept tasks")

            # Check if task is already assigned to another volunteer
            if task.volunteer_id and task.volunteer_id != volunteer_id and task.status in (TaskLifecycle.ASSIGNED, TaskLifecycle.IN_PROGRESS, TaskLifecycle.COMPLETED):
                raise ValueError("Task has already been claimed by another volunteer")

            task.assign(volunteer_id)
            self._bind_volunteer(volunteer_id)
            self.generate_task_verification_codes(task)
            self._persist(TABLE_TASKS, task)
            self._record_event(f"Task {task_id} atomically accepted and assigned to volunteer {volunteer_id}", task.operating_mode.value)
            return task

    def report_route_telemetry(
        self, task_id: str, current_lat: float, current_lng: float, volunteer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Report live GPS telemetry and detect route deviations."""

        task = self.get_task(task_id)
        dest = task.destination or {}
        dest_lat = dest.get("lat") or dest.get("latitude") or 6.9271
        dest_lng = dest.get("lng") or dest.get("longitude") or 79.8612

        def haversine(lat1, lon1, lat2, lon2):
            R = 6371.0
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        dist_km = haversine(current_lat, current_lng, dest_lat, dest_lng)
        deviation_detected = dist_km > 5.0  # >5km deviation trigger

        if deviation_detected and not task.route_deviation_flagged:
            task.route_deviation_flagged = True
            task.route_deviation_reason = f"Major route deviation detected ({dist_km:.1f} km off-route)"
            task.status = TaskLifecycle.NEEDS_ATTENTION
            self._persist(TABLE_TASKS, task)
            self._record_event(f"Route deviation flagged for task {task_id}: {dist_km:.1f} km off-route", task.operating_mode.value)

        return {
            "task_id": task_id,
            "distance_remaining_km": round(dist_km, 2),
            "deviation_flagged": task.route_deviation_flagged,
            "deviation_reason": task.route_deviation_reason,
            "status": task.status,
        }

    def cancel_and_recover_task(self, task_id: str, volunteer_id: str, reason: str = "Cannot continue") -> Dict[str, Any]:
        """Volunteer clicks 'Cannot Continue' - task transitions to Needs Recovery and RecoveryEngine reassigns task."""

        task = self.get_task(task_id)
        self._release_volunteer(volunteer_id)

        task.status = TaskLifecycle.NEEDS_ATTENTION
        task.recovery_reason = f"Volunteer {volunteer_id} declared: {reason}"
        task.updated_at = datetime.now()
        self._persist(TABLE_TASKS, task)

        # Trigger RecoveryEngine
        disruption = {
            "task_ids": [task_id],
            "volunteer_id": volunteer_id,
            "reason": reason,
            "create_amber_decision": False,
        }
        recovery_result = self.recover(disruption)

        self._record_event(f"Task {task_id} volunteer {volunteer_id} cancelled ('Cannot Continue'). Recovery triggered.", task.operating_mode.value)
        return {
            "success": True,
            "message": "Task marked for recovery. RecoveryEngine has assigned a replacement volunteer.",
            "task": task,
            "recovery_result": recovery_result,
        }

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
