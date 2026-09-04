"""
Base models for NeighborNet Resilience.
Provides common functionality for all data models.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from uuid import uuid4

from pydantic import BaseModel as PydanticBaseModel, Field


class BaseModel(PydanticBaseModel):
    """Base model with common functionality."""
    
    model_config = {"from_attributes": True, "arbitrary_types_allowed": True}
    
    def to_dynamodb(self) -> Dict[str, Any]:
        """Convert model to DynamoDB item format."""
        data = self.model_dump(exclude_none=True)
        return self._serialize_for_dynamodb(data)

    @classmethod
    def _serialize_for_dynamodb(cls, value: Any) -> Any:
        """Recursively convert datetimes/enums into DynamoDB-friendly values."""

        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, Enum):
            return value.value
        if isinstance(value, list):
            return [cls._serialize_for_dynamodb(item) for item in value]
        if isinstance(value, dict):
            return {
                key: cls._serialize_for_dynamodb(item)
                for key, item in value.items()
            }
        return value
    
    @classmethod
    def from_dynamodb(cls, item: Dict[str, Any]) -> "BaseModel":
        """Create model instance from DynamoDB item."""
        # Convert ISO strings back to datetime objects for known timestamp fields
        timestamp_fields = ["created_at", "updated_at", "timestamp", "expiry_datetime", "required_by"]
        
        for field in timestamp_fields:
            if field in item and isinstance(item[field], str):
                try:
                    item[field] = datetime.fromisoformat(item[field])
                except ValueError:
                    pass  # Keep as string if not valid datetime
        
        return cls(**item)


class TimestampedModel(BaseModel):
    """Base model with automatic timestamps."""
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    def update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now()


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix."""
    unique_id = str(uuid4()).replace("-", "")[:12]
    return f"{prefix}_{unique_id}" if prefix else unique_id
