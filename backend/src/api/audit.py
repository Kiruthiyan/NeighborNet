"""Audit API."""

from fastapi import APIRouter

from src.services.coordination import get_coordination_service


router = APIRouter()


@router.get("")
async def list_audit():
    """List local audit/activity events."""

    return get_coordination_service().state.events


@router.get("/agent")
async def list_agent_audit():
    """List per-tool-call Strands agent audit records (who/what/when/result
    for every deterministic tool the LLM invoked)."""

    return get_coordination_service().state.strands_audit_logs
