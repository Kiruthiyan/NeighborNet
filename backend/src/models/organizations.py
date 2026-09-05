"""Organization model definitions."""

from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import Field

from .base import TimestampedModel, generate_id


class OrganizationType(str, Enum):
    """Types of organizations in the system."""
    SHELTER = "shelter"
    FOOD_BANK = "food_bank"
    RESTAURANT = "restaurant"
    NONPROFIT = "nonprofit"
    WAREHOUSE = "warehouse"


class Location(TimestampedModel):
    """Location information for organizations."""
    
    address: str
    city: str = "Demo City"
    state: str = "Demo State"
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zone: str  # e.g., "north", "central", "south"
    
    # Delivery considerations
    accessible_by_vehicle: bool = True
    loading_dock: bool = False
    parking_available: bool = True
    special_instructions: Optional[str] = None


class OperatingHours(TimestampedModel):
    """Operating hours for organizations."""
    
    monday: Optional[Dict[str, str]] = None  # {"start": "09:00", "end": "17:00"}
    tuesday: Optional[Dict[str, str]] = None
    wednesday: Optional[Dict[str, str]] = None
    thursday: Optional[Dict[str, str]] = None
    friday: Optional[Dict[str, str]] = None
    saturday: Optional[Dict[str, str]] = None
    sunday: Optional[Dict[str, str]] = None
    
    # Special hours
    holidays: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    
    def is_open_at(self, day: str, time: str) -> bool:
        """Check if organization is open at given day and time."""
        day_hours = getattr(self, day.lower(), None)
        if not day_hours or not day_hours.get("start") or not day_hours.get("end"):
            return False
        
        return day_hours["start"] <= time <= day_hours["end"]


class Organization(TimestampedModel):
    """Organization model for shelters, food banks, restaurants, etc."""
    
    org_id: str = Field(default_factory=lambda: generate_id("org"))
    name: str
    type: OrganizationType
    
    # Contact information
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Location
    location: Location
    
    # Operations
    operating_hours: OperatingHours
    capacity_limits: Dict[str, Any] = Field(default_factory=dict)
    
    # Preferences and restrictions
    preferences: Dict[str, Any] = Field(default_factory=dict)
    dietary_accommodations: List[str] = Field(default_factory=list)  # vegetarian, vegan, halal, kosher
    
    # Status
    is_active: bool = True
    verified: bool = False
    
    # Specific to organization type
    special_requirements: Dict[str, Any] = Field(default_factory=dict)
