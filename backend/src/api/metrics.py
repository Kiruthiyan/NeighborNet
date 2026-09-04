"""Metrics API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def get_metrics():
    """Return current measured local metrics."""

    return get_coordination_service().dashboard_readiness()
