"""
Deterministic tools for volunteer management operations.
"""

from datetime import datetime, time
from typing import List, Dict, Any, Optional

from .base import DeterministicTool, ToolResult, ValidationResult, calculate_distance
from ..models import Volunteer, VolunteerStatus


class VolunteerQueryTool(DeterministicTool):
    """Base class for volunteer query tools."""
    
    def __init__(self, tool_name: str):
        super().__init__(tool_name)
        self.table_name = "neighbornet_volunteers"


def get_available_volunteers(
    zone: Optional[str] = None,
    has_vehicle: Optional[bool] = None,
    min_capacity: Optional[int] = None,
    required_skills: Optional[List[str]] = None
) -> ToolResult:
    """
    Get volunteers available for assignment.
    
    Args:
        zone: Filter by preferred zones
        has_vehicle: Filter by vehicle availability
        min_capacity: Minimum carry capacity
        required_skills: Required skills
        
    Returns:
        ToolResult with available volunteers
    """
    tool = GetAvailableVolunteersTool()
    return tool.execute(
        zone=zone,
        has_vehicle=has_vehicle,
        min_capacity=min_capacity,
        required_skills=required_skills or []
    )


class GetAvailableVolunteersTool(VolunteerQueryTool):
    """Tool to get available volunteers."""
    
    def __init__(self):
        super().__init__("get_available_volunteers")
    
    def _validate_inputs(self, zone=None, has_vehicle=None, min_capacity=None, required_skills=None) -> ToolResult:
        """Validate inputs."""
        if min_capacity is not None and min_capacity < 0:
            return ToolResult.error_result("min_capacity cannot be negative")
        return ToolResult.success_result()
    
    def _execute_internal(self, zone=None, has_vehicle=None, min_capacity=None, required_skills=None) -> ToolResult:
        """Get available volunteers."""
        try:
            volunteers = self._mock_volunteer_query()
            available_volunteers = []
            
            for volunteer_data in volunteers:
                volunteer = Volunteer.from_dynamodb(volunteer_data)
                
                # Check basic availability
                if not volunteer.is_available_for_assignment:
                    continue
                
                # Apply filters
                if zone and zone not in volunteer.preferred_zones:
                    continue
                
                if has_vehicle is not None and volunteer.has_vehicle != has_vehicle:
                    continue
                
                if min_capacity is not None:
                    if not volunteer.max_carry_capacity or volunteer.max_carry_capacity < min_capacity:
                        continue
                
                # Check required skills
                if required_skills:
                    if not all(skill in volunteer.special_skills for skill in required_skills):
                        continue
                
                # Add availability score
                volunteer_data["availability_score"] = self._calculate_availability_score(volunteer)
                available_volunteers.append(volunteer_data)
            
            # Sort by availability score (highest first)
            available_volunteers.sort(key=lambda v: v.get("availability_score", 0), reverse=True)
            
            metadata = {
                "total_available": len(available_volunteers),
                "query_filters": {
                    "zone": zone,
                    "has_vehicle": has_vehicle,
                    "min_capacity": min_capacity,
                    "required_skills": required_skills
                }
            }
            
            return ToolResult.success_result(available_volunteers, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to query volunteers: {str(e)}")
    
    def _mock_volunteer_query(self) -> List[Dict[str, Any]]:
        """Mock volunteer query for demo."""
        from ..services.seed_data import generate_seed_data
        
        seed_data = generate_seed_data()
        return [volunteer.to_dynamodb() for volunteer in seed_data["volunteers"]]
    
    def _calculate_availability_score(self, volunteer: Volunteer) -> float:
        """Calculate volunteer availability score."""
        score = 0.0
        
        # Base score from reliability
        score += volunteer.reliability_score * 0.4
        
        # Success rate bonus
        score += volunteer.success_rate * 0.3
        
        # Experience bonus
        if volunteer.total_deliveries > 20:
            score += 0.2
        elif volunteer.total_deliveries > 10:
            score += 0.1
        
        # Vehicle bonus
        if volunteer.has_vehicle:
            score += 0.1
        
        # Certification bonus
        if volunteer.food_handling_certified:
            score += 0.05
        
        return min(1.0, score)


def get_volunteer_capacity(
    volunteer_ids: Optional[List[str]] = None,
    time_window_hours: int = 24
) -> ToolResult:
    """
    Get volunteer capacity information.
    
    Args:
        volunteer_ids: Specific volunteers to check (if None, check all)
        time_window_hours: Time window to check capacity for
        
    Returns:
        ToolResult with capacity information
    """
    tool = GetVolunteerCapacityTool()
    return tool.execute(volunteer_ids=volunteer_ids, time_window_hours=time_window_hours)


class GetVolunteerCapacityTool(VolunteerQueryTool):
    """Tool to get volunteer capacity."""
    
    def __init__(self):
        super().__init__("get_volunteer_capacity")
    
    def _validate_inputs(self, volunteer_ids=None, time_window_hours=24) -> ToolResult:
        """Validate inputs."""
        if time_window_hours <= 0:
            return ToolResult.error_result("time_window_hours must be positive")
        return ToolResult.success_result()
    
    def _execute_internal(self, volunteer_ids=None, time_window_hours=24) -> ToolResult:
        """Get volunteer capacity information."""
        try:
            volunteers = self._mock_volunteer_query()
            capacity_info = []
            
            for volunteer_data in volunteers:
                volunteer = Volunteer.from_dynamodb(volunteer_data)
                
                # Filter by IDs if specified
                if volunteer_ids and volunteer.volunteer_id not in volunteer_ids:
                    continue
                
                # Calculate capacity
                capacity = self._calculate_volunteer_capacity(volunteer, time_window_hours)
                capacity_info.append({
                    "volunteer_id": volunteer.volunteer_id,
                    "name": volunteer.name,
                    "status": volunteer.status.value,
                    "has_vehicle": volunteer.has_vehicle,
                    "max_carry_capacity": volunteer.max_carry_capacity,
                    "reliability_score": volunteer.reliability_score,
                    **capacity
                })
            
            # Sort by total capacity (highest first)
            capacity_info.sort(key=lambda c: c.get("total_capacity_score", 0), reverse=True)
            
            metadata = {
                "volunteers_analyzed": len(capacity_info),
                "time_window_hours": time_window_hours,
                "total_capacity": sum(c.get("total_capacity_score", 0) for c in capacity_info)
            }
            
            return ToolResult.success_result(capacity_info, **metadata)
            
        except Exception as e:
            return ToolResult.error_result(f"Failed to calculate volunteer capacity: {str(e)}")
    
    def _calculate_volunteer_capacity(self, volunteer: Volunteer, hours: int) -> Dict[str, Any]:
        """Calculate volunteer capacity metrics."""
        # Count available time slots in the next period
        available_hours = self._count_available_hours(volunteer, hours)
        
        # Calculate delivery capacity
        avg_delivery_time = 2.0  # Assume 2 hours per delivery on average
        estimated_deliveries = available_hours / avg_delivery_time if available_hours > 0 else 0
        
        # Weight capacity
        weight_capacity = volunteer.max_carry_capacity or 0
        
        # Overall capacity score
        capacity_score = (
            (estimated_deliveries * 0.4) +
            (weight_capacity / 100 * 0.3) +  # Normalize weight to 0-1 scale
            (volunteer.reliability_score * 0.3)
        )
        
        return {
            "available_hours": available_hours,
            "estimated_deliveries": int(estimated_deliveries),
            "weight_capacity": weight_capacity,
            "total_capacity_score": capacity_score,
            "capacity_details": {
                "has_vehicle": volunteer.has_vehicle,
                "preferred_zones": volunteer.preferred_zones,
                "special_skills": volunteer.special_skills,
                "food_handling_certified": volunteer.food_handling_certified
            }
        }
    
    def _count_available_hours(self, volunteer: Volunteer, window_hours: int) -> float:
        """Count available hours in the time window."""
        # Simplified calculation - in reality this would check actual availability
        # against current assignments and calendar
        
        # Count weekly availability
        weekly_hours = 0
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for day in days:
            day_slots = getattr(volunteer.availability, day, [])
            for slot in day_slots:
                # Calculate hours for this slot
                start_hour = slot.start_time.hour + slot.start_time.minute / 60
                end_hour = slot.end_time.hour + slot.end_time.minute / 60
                weekly_hours += end_hour - start_hour
        
        # Scale to the requested window
        if window_hours <= 168:  # Within a week
            return (weekly_hours / 168) * window_hours
        else:
            # Multiple weeks
            weeks = window_hours / 168
            return weekly_hours * weeks


def check_volunteer_availability(
    volunteer_id: str,
    proposed_time: datetime,
    duration_hours: float = 2.0
) -> ValidationResult:
    """
    Check if a volunteer is available at a specific time.
    
    Args:
        volunteer_id: ID of volunteer to check
        proposed_time: Proposed assignment time
        duration_hours: Expected duration of assignment
        
    Returns:
        ValidationResult indicating availability
    """
    tool = CheckVolunteerAvailabilityTool()
    result = tool.execute(
        volunteer_id=volunteer_id,
        proposed_time=proposed_time,
        duration_hours=duration_hours
    )
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Availability check failed"])


class CheckVolunteerAvailabilityTool(VolunteerQueryTool):
    """Tool to check volunteer availability."""
    
    def __init__(self):
        super().__init__("check_volunteer_availability")
    
    def _validate_inputs(self, volunteer_id=None, proposed_time=None, duration_hours=2.0) -> ToolResult:
        """Validate inputs."""
        if not volunteer_id:
            return ToolResult.error_result("volunteer_id is required")
        
        if not proposed_time:
            return ToolResult.error_result("proposed_time is required")
        
        if duration_hours <= 0:
            return ToolResult.error_result("duration_hours must be positive")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, volunteer_id, proposed_time, duration_hours) -> ToolResult:
        """Check volunteer availability."""
        try:
            # Get volunteer
            volunteers = self._mock_volunteer_query()
            volunteer_data = None
            
            for v_data in volunteers:
                if v_data.get("volunteer_id") == volunteer_id:
                    volunteer_data = v_data
                    break
            
            if not volunteer_data:
                return ToolResult.error_result(f"Volunteer {volunteer_id} not found")
            
            volunteer = Volunteer.from_dynamodb(volunteer_data)
            validation = ValidationResult.valid_result()
            
            # Check basic status
            if not volunteer.is_available_for_assignment:
                validation.add_issue(f"Volunteer status is {volunteer.status.value}", 1.0)
            
            # Check schedule availability
            day_name = proposed_time.strftime("%A").lower()
            proposed_start_time = proposed_time.time()
            
            # Calculate end time
            from datetime import timedelta
            end_datetime = proposed_time + timedelta(hours=duration_hours)
            proposed_end_time = end_datetime.time()
            
            # Check if time falls within availability
            availability_check = self._check_time_availability(
                volunteer, day_name, proposed_start_time, proposed_end_time
            )
            
            if not availability_check["available"]:
                validation.add_issue("Time conflicts with volunteer schedule", 0.8)
                validation.add_issue(availability_check["reason"], 0.2)
            
            # Check for potential conflicts (simplified)
            conflict_check = self._check_assignment_conflicts(volunteer_id, proposed_time, duration_hours)
            if conflict_check["has_conflicts"]:
                for conflict in conflict_check["conflicts"]:
                    validation.add_issue(f"Scheduling conflict: {conflict}", 0.5)
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Availability check failed: {str(e)}")
    
    def _check_time_availability(self, volunteer: Volunteer, day: str, start_time: time, end_time: time) -> Dict[str, Any]:
        """Check if volunteer is available during specified time."""
        day_slots = getattr(volunteer.availability, day, [])
        
        if not day_slots:
            return {
                "available": False,
                "reason": f"No availability on {day}"
            }
        
        # Check if requested time overlaps with any available slot
        for slot in day_slots:
            # Check if the requested time window fits within this slot
            if (slot.start_time <= start_time and 
                slot.end_time >= end_time):
                return {
                    "available": True,
                    "matching_slot": f"{slot.start_time}-{slot.end_time}"
                }
        
        return {
            "available": False,
            "reason": f"No available slot covers {start_time}-{end_time}"
        }
    
    def _check_assignment_conflicts(self, volunteer_id: str, proposed_time: datetime, duration_hours: float) -> Dict[str, Any]:
        """Check for conflicts with existing assignments."""
        # In a real implementation, this would query the assignments table
        # For now, return no conflicts
        return {
            "has_conflicts": False,
            "conflicts": []
        }


def validate_volunteer_assignment(
    volunteer_id: str,
    assignment_details: Dict[str, Any]
) -> ValidationResult:
    """
    Validate if a volunteer can handle a specific assignment.
    
    Args:
        volunteer_id: ID of volunteer
        assignment_details: Details of proposed assignment
        
    Returns:
        ValidationResult indicating if assignment is valid
    """
    tool = ValidateVolunteerAssignmentTool()
    result = tool.execute(volunteer_id=volunteer_id, assignment_details=assignment_details)
    
    if result.success:
        return result.data
    else:
        return ValidationResult.invalid_result([result.error or "Assignment validation failed"])


class ValidateVolunteerAssignmentTool(VolunteerQueryTool):
    """Tool to validate volunteer assignment."""
    
    def __init__(self):
        super().__init__("validate_volunteer_assignment")
    
    def _validate_inputs(self, volunteer_id=None, assignment_details=None) -> ToolResult:
        """Validate inputs."""
        if not volunteer_id:
            return ToolResult.error_result("volunteer_id is required")
        
        if not assignment_details:
            return ToolResult.error_result("assignment_details is required")
        
        return ToolResult.success_result()
    
    def _execute_internal(self, volunteer_id, assignment_details) -> ToolResult:
        """Validate the assignment."""
        try:
            # Get volunteer
            volunteers = self._mock_volunteer_query()
            volunteer_data = None
            
            for v_data in volunteers:
                if v_data.get("volunteer_id") == volunteer_id:
                    volunteer_data = v_data
                    break
            
            if not volunteer_data:
                return ToolResult.error_result(f"Volunteer {volunteer_id} not found")
            
            volunteer = Volunteer.from_dynamodb(volunteer_data)
            validation = ValidationResult.valid_result()
            
            # Check if volunteer can handle the assignment requirements
            can_handle = volunteer.can_handle_delivery(assignment_details)
            if not can_handle:
                validation.add_issue("Volunteer cannot handle assignment requirements", 0.8)
            
            # Check specific requirements
            requirement_issues = self._validate_assignment_requirements(volunteer, assignment_details)
            for issue in requirement_issues:
                validation.add_issue(issue, 0.3)
            
            # Check workload
            workload_issues = self._validate_workload(volunteer, assignment_details)
            for issue in workload_issues:
                validation.add_issue(issue, 0.2)
            
            return ToolResult.success_result(validation)
            
        except Exception as e:
            return ToolResult.error_result(f"Assignment validation failed: {str(e)}")
    
    def _validate_assignment_requirements(self, volunteer: Volunteer, details: Dict[str, Any]) -> List[str]:
        """Validate specific assignment requirements."""
        issues = []
        
        # Check vehicle requirement
        if details.get("requires_vehicle", False) and not volunteer.has_vehicle:
            issues.append("Assignment requires vehicle but volunteer doesn't have one")
        
        # Check weight capacity
        weight = details.get("total_weight", 0)
        if volunteer.max_carry_capacity and weight > volunteer.max_carry_capacity:
            issues.append(f"Assignment weight ({weight}) exceeds volunteer capacity ({volunteer.max_carry_capacity})")
        
        # Check zone coverage
        zone = details.get("delivery_zone")
        if zone and volunteer.preferred_zones and zone not in volunteer.preferred_zones:
            issues.append(f"Delivery zone '{zone}' not in volunteer's preferred zones")
        
        # Check special requirements
        special_reqs = details.get("special_requirements", [])
        for req in special_reqs:
            if req in volunteer.cannot_handle:
                issues.append(f"Volunteer cannot handle special requirement: {req}")
        
        return issues
    
    def _validate_workload(self, volunteer: Volunteer, details: Dict[str, Any]) -> List[str]:
        """Validate volunteer workload."""
        issues = []
        
        # Check delivery count
        delivery_count = details.get("delivery_count", 1)
        estimated_time = delivery_count * 2  # 2 hours per delivery
        
        if estimated_time > 8:
            issues.append(f"Assignment duration ({estimated_time}h) may be too long")
        
        # Check distance
        total_distance = details.get("total_distance", 0)
        if volunteer.max_travel_distance and total_distance > volunteer.max_travel_distance:
            issues.append(f"Total distance ({total_distance} miles) exceeds volunteer preference ({volunteer.max_travel_distance} miles)")
        
        return issues


# Create singleton instances
_get_available_volunteers_tool = GetAvailableVolunteersTool()
_get_volunteer_capacity_tool = GetVolunteerCapacityTool()
_check_volunteer_availability_tool = CheckVolunteerAvailabilityTool()
_validate_volunteer_assignment_tool = ValidateVolunteerAssignmentTool()

# Expose the functions
get_available_volunteers = _get_available_volunteers_tool.execute
get_volunteer_capacity = _get_volunteer_capacity_tool.execute
check_volunteer_availability = _check_volunteer_availability_tool.execute
validate_volunteer_assignment = _validate_volunteer_assignment_tool.execute