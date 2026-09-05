"""Thin write-through persistence layer over the DynamoDB tables defined in
`database.py`.

This is intentionally minimal: it does not replace `CoordinationState` (the
in-memory model everything still reads from for speed), it mirrors changes
into real DynamoDB tables so a shared team deployment sees the same data,
and reloads that data back into `CoordinationState` on startup.

Disabled by default (`PERSIST_TO_DYNAMODB=false`) so the existing test suite
and local demo keep working with zero AWS dependency. Enable it once real
AWS credentials with DynamoDB access are configured.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

import structlog

from src.config import get_settings
from src.services.database import get_database_service

logger = structlog.get_logger(__name__)


def _to_dynamo_safe(value: Any) -> Any:
    """Recursively convert a JSON-safe pydantic dump into DynamoDB-safe types
    (DynamoDB's boto3 resource API rejects native floats, requires Decimal)."""

    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: _to_dynamo_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_dynamo_safe(v) for v in value]
    return value


def _from_dynamo_safe(value: Any) -> Any:
    """Reverse of _to_dynamo_safe: Decimal back to float for pydantic parsing."""

    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {k: _from_dynamo_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_from_dynamo_safe(v) for v in value]
    return value


class DynamoStore:
    """Generic put/scan wrapper keyed by the table definitions in database.py."""

    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return self.settings.persist_to_dynamodb

    def put(self, table_name: str, item_dict: Dict[str, Any]) -> None:
        if not self.enabled:
            return
        try:
            table = get_database_service().resource.Table(table_name)
            table.put_item(Item=_to_dynamo_safe(item_dict))
        except Exception as exc:  # pragma: no cover - depends on live AWS
            logger.warning("dynamodb_put_failed", table=table_name, error=str(exc))

    def scan_all(self, table_name: str) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []
        try:
            table = get_database_service().resource.Table(table_name)
            items: List[Dict[str, Any]] = []
            response = table.scan()
            items.extend(response.get("Items", []))
            while "LastEvaluatedKey" in response:
                response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
                items.extend(response.get("Items", []))
            return [_from_dynamo_safe(item) for item in items]
        except Exception as exc:  # pragma: no cover - depends on live AWS
            logger.warning("dynamodb_scan_failed", table=table_name, error=str(exc))
            return []


_dynamo_store: DynamoStore | None = None


def get_dynamo_store() -> DynamoStore:
    global _dynamo_store
    if _dynamo_store is None:
        _dynamo_store = DynamoStore()
    return _dynamo_store
