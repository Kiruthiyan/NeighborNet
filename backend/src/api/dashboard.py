"""Dashboard API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("/readiness")
async def get_readiness():
    """Return unified Normal + Disaster readiness."""

    return get_coordination_service().dashboard_readiness()


@router.get("/disaster-overview")
async def get_disaster_overview():
    """Return disaster overview panel data."""

    return get_coordination_service().disaster_overview()


@router.get("/activity")
async def get_activity(limit: int = 50):
    """Return recent local audit/activity events."""

    events = get_coordination_service().state.events[-limit:]
    return list(reversed(events))


@router.get("/metrics")
async def get_metrics():
    """Return current demo metrics."""

    service = get_coordination_service()
    return {
        **service.summary_counts(),
        **service.dashboard_readiness(),
    }
