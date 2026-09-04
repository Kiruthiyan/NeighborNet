# Evaluation Plan

## Purpose

Prove NeighborNet reduces human coordination work in both Normal Community Mode and Disaster Response Mode while preserving safety. Evaluation must use reproducible scenarios and report measured results only.

## Scenario Strategy

Build at least 100 scenarios:

- 20 normal food/resource matching scenarios
- 25 disaster volunteer dispatch scenarios
- 25 disruption recovery scenarios across both modes
- 20 safety and escalation scenarios
- 10 performance/regression scenarios

## Test Categories

Normal planning:

- standard surplus meal allocation
- urgent shelter request
- expiry prioritization
- dietary restrictions
- limited volunteer capacity
- flexible vs strict delivery windows
- route availability

Disaster dispatch:

- admin-created flood event
- affected-zone identification
- verified nearby volunteer filtering
- unavailable volunteer exclusion
- skill matching
- vehicle/capacity matching
- current workload balancing
- accept/decline handling
- no-response timeout handling
- relief task assignment after acceptance

Recovery:

- volunteer decline
- volunteer no-response
- volunteer cancellation
- donor cancellation
- resource disappearance
- road closure
- unsafe route
- task failure
- changed disaster severity
- simultaneous cancellation and route closure

Safety/escalation:

- medical treatment request blocked as RED
- evacuation instruction blocked as RED
- rescue/authority action blocked as RED
- restricted-zone entry blocked as RED
- unsafe travel blocked as RED
- uncertain route escalated as AMBER
- high-priority scarce-resource conflict escalated as AMBER
- major redistribution escalated as AMBER

Performance:

- MVP scale data
- repeated normal matching
- repeated disaster dispatch
- recovery under constrained volunteers
- dashboard metric aggregation

## Metrics

Primary:

- Human Coordination Decisions Avoided

Secondary:

- valid task/plan rate
- recovery success rate
- assignment preservation rate
- volunteer alert response rate
- volunteer matching correctness
- correct escalation rate
- constraint violations
- unsafe autonomous actions
- RED autonomous execution count
- planning time
- dispatch time
- recovery time
- unmet demand/needs

## Target Values

Targets for MVP evaluation:

- 80% or greater human coordination decisions avoided
- 95% or greater valid task/plan rate
- 70% or greater assignment preservation during recovery
- 0 unsafe autonomous actions
- 0 RED autonomous executions
- normal matching under 10 seconds at MVP scale
- disaster dispatch proposal under 30 seconds at MVP scale
- recovery proposal under 60 seconds at MVP scale

Targets are goals, not claimed results. Reports must label measured results separately.

## Reporting

Each evaluation run should output:

- scenario count and categories
- pass/fail summary
- metric table
- failures with validation errors
- volunteer alerts sent
- accept/decline/timeout counts
- autonomous GREEN count
- AMBER human decision count
- RED blocked count
- timings
- reproducibility metadata: version, seed, configuration
