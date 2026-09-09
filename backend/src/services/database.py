"""
Database service for NeighborNet Resilience.
Handles DynamoDB connection and table initialization.
"""

from typing import Dict, Any, Optional
import boto3
import structlog
from botocore.exceptions import ClientError

from src.config import get_settings


logger = structlog.get_logger(__name__)


class DatabaseService:
    """Service for managing DynamoDB connections and operations."""
    
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._resource = None
    
    @property
    def client(self):
        """Get DynamoDB client (low-level)."""
        if self._client is None:
            config = self.settings.get_aws_config()
            
            if self.settings.dynamodb_endpoint_url:
                config["endpoint_url"] = self.settings.dynamodb_endpoint_url
            
            self._client = boto3.client("dynamodb", **config)
            
        return self._client
    
    @property
    def resource(self):
        """Get DynamoDB resource (high-level)."""
        if self._resource is None:
            config = self.settings.get_aws_config()
            
            if self.settings.dynamodb_endpoint_url:
                config["endpoint_url"] = self.settings.dynamodb_endpoint_url
                
            self._resource = boto3.resource("dynamodb", **config)
            
        return self._resource
    
    async def create_tables(self) -> None:
        """Create all required DynamoDB tables if they don't exist."""
        tables_to_create = [
            self._get_users_table_definition(),
            self._get_organizations_table_definition(),
            self._get_inventory_table_definition(),
            self._get_requests_table_definition(),
            self._get_volunteers_table_definition(),
            self._get_allocations_table_definition(),
            self._get_delivery_assignments_table_definition(),
            self._get_events_table_definition(),
            self._get_decisions_table_definition(),
            self._get_strands_audit_logs_table_definition(),
            self._get_disaster_events_table_definition(),
            self._get_volunteer_alerts_table_definition(),
            self._get_tasks_table_definition(),
            self._get_invitations_table_definition(),
        ]
        
        for table_def in tables_to_create:
            await self._create_table_if_not_exists(table_def)
    
    async def _create_table_if_not_exists(self, table_definition: Dict[str, Any]) -> None:
        """Create a table if it doesn't already exist."""
        table_name = table_definition["TableName"]
        
        try:
            # Check if table exists
            self.client.describe_table(TableName=table_name)
            logger.info(f"Table {table_name} already exists")
            
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                # Table doesn't exist, create it
                logger.info(f"Creating table {table_name}")
                
                try:
                    self.client.create_table(**table_definition)
                    
                    # Wait for table to be created
                    waiter = self.client.get_waiter("table_exists")
                    waiter.wait(TableName=table_name)
                    
                    logger.info(f"Table {table_name} created successfully")
                    
                except ClientError as create_error:
                    logger.error(
                        f"Failed to create table {table_name}",
                        error=str(create_error)
                    )
                    raise
            else:
                logger.error(
                    f"Error checking table {table_name}",
                    error=str(e)
                )
                raise
    
    def _get_users_table_definition(self) -> Dict[str, Any]:
        """Get Users table definition."""
        return {
            "TableName": "Users",
            "KeySchema": [
                {"AttributeName": "user_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "user_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_organizations_table_definition(self) -> Dict[str, Any]:
        """Get Organizations table definition."""
        return {
            "TableName": "Organizations",
            "KeySchema": [
                {"AttributeName": "org_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "org_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_inventory_table_definition(self) -> Dict[str, Any]:
        """Get Inventory table definition."""
        return {
            "TableName": "Inventory",
            "KeySchema": [
                {"AttributeName": "batch_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "batch_id", "AttributeType": "S"},
                {"AttributeName": "expiry_datetime", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "ExpiryIndex",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "expiry_datetime", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_requests_table_definition(self) -> Dict[str, Any]:
        """Get Requests table definition."""
        return {
            "TableName": "Requests",
            "KeySchema": [
                {"AttributeName": "request_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "request_id", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"},
                {"AttributeName": "urgency_level", "AttributeType": "S"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "StatusUrgencyIndex",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "urgency_level", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_volunteers_table_definition(self) -> Dict[str, Any]:
        """Get Volunteers table definition."""
        return {
            "TableName": "Volunteers",
            "KeySchema": [
                {"AttributeName": "volunteer_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "volunteer_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_allocations_table_definition(self) -> Dict[str, Any]:
        """Get Allocations table definition."""
        return {
            "TableName": "Allocations",
            "KeySchema": [
                {"AttributeName": "allocation_id", "KeyType": "HASH"},
                {"AttributeName": "plan_id", "KeyType": "RANGE"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "allocation_id", "AttributeType": "S"},
                {"AttributeName": "plan_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_delivery_assignments_table_definition(self) -> Dict[str, Any]:
        """Get DeliveryAssignments table definition."""
        return {
            "TableName": "DeliveryAssignments",
            "KeySchema": [
                {"AttributeName": "assignment_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "assignment_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_events_table_definition(self) -> Dict[str, Any]:
        """Get Events table definition."""
        return {
            "TableName": "Events",
            "KeySchema": [
                {"AttributeName": "event_id", "KeyType": "HASH"},
                {"AttributeName": "timestamp", "KeyType": "RANGE"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "event_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_decisions_table_definition(self) -> Dict[str, Any]:
        """Get Decisions table definition."""
        return {
            "TableName": "Decisions",
            "KeySchema": [
                {"AttributeName": "decision_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "decision_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }
    
    def _get_strands_audit_logs_table_definition(self) -> Dict[str, Any]:
        """Get StrandsAuditLogs table definition."""
        return {
            "TableName": "StrandsAuditLogs",
            "KeySchema": [
                {"AttributeName": "log_id", "KeyType": "HASH"},
                {"AttributeName": "timestamp", "KeyType": "RANGE"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "log_id", "AttributeType": "S"},
                {"AttributeName": "timestamp", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }

    def _get_disaster_events_table_definition(self) -> Dict[str, Any]:
        """Get DisasterEvents table definition."""
        return {
            "TableName": "DisasterEvents",
            "KeySchema": [
                {"AttributeName": "disaster_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "disaster_id", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"},
                {"AttributeName": "severity", "AttributeType": "S"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "StatusSeverityIndex",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "severity", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }

    def _get_volunteer_alerts_table_definition(self) -> Dict[str, Any]:
        """Get VolunteerAlerts table definition."""
        return {
            "TableName": "VolunteerAlerts",
            "KeySchema": [
                {"AttributeName": "alert_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "alert_id", "AttributeType": "S"},
                {"AttributeName": "volunteer_id", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "VolunteerStatusIndex",
                    "KeySchema": [
                        {"AttributeName": "volunteer_id", "KeyType": "HASH"},
                        {"AttributeName": "status", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }

    def _get_invitations_table_definition(self) -> Dict[str, Any]:
        """Get Invitations table definition."""
        return {
            "TableName": "Invitations",
            "KeySchema": [
                {"AttributeName": "invite_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "invite_id", "AttributeType": "S"}
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }

    def _get_tasks_table_definition(self) -> Dict[str, Any]:
        """Get unified Tasks table definition."""
        return {
            "TableName": "Tasks",
            "KeySchema": [
                {"AttributeName": "task_id", "KeyType": "HASH"}
            ],
            "AttributeDefinitions": [
                {"AttributeName": "task_id", "AttributeType": "S"},
                {"AttributeName": "status", "AttributeType": "S"},
                {"AttributeName": "operating_mode", "AttributeType": "S"},
                {"AttributeName": "volunteer_id", "AttributeType": "S"}
            ],
            "GlobalSecondaryIndexes": [
                {
                    "IndexName": "ModeStatusIndex",
                    "KeySchema": [
                        {"AttributeName": "operating_mode", "KeyType": "HASH"},
                        {"AttributeName": "status", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                },
                {
                    "IndexName": "VolunteerStatusIndex",
                    "KeySchema": [
                        {"AttributeName": "volunteer_id", "KeyType": "HASH"},
                        {"AttributeName": "status", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"}
                }
            ],
            "BillingMode": "PAY_PER_REQUEST"
        }


# Global database service instance
_db_service = None


def get_database_service() -> DatabaseService:
    """Get the global database service instance."""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service


async def initialize_database() -> None:
    """Initialize the database by creating all required tables."""
    db_service = get_database_service()
    await db_service.create_tables()
    logger.info("Database initialization completed")
