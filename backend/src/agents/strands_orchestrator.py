"""Real Strands Agents SDK orchestrator for NeighborNet Resilience.

This is the actual LLM-driven agent (built with the Strands Agents SDK,
running on Amazon Bedrock) that satisfies the hackathon requirement. It does
NOT replace the deterministic engines (VolunteerMatcher, PlanningEngine,
RecoveryEngine, RiskClassifier) — those remain the source of truth for every
matching/assignment/recovery/risk decision. The agent's job is purely to
read a natural-language coordinator instruction (e.g. "A flood just hit the
south zone, respond and get volunteers moving"), decide which deterministic
tools to call and in what order, and narrate the outcome back to a human.

Safety is enforced structurally, not by trusting the model:
- RED-tier actions have no corresponding tool, so the agent physically
  cannot invoke them.
- AMBER outcomes (see `report_disruption`) always create a pending
  `Decision` that a human must approve separately; no tool exists for the
  agent to approve its own decision.
- The agent is instantiated fresh per request (no persistent autonomy loop),
  so it never acts without a human-issued instruction.
"""

from __future__ import annotations

from typing import Optional

import boto3
from strands import Agent
from strands.models.bedrock import BedrockModel

from src.agents.strands_tools import ALL_TOOLS
from src.config import get_settings

SYSTEM_PROMPT = """You are the NeighborNet Orchestrator, an AI coordination \
assistant for a community resilience platform with two modes:

1. Normal Community Mode: match surplus food/resources to nearby compatible \
requests and assign volunteer delivery tasks.
2. Disaster Response Mode: after an admin reports a disaster, alert nearby \
verified volunteers, wait for accept/decline, then deterministically assign \
relief tasks. Recovery handles cancellations, route closures, and failures.

Hard safety rules you must always follow:
- You may only use the tools you are given. There is no tool for medical \
treatment, evacuation, rescue/authority work, unsafe travel routing, or \
entering restricted zones (RED actions) — never claim to perform these; \
tell the human coordinator to escalate to the appropriate authority instead.
- Volunteer alert acceptance only makes a volunteer ELIGIBLE. You must \
always call assign_accepted_volunteers to actually assign a task — never \
claim a task is assigned just because a volunteer accepted.
- If report_disruption creates a pending decision, you must stop and tell \
the human coordinator a decision is waiting for their approval. You must \
never claim to approve it yourself.
- Always check get_dashboard_summary or list_active_disasters first if you \
are unsure of current state before acting.
- Be concise. After acting, summarize exactly what changed (counts of \
alerts sent, tasks assigned, decisions pending) in plain language."""


def build_agent(model_id: Optional[str] = None) -> Agent:
    """Build a fresh Strands Agent wired to the deterministic coordination
    tools and an Amazon Bedrock model. Called per-request — this agent holds
    no persistent state or autonomy loop of its own."""

    settings = get_settings()
    bedrock_config = settings.get_bedrock_config()
    # Explicit session so credentials come from our settings/.env, not
    # boto3's default chain (which won't see pydantic-settings values that
    # were never exported into the process's real environment variables).
    aws_config = settings.get_aws_config()
    aws_config.pop("endpoint_url", None)  # boto3.Session() has no endpoint_url param
    aws_config["region_name"] = bedrock_config["region_name"]
    session = boto3.Session(**aws_config)
    model = BedrockModel(
        boto_session=session,
        model_id=model_id or bedrock_config["model_id"],
        temperature=bedrock_config["temperature"],
        max_tokens=bedrock_config["max_tokens"],
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=ALL_TOOLS,
        name="NeighborNet Orchestrator",
        description="LLM-driven coordinator over NeighborNet's deterministic engines",
    )


def run_instruction(instruction: str, model_id: Optional[str] = None) -> str:
    """Run one coordinator instruction through the Strands agent and return
    its final natural-language response."""

    agent = build_agent(model_id=model_id)
    result = agent(instruction)
    return str(result)
