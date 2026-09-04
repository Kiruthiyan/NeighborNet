"""
Deterministic tools for Strands agents.
These tools provide mathematical guarantees and safety validation.
"""

from .inventory_tools import (
    get_current_inventory,
    get_available_inventory,
    get_expiring_inventory,
    validate_inventory_allocation
)

from .request_tools import (
    get_active_requests,
    get_urgent_requests,
    get_overdue_requests,
    validate_request_fulfillment
)

from .volunteer_tools import (
    get_available_volunteers,
    get_volunteer_capacity,
    validate_volunteer_assignment,
    check_volunteer_availability
)

from .allocation_tools import (
    create_allocation,
    validate_allocation,
    get_allocation_conflicts,
    calculate_allocation_score
)

from .safety_tools import (
    validate_food_safety,
    check_dietary_compliance,
    verify_delivery_constraints,
    assess_risk_level
)

__all__ = [
    # Inventory tools
    "get_current_inventory",
    "get_available_inventory", 
    "get_expiring_inventory",
    "validate_inventory_allocation",
    
    # Request tools
    "get_active_requests",
    "get_urgent_requests",
    "get_overdue_requests", 
    "validate_request_fulfillment",
    
    # Volunteer tools
    "get_available_volunteers",
    "get_volunteer_capacity",
    "validate_volunteer_assignment",
    "check_volunteer_availability",
    
    # Allocation tools
    "create_allocation",
    "validate_allocation",
    "get_allocation_conflicts",
    "calculate_allocation_score",
    
    # Safety tools
    "validate_food_safety",
    "check_dietary_compliance",
    "verify_delivery_constraints",
    "assess_risk_level",
]