"""Volunteer model definitions."""

from datetime import datetime, time
from enum import Enum
from typing import Dict, Any, Optional, List

from pydantic import Field

from .base import TimestampedModel, generate_id


class VolunteerStatus(str, Enum):
    """Status of volunteers."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNAVAILABLE = "unavailable"
    SUSPENDED = "suspended"


class AvailabilitySlot(TimestampedModel):
    """Time slot when volunteer is available."""
    
    start_time: time
    end_time: time
    flexible: bool = False
    
    def overlaps_with(self, other_start: time, other_end: time) -> bool:
        """Check if this slot overlaps with another time range."""
        return not (self.end_time <= other_start or self.start_time >= other_end)


class VolunteerAvailability(TimestampedModel):
    """Volunteer availability schedule."""
    
    # Weekly schedule
    monday: List[AvailabilitySlot] = Field(default_factory=list)
    tuesday: List[AvailabilitySlot] = Field(default_factory=list)
    wednesday: List[AvailabilitySlot] = Field(default_factory=list)
    thursday: List[AvailabilitySlot] = Field(default_factory=list)
    friday: List[AvailabilitySlot] = Field(default_factory=list)
    saturday: List[AvailabilitySlot] = Field(default_factory=list)
    sunday: List[AvailabilitySlot] = Field(default_factory=list)
    
    # Special availability/unavailability
    special_dates: Dict[str, List[AvailabilitySlot]] = Field(default_factory=dict)
    unavailable_dates: List[str] = Field(default_factory=list)  # ISO date strings
    
    def is_available_at(self, day: str, check_time: time) -> bool:
        """Check if volunteer is available at specific day and time."""
        day_slots = getattr(self, day.lower(), [])
        for slot in day_slots:
            if slot.start_time <= check_time <= slot.end_time:
                return True
        return False


class Volunteer(TimestampedModel):
    """Volunteer model for people helping with resource distribution."""
    
    volunteer_id: str = Field(default_factory=lambda: generate_id("vol"))
    user_id: str  # Reference to User model
    
    # Personal info
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Capabilities
    has_vehicle: bool = False
    vehicle_type: Optional[str] = None  # car, truck, van, bicycle
    max_carry_capacity: Optional[int] = None  # in pounds or items
    
    # Skills and certifications
    food_handling_certified: bool = False
    languages: List[str] = Field(default_factory=list)
    special_skills: List[str] = Field(default_factory=list)  # driving, lifting, organizing
    skills: List[str] = Field(default_factory=list)  # food_delivery, logistics, driving, packing
    verified: bool = True
    phone_verified: bool = True
    
    # Geographic coverage
    preferred_zones: List[str] = Field(default_factory=list)  # north, central, south
    preferred_service_area: Optional[str] = None
    current_location: Optional[Dict[str, Any]] = None
    last_known_zone: Optional[str] = None
    max_travel_distance: Optional[float] = None  # in miles
    
    # Availability
    availability: VolunteerAvailability = Field(default_factory=VolunteerAvailability)
    
    # Experience and reliability
    total_deliveries: int = 0
    successful_deliveries: int = 0
    reliability_score: float = 1.0  # 0.0 to 1.0
    
    # Emergency contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # Status
    status: VolunteerStatus = VolunteerStatus.ACTIVE
    availability_status: str = "available"
    notification_status: str = "reachable"
    current_task_count: int = 0
    background_check_date: Optional[datetime] = None
    
    # Preferences and restrictions
    preferred_delivery_types: List[str] = Field(default_factory=list)
    cannot_handle: List[str] = Field(default_factory=list)  # heavy items, frozen, etc.
    
    @property
    def success_rate(self) -> float:
        """Calculate delivery success rate."""
        if self.total_deliveries == 0:
            return 1.0
        return self.successful_deliveries / self.total_deliveries
    
    @property
    def is_available_for_assignment(self) -> bool:
        """Check if volunteer can be assigned new tasks."""
        return (
            self.status == VolunteerStatus.ACTIVE
            and self.availability_status == "available"
            and self.verified
            and self.phone_verified
        )
    
    def can_handle_delivery(self, delivery_requirements: Dict[str, Any]) -> bool:
        """Check if volunteer can handle specific delivery requirements."""
        # Check vehicle requirement
        if delivery_requirements.get("requires_vehicle", False) and not self.has_vehicle:
            return False
        
        # Check weight capacity
        required_capacity = delivery_requirements.get("weight", 0)
        if self.max_carry_capacity and required_capacity > self.max_carry_capacity:
            return False
        
        # Check zone coverage
        delivery_zone = delivery_requirements.get("zone")
        if delivery_zone and self.preferred_zones and delivery_zone not in self.preferred_zones:
            return False
        
        # Check special requirements against restrictions
        special_requirements = delivery_requirements.get("special_requirements", [])
        for requirement in special_requirements:
            if requirement in self.cannot_handle:
                return False
        
        return True
    
    class Config:
        json_encoders = {
            VolunteerStatus: lambda v: v.value,
            time: lambda v: v.isoformat()
        }
