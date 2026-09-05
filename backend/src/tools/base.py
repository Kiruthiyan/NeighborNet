"""
Base classes and utilities for deterministic tools.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from ..models import StrandsAuditLog, AuditActionType, AuditSeverity


class ToolResult:
    """Base result class for tool operations."""
    
    def __init__(
        self, 
        success: bool, 
        data: Any = None, 
        error: str = None,
        warnings: List[str] = None,
        metadata: Dict[str, Any] = None
    ):
        self.success = success
        self.data = data
        self.error = error
        self.warnings = warnings or []
        self.metadata = metadata or {}
        self.timestamp = datetime.now()
    
    def add_warning(self, warning: str) -> None:
        """Add a warning message."""
        self.warnings.append(warning)
    
    def add_metadata(self, key: str, value: Any) -> None:
        """Add metadata."""
        self.metadata[key] = value
    
    @classmethod
    def success_result(cls, data: Any = None, **metadata) -> "ToolResult":
        """Create a success result."""
        return cls(success=True, data=data, metadata=metadata)
    
    @classmethod 
    def error_result(cls, error: str, **metadata) -> "ToolResult":
        """Create an error result."""
        return cls(success=False, error=error, metadata=metadata)


class ValidationResult:
    """Result of validation operations."""
    
    def __init__(self, valid: bool, issues: List[str] = None, score: float = 1.0):
        self.valid = valid
        self.issues = issues or []
        self.score = score  # 0.0 to 1.0, where 1.0 is perfect
        
    def add_issue(self, issue: str, severity: float = 0.1) -> None:
        """Add a validation issue and adjust score."""
        self.issues.append(issue)
        self.score = max(0.0, self.score - severity)
        if len(self.issues) > 0:
            self.valid = False
    
    @classmethod
    def valid_result(cls, score: float = 1.0) -> "ValidationResult":
        """Create a valid result.""" 
        return cls(valid=True, score=score)
    
    @classmethod
    def invalid_result(cls, issues: List[str], score: float = 0.0) -> "ValidationResult":
        """Create an invalid result."""
        return cls(valid=False, issues=issues, score=score)


class SafetyLevel(Enum):
    """Safety levels for operations."""
    GREEN = "green"     # Safe for automatic execution
    AMBER = "amber"     # Requires coordinator approval
    RED = "red"         # Requires senior approval or manual intervention


@dataclass
class SafetyAssessment:
    """Safety assessment result."""
    level: SafetyLevel
    confidence: float  # 0.0 to 1.0
    reasons: List[str]
    recommendations: List[str]
    
    def is_safe_for_auto_execution(self) -> bool:
        """Check if operation is safe for automatic execution."""
        return self.level == SafetyLevel.GREEN and self.confidence >= 0.8


class DeterministicTool(ABC):
    """Base class for deterministic tools."""
    
    def __init__(self, tool_name: str):
        self.tool_name = tool_name
        self.execution_count = 0
        self.last_execution = None
    
    def execute(self, *args, **kwargs) -> ToolResult:
        """Execute the tool with audit logging."""
        try:
            self.execution_count += 1
            self.last_execution = datetime.now()
            
            # Validate inputs
            validation = self._validate_inputs(*args, **kwargs)
            if not validation.success:
                return validation
            
            # Execute the tool logic
            result = self._execute_internal(*args, **kwargs)
            
            # Log execution
            self._log_execution(result, *args, **kwargs)
            
            return result
            
        except Exception as e:
            error_result = ToolResult.error_result(f"Tool execution failed: {str(e)}")
            self._log_execution(error_result, *args, **kwargs)
            return error_result
    
    @abstractmethod
    def _execute_internal(self, *args, **kwargs) -> ToolResult:
        """Internal tool execution logic to be implemented by subclasses."""
        pass
    
    def _validate_inputs(self, *args, **kwargs) -> ToolResult:
        """Validate tool inputs. Override in subclasses for specific validation."""
        return ToolResult.success_result()
    
    def _log_execution(self, result: ToolResult, *args, **kwargs) -> None:
        """Log tool execution for audit purposes.""" 
        try:
            severity = AuditSeverity.ERROR if not result.success else AuditSeverity.INFO
            
            audit_log = StrandsAuditLog.log_system_action(
                action_description=f"Executed tool: {self.tool_name}",
                action_type=AuditActionType.AGENT_TOOL_EXECUTION,
                severity=severity
            )
            
            audit_log.metadata.update({
                "tool_name": self.tool_name,
                "execution_count": self.execution_count,
                "execution_time": self.last_execution.isoformat(),
                "success": result.success,
                "input_args": str(args)[:200],  # Truncate long args
                "input_kwargs": {k: str(v)[:100] for k, v in kwargs.items()},  # Truncate long values
            })
            
            if not result.success:
                audit_log.add_error(result.error or "Unknown error")
            
            if result.warnings:
                audit_log.metadata["warnings"] = result.warnings
                
            # Note: In a real implementation, this would be saved to DynamoDB
            # For now, we'll just create the audit log object
            
        except Exception as e:
            # Don't let audit logging failure break the tool
            pass


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate approximate distance between two points using Haversine formula.
    Returns distance in miles.
    """
    import math
    
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in miles
    r = 3956
    
    return c * r


def calculate_time_overlap(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> float:
    """
    Calculate overlap between two time periods.
    Returns overlap duration in hours.
    """
    # Find the overlap period
    overlap_start = max(start1, start2)
    overlap_end = min(end1, end2)
    
    # If there's no overlap, return 0
    if overlap_start >= overlap_end:
        return 0.0
    
    # Calculate overlap duration in hours
    overlap_duration = overlap_end - overlap_start
    return overlap_duration.total_seconds() / 3600.0


def normalize_score(score: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Normalize a score to be between min_val and max_val."""
    return max(min_val, min(max_val, score))