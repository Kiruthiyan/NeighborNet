"""Inventory model definitions."""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List

from pydantic import Field, field_validator, validator

from .base import TimestampedModel, generate_id
from .disasters import normalize_region


class ResourceType(str, Enum):
    """Types of resources in inventory."""
    PREPARED_MEAL = "prepared_meal"
    FRESH_PRODUCE = "fresh_produce"
    PANTRY_ITEM = "pantry_item"
    FROZEN_FOOD = "frozen_food"
    DAIRY = "dairy"
    BEVERAGES = "beverages"
    FOOD = "food"
    WATER = "water"
    MEDICAL = "medical"
    CLOTHING = "clothing"
    EQUIPMENT = "equipment"


class InventoryStatus(str, Enum):
    """Status of inventory items."""
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    RESERVED = "reserved"
    EXPIRED = "expired"
    CONSUMED = "consumed"
    DAMAGED = "damaged"
    CANCELLED = "cancelled"


class DietaryMetadata(TimestampedModel):
    """Dietary information for food items."""
    
    vegetarian: bool = False
    vegan: bool = False
    gluten_free: bool = False
    dairy_free: bool = False
    nut_free: bool = False
    halal: bool = False
    kosher: bool = False
    
    # Allergen information
    allergens: List[str] = Field(default_factory=list)  # nuts, dairy, eggs, soy, etc.
    
    # Nutritional info (optional)
    calories_per_serving: Optional[int] = None
    servings: Optional[int] = None
    
    # Special dietary notes
    notes: Optional[str] = None


class InventoryBatch(TimestampedModel):
    """Individual batch of inventory items."""
    
    batch_id: str = Field(default_factory=lambda: generate_id("batch"))
    resource_type: ResourceType
    
    # Quantities
    quantity_available: int
    quantity_allocated: int = 0
    quantity_reserved: int = 0
    
    # Item details
    description: str
    item_name: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    unit: str = "items"  # items, pounds, servings, etc.
    
    # Timing
    expiry_datetime: Optional[datetime] = None
    received_datetime: datetime = Field(default_factory=datetime.now)
    
    # Source information
    donor_org_id: str
    donation_reference: Optional[str] = None
    
    # Location
    location_id: str
    storage_location: Optional[str] = None  # specific location within facility
    # Canonical region (feature/cross-region-assistance), optional/unset for
    # older records - see normalize_region. Lets cross-region matching find
    # surplus in another region without guessing from free-text fields.
    region: Optional[str] = None
    pickup_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Pickup Verification OTP
    pickup_otp: Optional[str] = None
    
    # Food safety
    dietary_metadata: DietaryMetadata = Field(default_factory=DietaryMetadata)
    temperature_requirements: Optional[str] = None  # refrigerated, frozen, room_temp
    
    # Status
    status: InventoryStatus = InventoryStatus.AVAILABLE
    
    # Quality assurance
    quality_checked: bool = False
    quality_notes: Optional[str] = None
    
    @validator('quantity_allocated')
    def validate_allocated_quantity(cls, v, values):
        """Ensure allocated quantity doesn't exceed available."""
        if 'quantity_available' in values and v > values['quantity_available']:
            raise ValueError('Allocated quantity cannot exceed available quantity')
        return v
    
    @property
    def quantity_unallocated(self) -> int:
        """Calculate remaining unallocated quantity."""
        return self.quantity_available - self.quantity_allocated - self.quantity_reserved
    
    @property
    def is_expired(self) -> bool:
        """Check if the batch is expired."""
        if not self.expiry_datetime:
            return False
        return datetime.now() > self.expiry_datetime
    
    def expires_soon(self, hours: int = 24) -> bool:
        """Check if the batch expires within specified hours."""
        if not self.expiry_datetime:
            return False
        from datetime import timedelta
        return datetime.now() + timedelta(hours=hours) > self.expiry_datetime
    
    def can_allocate(self, quantity: int) -> bool:
        """Check if specified quantity can be allocated."""
        return (
            self.status == InventoryStatus.AVAILABLE and
            not self.is_expired and
            self.quantity_unallocated >= quantity
        )

    @field_validator("region")
    @classmethod
    def _validate_region(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return normalize_region(value)

    class Config:
        json_encoders = {
            ResourceType: lambda v: v.value,
            InventoryStatus: lambda v: v.value
        }


# Alias for backward compatibility
Inventory = InventoryBatch
