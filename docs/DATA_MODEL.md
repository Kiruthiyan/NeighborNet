# Data Model

## Current Model Coverage

The repository already includes Pydantic models for users, organizations, inventory, requests, volunteers, allocations, delivery assignments, events, decisions, and Strands audit logs.

The unified plan should extend these models rather than create a separate disaster application.

## Shared Concepts

Operating mode:

- `operating_mode`: `normal` or `disaster`

Generalized task lifecycle:

- `AVAILABLE`
- `ALERTED`
- `ACCEPTED`
- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`

UI may also show `Unassigned` and `Needs Attention` as board groupings derived from status, failed validation, timeout, or human decision state.

## Core Entities

Users:

- `user_id`
- `role`: coordinator, volunteer, donor, recipient, administrator
- `name`, `email`, `phone`
- `permissions`
- timestamps

Organizations:

- `org_id`
- `name`
- `type`: shelter, food bank, restaurant, nonprofit, relief_point
- `location`
- `operating_hours`
- `capacity_limits`
- `dietary_accommodations`
- `verified`

Inventory/Resources:

- `batch_id`
- `resource_type`: prepared meal, fresh produce, pantry item, water, approved_supply
- `quantity_available`
- `quantity_allocated`
- `expiry_datetime`
- `donor_org_id`
- `location_id`
- `dietary_metadata`
- `temperature_requirements`
- `quality_checked`
- `status`

Requests/Needs:

- `request_id`
- `operating_mode`
- `requesting_org_id`
- `disaster_id` when disaster-related
- `resource_type`
- `quantity_requested`
- `quantity_fulfilled`
- `urgency_level`
- `required_by`
- `delivery_window`
- `dietary_restrictions`
- `destination_constraints`
- `status`

Volunteers:

- `volunteer_id`
- `user_id`
- `availability`
- `availability_status`
- `verified`
- `skills`: `food_delivery`, `logistics`, `driving`, `packing`, `distribution`, `first_aid_certified`
- `has_vehicle`
- `vehicle_type`
- `max_carry_capacity`
- `current_task_count`
- `preferred_service_area`
- `preferred_zones`
- `current_location` or `last_known_zone`
- `max_travel_distance`
- `notification_status`
- `reliability_score`
- `status`

DisasterEvent:

- `disaster_id`
- `type`
- `title`
- `description`
- `affected_location`
- `affected_zones`
- `severity`
- `start_time`
- `status`: `ACTIVE`, `MONITORING`, `RESOLVED`
- `needs`
- `created_by`
- `created_at`

DisasterNeed:

- `need_id`
- `disaster_id`
- `category`: food_delivery, water_distribution, shelter_support, approved_supply_transport
- `quantity`
- `priority`
- `location`
- `required_skills`
- `required_capacity`
- `status`

VolunteerAlert:

- `alert_id`
- `volunteer_id`
- `disaster_id`
- `task_category`
- `location`
- `approximate_distance`
- `urgency`
- `assistance_required`
- `status`: pending, accepted, declined, timed_out, cancelled
- `sent_at`
- `expires_at`
- `responded_at`
- `response`

Tasks/Assignments:

- `task_id`
- `operating_mode`
- `disaster_id` when applicable
- `request_id` or `need_id`
- `resource_batch_id`
- `volunteer_id`
- `pickup_location`
- `destination`
- `quantity`
- `priority`
- `expected_completion_time`
- `status`
- `validation_summary`
- `risk_classification`

Events:

- `event_id`
- `operating_mode`
- `timestamp`
- `event_type`
- `event_data`
- `impact_assessment`
- `processing_status`
- `correlation_id`

Decisions:

- `decision_id`
- `operating_mode`
- `risk_classification`: GREEN, AMBER, RED
- `decision_type`: autonomous, human approved, human rejected, held, blocked
- `context`
- `proposed_action`
- `options`
- `human_approval`
- `final_action`
- `outcome`

Audit Logs:

- `log_id`
- `timestamp`
- `correlation_id`
- `operating_mode`
- `disaster_id`
- `task_id`
- `agent_name`
- `tool_name`
- `action_type`
- `validation_result`
- `risk_class`
- `success`
- `errors`

## DynamoDB Query Patterns

- list active normal requests by status and urgency
- list active disaster events by status and affected zone
- list disaster needs by disaster and priority
- list available inventory by status and expiry
- list verified volunteers by zone, status, and availability
- list alerts by volunteer and disaster
- list tasks by status, disaster, volunteer, and operating mode
- list pending AMBER decisions
- fetch audit records by correlation ID
