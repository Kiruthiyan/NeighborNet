"""Strands Agents SDK powered coordinator endpoint.

This is the real LLM-driven entry point: a coordinator types a natural
language instruction, the Strands agent (Amazon Bedrock model + the
deterministic coordination tools) decides which tools to call and narrates
the result. Every underlying action is still governed by the existing
deterministic engines and risk gating — see src/agents/strands_tools.py.
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.auth.dependencies import require_coordinator

router = APIRouter(dependencies=[Depends(require_coordinator)])
logger = structlog.get_logger(__name__)


class AgentInstructionRequest(BaseModel):
    instruction: str = Field(..., min_length=1, description="Natural language coordinator instruction")
    model_id: str | None = Field(default=None, description="Optional Bedrock model id override")


class AgentInstructionResponse(BaseModel):
    response: str


@router.post("/instruct", response_model=AgentInstructionResponse)
async def instruct_agent(payload: AgentInstructionRequest):
    """Send a natural-language instruction to the real Strands agent."""

    # Imported lazily so importing this router never requires AWS
    # credentials/network access unless this endpoint is actually called.
    from src.agents.strands_orchestrator import run_instruction

    try:
        response = run_instruction(payload.instruction, model_id=payload.model_id)
    except Exception as exc:  # pragma: no cover - depends on live Bedrock access
        logger.error("Strands agent call failed", error=str(exc))
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI coordinator is temporarily unavailable (Amazon Bedrock "
                "call failed). Check Bedrock model access/permissions for this "
                "AWS account and region, or try again shortly."
            ),
        ) from exc
    return AgentInstructionResponse(response=response)
