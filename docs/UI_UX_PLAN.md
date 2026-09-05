# UI/UX Plan

## Product Direction

The main interface is a professional operations dashboard, not a chatbot. It should show one NeighborNet system with Normal Community Mode and Disaster Response Mode, sharing the same resources, volunteers, tasks, decisions, and audit trail.

## Required Pages

- Dashboard
- Resources
- Requests
- Volunteers
- Active Plan/Tasks
- Disruptions
- Decisions
- Activity/Audit
- Evaluations
- Settings/Policies

## Main Dashboard

Show:

- operating mode status
- Community Readiness
- active requests/needs
- resolved automatically
- inventory/resources
- active volunteers
- routes
- active disasters
- disruptions detected
- disruptions recovered
- pending human decisions
- human decisions avoided

Use dense, calm operational layout. Avoid marketing hero screens and chatbot-first framing.

## Disaster Overview

Show:

- active disaster
- affected zones
- severity
- needs: food delivery, water distribution, shelter support
- nearby volunteers
- volunteers alerted
- volunteers accepted
- tasks assigned
- tasks completed
- unresolved tasks
- recovery actions

## Volunteer Response Panel

Show:

- volunteer
- distance
- availability
- verification status
- skill match
- vehicle/capacity fit
- current workload
- alert response
- assigned task
- task status

## Disaster Task Board

Columns:

- Unassigned
- Accepted
- Assigned
- In Progress
- Completed
- Needs Attention

Cards should show task category, pickup, destination, quantity, priority, expected completion time, assigned volunteer, validation state, and risk class.

## Active Plan/Tasks

Show both normal and disaster tasks:

- plan/task status and validation state
- assignments grouped by route, volunteer, recipient, or disaster
- preserved tasks after disruptions
- changed tasks with before/after comparison
- unmet demand and constraint warnings

## Decisions

Decision cards must show:

- operating mode
- triggering event
- responsible agent
- tools called
- factual evidence
- validation results
- risk class
- concise rationale
- recommendation and alternatives
- approve, reject, and hold actions for AMBER only

Do not expose hidden chain-of-thought.

## Activity/Audit

Show searchable timeline:

- events received
- disaster created
- alerts sent
- volunteer responses
- agent invoked
- tool calls
- validations
- task assignment
- recovery action
- risk classifications
- autonomous executions
- human decisions
- blocked RED actions

## Responsive Behavior

- Desktop: sidebar navigation plus dense work area.
- Tablet: collapsible navigation and two-column operational panels.
- Mobile: stacked pages optimized for status review, alert response, and AMBER approval.
- Text must not overlap; buttons and status chips need stable dimensions.
