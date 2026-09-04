"""User model definitions."""

from enum import Enum
from typing import Dict, Any, Optional
from pydantic import Field

from .base import TimestampedModel, generate_id


class UserRole(str, Enum):
    """User roles in the system."""
    COORDINATOR = "coordinator"
    VOLUNTEER = "volunteer"
    DONOR = "donor"
    RECIPIENT = "recipient"


class User(TimestampedModel):
    """User model for system participants."""
    
    user_id: str = Field(default_factory=lambda: generate_id("user"))
    role: UserRole
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    contact_info: Dict[str, Any] = Field(default_factory=dict)
    
    # Authorization
    is_active: bool = True
    permissions: Dict[str, bool] = Field(default_factory=dict)
    
    # Location info
    address: Optional[str] = None
    city: str = "Demo City"
    state: str = "Demo State"
    zip_code: Optional[str] = None
