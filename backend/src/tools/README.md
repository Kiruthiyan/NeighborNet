# NeighborNet Deterministic Tools

This directory contains the deterministic tool foundation that provides mathematical guarantees and safety validation for the Strands agents. These tools embody the core principle:

**"Strands provides the agentic intelligence and orchestration. Deterministic Python engines provide mathematical and safety guarantees."**

## Architecture Overview

The tool system is designed with the following principles:

1. **Deterministic Results**: All tools produce consistent, predictable outputs given the same inputs
2. **Safety First**: Every operation includes safety validation and risk assessment
3. **Audit Trail**: All tool executions are logged for compliance and debugging
4. **Modular Design**: Tools are organized by functional area and can be used independently
5. **Strands Integration**: Tools are exposed to Strands agents as callable functions

## Tool Categories

### 1. Inventory Tools (`inventory_tools.py`)

**Purpose**: Manage and validate inventory operations

**Key Functions**:
- `get_current_inventory()` - Query current inventory with filtering
- `get_available_inventory()` - Get inventory available for allocation
- `get_expiring_inventory()` - Find items expiring within time window
- `validate_inventory_allocation()` - Validate allocation safety and feasibility

**Example Usage**:
```python
from src.tools import get_available_inventory, validate_inventory_allocation

# Get fresh produce available for allocation
result = get_available_inventory(
    resource_type=ResourceType.FRESH_PRODUCE,
    min_quantity=10,
    exclude_expiring_hours=6
)

if result.success:
    for item in result.data:
        # Validate before allocation
        validation = validate_inventory_allocation(
            item["batch_id"], 
            quantity_to_allocate=20
        )
        if validation.valid:
            print(f"✓ Can safely allocate from {item['batch_id']}")
```

### 2. Request Tools (`request_tools.py`)

**Purpose**: Manage and prioritize resource requests

**Key Functions**:
- `get_active_requests()` - Get pending and partially fulfilled requests
- `get_urgent_requests()` - Identify time-critical requests
- `get_overdue_requests()` - Find requests past due date
- `validate_request_fulfillment()` - Validate proposed fulfillment plan

**Example Usage**:
```python
from src.tools import get_urgent_requests, validate_request_fulfillment

# Get requests requiring immediate attention
urgent = get_urgent_requests(max_hours_remaining=4)

for request in urgent.data:
    urgency_score = request.get("urgency_score", 0)
    reasons = request.get("urgency_reasons", [])
    print(f"Request {request['request_id']}: Score {urgency_score}, Reasons: {reasons}")
```

### 3. Volunteer Tools (`volunteer_tools.py`)

**Purpose**: Manage volunteer assignments and capacity

**Key Functions**:
- `get_available_volunteers()` - Find volunteers available for assignment
- `get_volunteer_capacity()` - Calculate volunteer capacity metrics
- `check_volunteer_availability()` - Validate specific time slot availability
- `validate_volunteer_assignment()` - Ensure volunteer can handle assignment

**Example Usage**:
```python
from src.tools import get_available_volunteers, check_volunteer_availability
from datetime import datetime, timedelta

# Find volunteers with vehicles in north zone
volunteers = get_available_volunteers(
    zone="north",
    has_vehicle=True,
    min_capacity=30
)

# Check specific availability
for volunteer in volunteers.data:
    tomorrow_2pm = datetime.now() + timedelta(days=1, hours=2)
    availability = check_volunteer_availability(
        volunteer["volunteer_id"],
        tomorrow_2pm,
        duration_hours=3
    )
    if availability.valid:
        print(f"✓ {volunteer['name']} available tomorrow 2PM-5PM")
```

### 4. Allocation Tools (`allocation_tools.py`)

**Purpose**: Create and validate resource allocations

**Key Functions**:
- `create_allocation()` - Create new allocation with validation
- `validate_allocation()` - Comprehensive allocation validation
- `get_allocation_conflicts()` - Detect conflicts in allocation batch
- `calculate_allocation_score()` - Score allocation quality

**Example Usage**:
```python
from src.tools import create_allocation, validate_allocation, get_allocation_conflicts

# Create high-priority allocation
allocation = create_allocation(
    request_id="req_urgent_001",
    batch_id="batch_meal_123",
    quantity=50,
    priority_score=0.95
)

# Validate multiple allocations for conflicts
proposed_allocations = [allocation.data, other_allocation]
conflicts = get_allocation_conflicts(proposed_allocations)

if not conflicts.data:
    print("✓ No conflicts detected")
else:
    for conflict in conflicts.data:
        print(f"⚠ Conflict: {conflict['description']}")
```

### 5. Safety Tools (`safety_tools.py`)

**Purpose**: Validate food safety and assess operational risks

**Key Functions**:
- `validate_food_safety()` - Check food safety compliance
- `check_dietary_compliance()` - Validate dietary restrictions
- `verify_delivery_constraints()` - Check delivery feasibility
- `assess_risk_level()` - Determine operation risk level (GREEN/AMBER/RED)

**Example Usage**:
```python
from src.tools import validate_food_safety, assess_risk_level
from datetime import datetime, timedelta

# Validate food safety for prepared meal
safety_result = validate_food_safety(
    inventory_batch_data=batch,
    delivery_context={
        "planned_delivery_time": datetime.now() + timedelta(hours=2),
        "estimated_delivery_hours": 1.5,
        "volunteer_food_handling_certified": True
    }
)

# Assess risk level for operation
risk_assessment = assess_risk_level({
    "quantity_allocated": 100,
    "expiry_datetime": (datetime.now() + timedelta(hours=4)).isoformat(),
    "recipient_count": 75
}, operation_type="allocation")

print(f"Risk Level: {risk_assessment.data.level.value}")
print(f"Confidence: {risk_assessment.data.confidence:.2f}")

# Check if safe for automatic execution
if risk_assessment.data.is_safe_for_auto_execution():
    print("✓ Safe for automatic execution")
else:
    print("⚠ Requires human approval")
    for reason in risk_assessment.data.reasons:
        print(f"  - {reason}")
```

## Safety and Risk Framework

### Risk Levels

All operations are classified into three risk levels:

- **GREEN**: Safe for automatic execution
- **AMBER**: Requires coordinator approval
- **RED**: Requires senior approval or manual intervention

### Safety Validation

Every tool includes comprehensive safety checks:

1. **Data Validation**: Input parameter validation
2. **Business Rule Validation**: Domain-specific constraints
3. **Safety Compliance**: Food safety, dietary restrictions
4. **Risk Assessment**: Operational risk evaluation
5. **Audit Logging**: Complete audit trail

### Example Safety Flow

```python
from src.tools import assess_risk_level

# Every significant operation should be risk-assessed
risk = assess_risk_level(operation_data, "allocation")

if risk.data.level == SafetyLevel.GREEN:
    # Execute automatically
    execute_operation(operation_data)
elif risk.data.level == SafetyLevel.AMBER:
    # Request coordinator approval
    await request_coordinator_approval(operation_data, risk.data)
else:  # RED
    # Escalate to senior staff
    escalate_to_senior_staff(operation_data, risk.data)
```

## Integration with Strands Agents

These tools are designed to be called by Strands agents through the standard tool interface. Each tool:

1. **Returns ToolResult objects** with success/failure, data, and metadata
2. **Provides structured error handling** with meaningful error messages
3. **Includes comprehensive logging** for audit and debugging
4. **Supports batch operations** where appropriate
5. **Maintains stateless operation** for reliability

### Strands Agent Usage Pattern

```python
# In a Strands agent
def plan_food_distribution(self, context):
    # Get urgent requests
    urgent_requests = self.call_tool("get_urgent_requests", max_hours_remaining=6)
    
    # Get available inventory
    inventory = self.call_tool("get_available_inventory", min_quantity=5)
    
    # Create allocations
    for request in urgent_requests["data"]:
        for batch in inventory["data"]:
            # Validate safety
            safety = self.call_tool("validate_food_safety", 
                inventory_batch_data=batch)
            
            if safety["data"]["valid"]:
                # Create allocation
                allocation = self.call_tool("create_allocation",
                    request_id=request["request_id"],
                    batch_id=batch["batch_id"],
                    quantity=min(request["quantity_remaining"], 
                               batch["quantity_available"])
                )
                
                # Assess risk
                risk = self.call_tool("assess_risk_level",
                    operation_data=allocation["data"],
                    operation_type="allocation"
                )
                
                # Execute based on risk level
                if risk["data"]["level"] == "green":
                    self.execute_allocation(allocation["data"])
                else:
                    self.request_human_approval(allocation["data"], risk["data"])
```

## Data Flow

```
Strands Agent Request
       ↓
Tool Input Validation
       ↓
Business Logic Execution
       ↓
Safety Validation
       ↓
Risk Assessment
       ↓
Audit Logging
       ↓
Structured Result
       ↓
Strands Agent Response
```

## Error Handling

All tools use consistent error handling:

```python
class ToolResult:
    success: bool           # Operation succeeded
    data: Any              # Result data (if success=True)
    error: str             # Error message (if success=False)
    warnings: List[str]    # Non-fatal warnings
    metadata: Dict[str, Any]  # Additional context
    timestamp: datetime    # When result was generated
```

## Testing

The tools include comprehensive test coverage:

```bash
# Run tool tests
cd backend
python -m pytest tests/test_tools.py -v

# Test specific tool category
python -m pytest tests/test_tools.py::TestInventoryTools -v

# Run end-to-end integration test
python -m pytest tests/test_tools.py::TestToolIntegration::test_end_to_end_allocation_flow -v
```

## Performance Considerations

- **Caching**: Frequently accessed data is cached to reduce database queries
- **Batch Operations**: Tools support batch processing where appropriate
- **Lazy Loading**: Large datasets are loaded only when needed
- **Async Support**: Tools can be called asynchronously by Strands agents

## Future Extensions

The tool framework is designed to be extensible:

1. **Assignment Tools**: Create and optimize delivery assignments
2. **Recovery Tools**: Handle disruptions and generate recovery plans
3. **Analytics Tools**: Generate insights and performance metrics
4. **Integration Tools**: Connect with external systems (ERP, logistics)

This deterministic tool foundation provides the mathematical guarantees and safety validation that enable Strands agents to operate autonomously while maintaining the highest standards of safety and reliability.