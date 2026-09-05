"""Request model definitions."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional

from pydantic import Field, validator

from .base import TimestampedModel, generate_id
from .inventory import ResourceType, DietaryMetadata


class UrgencyLevel(str, Enum):
    """Urgency levels for requests."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RequestStatus(str, Enum):
    """Status of resource requests."""
    PENDING = "pending"
    ALLOCATED = "allocated"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class DeliveryWindow(TimestampedModel):
    """Preferred delivery time window."""
    
    start: datetime
    end: datetime
    
    # Flexibility
    flexible: bool = False
    notes: Optional[str] = None
    
    @validator('end')
    def validate_delivery_window(cls, v, values):
        """Ensure end time is after start time."""
        if 'start' in values and v <= values['start']:
            raise ValueError('End time must be after start time')
        return v
    
    def is_valid_delivery_time(self, delivery_time: datetime) -> bool:
        """Check if a delivery time falls within the window."""
        return self.start <= delivery_time <= self.end


class Request(TimestampedModel):
    """Resource request from organizations or individuals."""
    
    request_id: str = Field(default_factory=lambda: generate_id("req"))
    requesting_org_id: str
    
    # Request details
    resource_type: ResourceType
    quantity_requested: int
    quantity_fulfilled: int = 0
    
    # Timing
    urgency_level: UrgencyLevel = UrgencyLevel.MEDIUM
    required_by: datetime
    delivery_window: Optional[DeliveryWindow] = None
    
    # Requirements
    dietary_restrictions: DietaryMetadata = Field(default_factory=DietaryMetadata)
    special_requirements: Dict[str, Any] = Field(default_factory=dict)
    
    # Request context
    purpose: Optional[str] = None  # "emergency shelter", "weekly distribution", etc.
    recipient_count: Optional[int] = None
    notes: Optional[str] = None
    
    # Status tracking
    status: RequestStatus = RequestStatus.PENDING
    
    # Contact info for coordination
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    
    @validator('quantity_fulfilled')
    def validate_fulfilled_quantity(cls, v, values):
        """Ensure fulfilled quantity doesn't exceed requested."""
        if 'quantity_requested' in values and v > values['quantity_requested']:
            raise ValueError('Fulfilled quantity cannot exceed requested quantity')
        return v
    
    @validator('required_by')
    def validate_required_by(cls, v):
        """Ensure required_by is in the future."""
        if v <= datetime.now():
            raise ValueError('Required by date must be in the future')
        return v
    
    @property
    def quantity_remaining(self) -> int:
        """Calculate remaining unfulfilled quantity."""
        return self.quantity_requested - self.quantity_fulfilled
    
    @property
    def is_urgent(self) -> bool:
        """Check if request is urgent (high or critical priority)."""
        return self.urgency_level in [UrgencyLevel.HIGH, UrgencyLevel.CRITICAL]
    
    @property
    def is_overdue(self) -> bool:
        """Check if request is past its required_by date."""
        return datetime.now() > self.required_by
    
    def can_fulfill_with(self, inventory_batch) -> bool:
        """Check if request can be fulfilled with given inventory batch."""
        if self.resource_type != inventory_batch.resource_type:
            return False
        
        if self.quantity_remaining <= 0:
            return False
        
        # Check dietary restrictions
        if not self._matches_dietary_requirements(inventory_batch.dietary_metadata):
            return False
        
        return True
    
    def _matches_dietary_requirements(self, dietary_info: DietaryMetadata) -> bool:
        """Check if inventory matches dietary restrictions."""
        restrictions = self.dietary_restrictions
        
        # If we require vegetarian, item must be vegetarian
        if restrictions.vegetarian and not dietary_info.vegetarian:
            return False
        
        # If we require vegan, item must be vegan
        if restrictions.vegan and not dietary_info.vegan:
            return False
        
        # If we require gluten-free, item must be gluten-free
        if restrictions.gluten_free and not dietary_info.gluten_free:
            return False
        
        # Check allergen restrictions
        for allergen in restrictions.allergens:
            if allergen in dietary_info.allergens:
                return False
        
        return True
    
    class Config:
        json_encoders = {
            ResourceType: lambda v: v.value,
            UrgencyLevel: lambda v: v.value,
            RequestStatus: lambda v: v.value
        }