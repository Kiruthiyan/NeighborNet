"""Human decision API."""

from fastapi import APIRouter, Depends, HTTPException

from src.auth.dependencies import require_coordinator
from src.models.users import User
from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("/pending")
async def pending_decisions():
    """List pending AMBER decisions."""

    return [
        decision
        for decision in get_coordination_service().state.decisions
        if decision.requires_human_approval and not decision.human_approval
    ]


@router.get("/{decision_id}")
async def get_decision(decision_id: str):
    """Get decision."""

    try:
        return get_coordination_service().get_decision(decision_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{decision_id}/approve")
async def approve_decision(
    decision_id: str, coordinator: User = Depends(require_coordinator)
):
    """Approve AMBER decision and allow workflow resume."""

    try:
        return get_coordination_service().approve_decision(decision_id, coordinator.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{decision_id}/reject")
async def reject_decision(
    decision_id: str,
    reason: str = "Rejected by coordinator",
    coordinator: User = Depends(require_coordinator),
):
    """Reject decision."""

    try:
        return get_coordination_service().reject_decision(
            decision_id, coordinator.user_id, coordinator.name, reason
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
