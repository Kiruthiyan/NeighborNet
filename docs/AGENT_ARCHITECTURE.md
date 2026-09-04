# Agent Architecture

## Pattern

Use Strands agents-as-tools if current SDK APIs remain compatible during implementation. The NeighborNet Orchestrator delegates bounded tasks to specialist agents and treats their outputs as proposals that deterministic engines must validate.

Do not replace Strands with Amazon Bedrock Agents.

References:

- Strands overview: https://strandsagents.com/docs/user-guide/quickstart/overview/
- Strands agents-as-tools: https://strandsagents.com/docs/user-guide/concepts/multi-agent/agents-as-tools/
- Strands HumanInTheLoop: https://d3ehv1nix5p99z.cloudfront.net/pr-cms-3520/docs/user-guide/concepts/agents/interventions/human-in-the-loop/

## NeighborNet Orchestrator

Responsibilities:

- coordinate Normal Community Mode, Disaster Response Mode, and Recovery workflows
- receive events and scheduled triggers
- invoke Sentinel, Planner, and Recovery agents
- keep shared context for resources, volunteers, requests, routes, tasks, disasters, and audit
- classify decisions through deterministic `RiskClassifier`
- execute GREEN decisions only after validation
- create AMBER HITL decisions
- block RED autonomous execution
- resume workflows after coordinator decisions

## Sentinel Agent

Normal Mode:

- inventory changes
- request changes
- volunteer availability changes
- delivery failures
- donor/resource changes

Disaster Mode:

- admin-created disaster event
- affected zones
- route closures
- sudden demand
- volunteer availability changes
- task failures

Sentinel identifies affected tasks and preserves unaffected task context for Recovery. Sentinel does not execute actions.

## Planner Agent

Normal Mode:

- creates food/resource pickup and delivery tasks
- matches surplus resources to compatible requests
- selects eligible volunteers through deterministic scoring

Disaster Mode:

- creates urgent relief logistics tasks
- matches accepted volunteers to specific tasks by location, skills, capacity, workload, route safety, and priority
- treats volunteer acceptance as eligibility only

Planner output is a proposal until deterministic validation passes.

## Recovery Agent

Handles both modes:

- volunteer decline
- volunteer no-response timeout
- volunteer cancellation/unavailability
- route closure
- donor cancellation
- resource shortage/disappearance
- task failure
- changed disaster conditions

Recovery must preserve unaffected tasks whenever possible and repair only affected tasks. Whole-plan rebuild is allowed only when preservation is impossible or current state is globally invalid.

## HITL Strategy

AMBER decision cards must include:

- operating mode
- triggering event
- responsible agent
- factual evidence
- tools called
- validation results
- risk class
- concise rationale
- recommendation
- alternatives
- approval/rejection/hold controls

Do not expose hidden chain-of-thought.

RED decisions are surfaced as blocked/unsafe outcomes and never executed autonomously.

## Memory Strategy

Use AgentCore Memory only for durable operational preferences:

- preferred donor pickup windows
- coordinator-approved policy preferences
- organization delivery preferences
- recurring volunteer constraints
- preferred disaster service areas

Do not store transient scratch reasoning, hidden chain-of-thought, or full audit logs in memory.
