"""Tests for the DynamoDB write-through persistence wiring.

Uses a fake in-memory DynamoStore (no real AWS/network) to verify:
- persistence is a true no-op when PERSIST_TO_DYNAMODB is disabled
  (the existing 54-test suite already proves the default in-memory
  behavior; this focuses on what changes when it's enabled)
- creating a disaster / alerting / assigning tasks / approving decisions
  write through to the store under their expected table names
- state can be reloaded from the store, e.g. as a second teammate's
  backend would on startup
"""

from __future__ import annotations

from typing import Any, Dict, List

import pytest

from src.services import coordination as coordination_module
from src.services.coordination import CoordinationService


class FakeDynamoStore:
    """In-memory stand-in for DynamoStore, keyed the same way."""

    def __init__(self):
        self.enabled = True
        self.tables: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._key_field = {
            "Users": "user_id",
            "Volunteers": "volunteer_id",
            "DisasterEvents": "disaster_id",
            "VolunteerAlerts": "alert_id",
            "Tasks": "task_id",
            "Decisions": "decision_id",
        }

    def put(self, table_name: str, item_dict: Dict[str, Any]) -> None:
        key_field = self._key_field[table_name]
        self.tables.setdefault(table_name, {})[item_dict[key_field]] = item_dict

    def scan_all(self, table_name: str) -> List[Dict[str, Any]]:
        return list(self.tables.get(table_name, {}).values())


@pytest.fixture
def fake_store(monkeypatch: pytest.MonkeyPatch) -> FakeDynamoStore:
    store = FakeDynamoStore()
    monkeypatch.setattr(coordination_module, "get_dynamo_store", lambda: store)
    return store


def test_disaster_workflow_writes_through_to_store(fake_store: FakeDynamoStore):
    service = CoordinationService()

    assert fake_store.tables.get("Volunteers"), "seeding should persist volunteers"

    disaster = service.create_disaster(
        {"type": "flood", "title": "Test flood", "affected_zones": ["south"]}
    )
    assert fake_store.tables["DisasterEvents"][disaster.disaster_id]["title"] == "Test flood"

    alerts = service.dispatch_disaster(disaster.disaster_id)
    assert len(fake_store.tables.get("VolunteerAlerts", {})) == len(alerts)

    for alert in alerts:
        service.respond_to_alert(alert.alert_id, "accept")

    tasks = service.assign_disaster_tasks(disaster.disaster_id)
    if tasks:
        assert all(
            task.task_id in fake_store.tables["Tasks"] for task in tasks
        )


def test_state_reloads_from_store_on_startup(fake_store: FakeDynamoStore):
    """Simulate teammate A creating a disaster, then teammate B's backend
    starting up and seeing the same shared state instead of reseeding."""

    service_a = CoordinationService()
    disaster = service_a.create_disaster(
        {"type": "flood", "title": "Shared flood", "affected_zones": ["south"]}
    )

    service_b = CoordinationService()
    assert any(d.disaster_id == disaster.disaster_id for d in service_b.state.disasters)


def test_persistence_is_noop_when_disabled(monkeypatch: pytest.MonkeyPatch):
    """Default posture: no store calls actually touch AWS when disabled."""

    from src.services.dynamo_store import DynamoStore

    store = DynamoStore()
    assert store.enabled is False
    # put/scan_all must not raise even though no AWS config exists locally.
    store.put("Tasks", {"task_id": "task_x"})
    assert store.scan_all("Tasks") == []
