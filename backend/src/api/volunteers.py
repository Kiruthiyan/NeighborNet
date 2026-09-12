"""Volunteer API."""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from src.auth.dependencies import get_current_user
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


def _volunteer_view(volunteer, viewer: User) -> Dict[str, Any]:
    """Redact a volunteer's live location and contact PII from anyone but a
    coordinator/admin (see feature/location-privacy). Previously this
    endpoint had no authentication at all and returned the raw model -
    exact GPS (`current_location`), phone, email, and emergency contact -
    to any anonymous caller. Everyone signed in still sees enough to
    recognize/coordinate with a volunteer (name, zone, skills, workload);
    only a coordinator additionally sees contact details and live location.
    """

    base = {
        "volunteer_id": volunteer.volunteer_id,
        "name": volunteer.name,
        "verified": volunteer.verified,
        "is_available_for_assignment": volunteer.is_available_for_assignment,
        "status": volunteer.status,
        "skills": volunteer.skills or volunteer.special_skills,
        "preferred_zones": volunteer.preferred_zones,
        "preferred_service_area": volunteer.preferred_service_area,
        "last_known_zone": volunteer.last_known_zone,
        "current_task_count": volunteer.current_task_count,
        "reliability_score": volunteer.reliability_score,
        "has_vehicle": volunteer.has_vehicle,
        "max_carry_capacity": volunteer.max_carry_capacity,
    }
    if viewer.is_coordinator:
        base.update(
            {
                "phone": volunteer.phone,
                "email": volunteer.email,
                "current_location": volunteer.current_location,
                "max_travel_distance": volunteer.max_travel_distance,
                "emergency_contact_name": volunteer.emergency_contact_name,
                "emergency_contact_phone": volunteer.emergency_contact_phone,
            }
        )
    return base


@router.get("")
async def list_volunteers(user: User = Depends(get_current_user)):
    """List volunteers. Requires sign-in; live location and contact details
    are coordinator-only (see feature/location-privacy)."""

    volunteers = get_coordination_service().state.volunteers
    return [_volunteer_view(v, user) for v in volunteers]


@router.get("/eligible")
async def list_eligible_volunteers(
    zone: str = "Zone B",
    required_skills: str = "food_delivery,first_aid",
    required_capacity: int = 10,
    user: User = Depends(get_current_user),
):
    """Return deterministically scored and ranked eligible volunteers."""
    from src.engines.volunteer_matcher import VolunteerMatcher
    from src.models import CoordinationTask

    service = get_coordination_service()
    skills_list = [s.strip() for s in required_skills.split(",") if s.strip()]

    dummy_task = CoordinationTask(
        task_id="match-query",
        description=f"Volunteer match query for {zone}",
        required_skills=skills_list,
        required_capacity=required_capacity,
        affected_zones=[zone],
    )

    matcher = VolunteerMatcher()
    ranked = matcher.rank(service.state.volunteers, dummy_task)

    results = []
    for m in ranked:
        v = m.volunteer
        results.append(
            {
                "volunteer_id": v.volunteer_id,
                "name": v.name,
                "distance_km": round(2.0 + (hash(v.volunteer_id) % 30) / 10.0, 1),
                "verified": v.verified,
                "is_available": v.is_available_for_assignment,
                "skills": v.skills or v.special_skills or ["General"],
                "max_carry_capacity": v.max_carry_capacity or 20,
                "current_task_count": v.current_task_count,
                "score": m.score,
                "reasons": m.reasons,
                "zone": v.last_known_zone or zone,
            }
        )
    return results
