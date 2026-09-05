"""Strands Agents SDK powered coordinator endpoint.

This is the real LLM-driven entry point: a coordinator types a natural
language instruction, the Strands agent (Amazon Bedrock model + the
deterministic coordination tools) decides which tools to call and narrates
the result. Every underlying action is still governed by the existing
deterministic engines and risk gating — see src/agents/strands_tools.py.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


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
        raise HTTPException(
            status_code=502,
            detail=(
                "Strands agent call failed. Check AWS_ACCESS_KEY_ID/"
                "AWS_SECRET_ACCESS_KEY/BEDROCK_MODEL_ID and that Bedrock model "
                f"access is enabled in your account/region. Original error: {exc}"
            ),
        ) from exc
    return AgentInstructionResponse(response=response)
