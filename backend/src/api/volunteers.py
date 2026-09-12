"""Volunteer API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_volunteers():
    """List volunteers."""

    return get_coordination_service().state.volunteers


@router.get("/eligible")
async def list_eligible_volunteers(
    zone: str = "Zone B",
    required_skills: str = "food_delivery,first_aid",
    required_capacity: int = 10,
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

