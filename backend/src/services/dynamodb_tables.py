"""
DynamoDB table definitions and initialization for NeighborNet Resilience.
Handles table creation and data loading for local development and AWS deployment.
"""

import boto3
from botocore.exceptions import ClientError
from typing import Dict, List, Any, Optional
import json
from datetime import datetime

from ..config import get_settings
from .seed_data import generate_seed_data


class DynamoDBManager:
    """Manages DynamoDB tables and operations."""
    
    def __init__(self, use_local: bool = None):
        """Initialize DynamoDB manager."""
        self.settings = get_settings()
        
        if use_local is None:
            use_local = self.settings.environment == "development"
        
        if use_local:
            # Use DynamoDB Local for development
            self.dynamodb = boto3.resource(
                'dynamodb',
                endpoint_url='http://localhost:8000',
                region_name='us-east-1',
                aws_access_key_id='fakeMyKeyId',
                aws_secret_access_key='fakeSecretAccessKey'
            )
        else:
            # Use AWS DynamoDB
            self.dynamodb = boto3.resource('dynamodb', region_name=self.settings.aws_region)
        
        self.table_schemas = self._get_table_schemas()
    
    def _get_table_schemas(self) -> Dict[str, Dict[str, Any]]:
        """Define DynamoDB table schemas."""
        return {
            # Users table
            "neighbornet_users": {
                "AttributeDefinitions": [
                    {"AttributeName": "user_id", "AttributeType": "S"},
                    {"AttributeName": "role", "AttributeType": "S"},
                    {"AttributeName": "email", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "user_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "role-index",
                        "KeySchema": [
                            {"AttributeName": "role", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "email-index", 
                        "KeySchema": [
                            {"AttributeName": "email", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Organizations table
            "neighbornet_organizations": {
                "AttributeDefinitions": [
                    {"AttributeName": "org_id", "AttributeType": "S"},
                    {"AttributeName": "type", "AttributeType": "S"},
                    {"AttributeName": "zone", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "org_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "type-index",
                        "KeySchema": [
                            {"AttributeName": "type", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "zone-index",
                        "KeySchema": [
                            {"AttributeName": "zone", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Inventory table
            "neighbornet_inventory": {
                "AttributeDefinitions": [
                    {"AttributeName": "batch_id", "AttributeType": "S"},
                    {"AttributeName": "resource_type", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "expiry_datetime", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "batch_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "resource-type-index",
                        "KeySchema": [
                            {"AttributeName": "resource_type", "KeyType": "HASH"},
                            {"AttributeName": "expiry_datetime", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "status-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Requests table
            "neighbornet_requests": {
                "AttributeDefinitions": [
                    {"AttributeName": "request_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "urgency_level", "AttributeType": "S"},
                    {"AttributeName": "required_by", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "request_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "status-urgency-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"},
                            {"AttributeName": "urgency_level", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "urgency-time-index",
                        "KeySchema": [
                            {"AttributeName": "urgency_level", "KeyType": "HASH"},
                            {"AttributeName": "required_by", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Volunteers table
            "neighbornet_volunteers": {
                "AttributeDefinitions": [
                    {"AttributeName": "volunteer_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "user_id", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "volunteer_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "status-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "user-id-index",
                        "KeySchema": [
                            {"AttributeName": "user_id", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Allocations table
            "neighbornet_allocations": {
                "AttributeDefinitions": [
                    {"AttributeName": "allocation_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "request_id", "AttributeType": "S"},
                    {"AttributeName": "batch_id", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "allocation_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "request-id-index",
                        "KeySchema": [
                            {"AttributeName": "request_id", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "batch-id-index",
                        "KeySchema": [
                            {"AttributeName": "batch_id", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "status-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Assignments table
            "neighbornet_assignments": {
                "AttributeDefinitions": [
                    {"AttributeName": "assignment_id", "AttributeType": "S"},
                    {"AttributeName": "volunteer_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "assignment_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "volunteer-id-index",
                        "KeySchema": [
                            {"AttributeName": "volunteer_id", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "status-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },

            # Disaster events table
            "neighbornet_disasters": {
                "AttributeDefinitions": [
                    {"AttributeName": "disaster_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "severity", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "disaster_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "status-severity-index",
                        "KeySchema": [
                            {"AttributeName": "status", "KeyType": "HASH"},
                            {"AttributeName": "severity", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },

            # Volunteer alerts table
            "neighbornet_volunteer_alerts": {
                "AttributeDefinitions": [
                    {"AttributeName": "alert_id", "AttributeType": "S"},
                    {"AttributeName": "volunteer_id", "AttributeType": "S"},
                    {"AttributeName": "disaster_id", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "alert_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "volunteer-status-index",
                        "KeySchema": [
                            {"AttributeName": "volunteer_id", "KeyType": "HASH"},
                            {"AttributeName": "status", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "disaster-status-index",
                        "KeySchema": [
                            {"AttributeName": "disaster_id", "KeyType": "HASH"},
                            {"AttributeName": "status", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },

            # Unified normal/disaster tasks table
            "neighbornet_tasks": {
                "AttributeDefinitions": [
                    {"AttributeName": "task_id", "AttributeType": "S"},
                    {"AttributeName": "operating_mode", "AttributeType": "S"},
                    {"AttributeName": "status", "AttributeType": "S"},
                    {"AttributeName": "assigned_volunteer_id", "AttributeType": "S"},
                    {"AttributeName": "disaster_id", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "task_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "mode-status-index",
                        "KeySchema": [
                            {"AttributeName": "operating_mode", "KeyType": "HASH"},
                            {"AttributeName": "status", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "assigned-volunteer-index",
                        "KeySchema": [
                            {"AttributeName": "assigned_volunteer_id", "KeyType": "HASH"},
                            {"AttributeName": "status", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "disaster-status-index",
                        "KeySchema": [
                            {"AttributeName": "disaster_id", "KeyType": "HASH"},
                            {"AttributeName": "status", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Events table
            "neighbornet_events": {
                "AttributeDefinitions": [
                    {"AttributeName": "event_id", "AttributeType": "S"},
                    {"AttributeName": "event_type", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                    {"AttributeName": "processing_status", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "event_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "type-timestamp-index",
                        "KeySchema": [
                            {"AttributeName": "event_type", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "processing-status-index",
                        "KeySchema": [
                            {"AttributeName": "processing_status", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Decisions table
            "neighbornet_decisions": {
                "AttributeDefinitions": [
                    {"AttributeName": "decision_id", "AttributeType": "S"},
                    {"AttributeName": "decision_type", "AttributeType": "S"},
                    {"AttributeName": "risk_classification", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "decision_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "type-index",
                        "KeySchema": [
                            {"AttributeName": "decision_type", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "risk-classification-index",
                        "KeySchema": [
                            {"AttributeName": "risk_classification", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            },
            
            # Audit logs table
            "neighbornet_audit_logs": {
                "AttributeDefinitions": [
                    {"AttributeName": "log_id", "AttributeType": "S"},
                    {"AttributeName": "timestamp", "AttributeType": "S"},
                    {"AttributeName": "action_type", "AttributeType": "S"},
                    {"AttributeName": "actor_id", "AttributeType": "S"}
                ],
                "KeySchema": [
                    {"AttributeName": "log_id", "KeyType": "HASH"}
                ],
                "GlobalSecondaryIndexes": [
                    {
                        "IndexName": "timestamp-index",
                        "KeySchema": [
                            {"AttributeName": "timestamp", "KeyType": "HASH"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "action-type-index",
                        "KeySchema": [
                            {"AttributeName": "action_type", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    },
                    {
                        "IndexName": "actor-id-index",
                        "KeySchema": [
                            {"AttributeName": "actor_id", "KeyType": "HASH"},
                            {"AttributeName": "timestamp", "KeyType": "RANGE"}
                        ],
                        "Projection": {"ProjectionType": "ALL"},
                        "BillingMode": "PAY_PER_REQUEST"
                    }
                ],
                "BillingMode": "PAY_PER_REQUEST"
            }
        }
    
    def create_tables(self) -> Dict[str, bool]:
        """Create all DynamoDB tables."""
        results = {}
        
        for table_name, schema in self.table_schemas.items():
            try:
                print(f"Creating table: {table_name}")
                
                table = self.dynamodb.create_table(
                    TableName=table_name,
                    **schema
                )
                
                # Wait for table to be created
                table.wait_until_exists()
                print(f"✓ Table {table_name} created successfully")
                results[table_name] = True
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceInUseException':
                    print(f"! Table {table_name} already exists")
                    results[table_name] = True
                else:
                    print(f"✗ Error creating table {table_name}: {e}")
                    results[table_name] = False
            except Exception as e:
                print(f"✗ Unexpected error creating table {table_name}: {e}")
                results[table_name] = False
        return results
    
    def delete_tables(self) -> Dict[str, bool]:
        """Delete all DynamoDB tables."""
        results = {}
        
        for table_name in self.table_schemas.keys():
            try:
                print(f"Deleting table: {table_name}")
                
                table = self.dynamodb.Table(table_name)
                table.delete()
                
                # Wait for table to be deleted
                table.wait_until_not_exists()
                print(f"✓ Table {table_name} deleted successfully")
                results[table_name] = True
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceNotFoundException':
                    print(f"! Table {table_name} does not exist")
                    results[table_name] = True
                else:
                    print(f"✗ Error deleting table {table_name}: {e}")
                    results[table_name] = False
            except Exception as e:
                print(f"✗ Unexpected error deleting table {table_name}: {e}")
                results[table_name] = False
        
        return results
    
    def load_seed_data(self) -> Dict[str, int]:
        """Load seed data into tables."""
        print("Generating seed data...")
        seed_data = generate_seed_data()
        
        results = {}
        
        # Load users
        table = self.dynamodb.Table("neighbornet_users")
        count = 0
        for user in seed_data["users"]:
            try:
                table.put_item(Item=user.to_dynamodb())
                count += 1
            except Exception as e:
                print(f"Error loading user {user.user_id}: {e}")
        results["users"] = count
        print(f"✓ Loaded {count} users")
        
        # Load organizations
        table = self.dynamodb.Table("neighbornet_organizations")
        count = 0
        for org in seed_data["organizations"]:
            try:
                item = org.to_dynamodb()
                # Extract zone from nested location for GSI
                if "location" in item and "zone" in item["location"]:
                    item["zone"] = item["location"]["zone"]
                table.put_item(Item=item)
                count += 1
            except Exception as e:
                print(f"Error loading organization {org.org_id}: {e}")
        results["organizations"] = count
        print(f"✓ Loaded {count} organizations")
        
        # Load volunteers
        table = self.dynamodb.Table("neighbornet_volunteers")
        count = 0
        for volunteer in seed_data["volunteers"]:
            try:
                table.put_item(Item=volunteer.to_dynamodb())
                count += 1
            except Exception as e:
                print(f"Error loading volunteer {volunteer.volunteer_id}: {e}")
        results["volunteers"] = count
        print(f"✓ Loaded {count} volunteers")
        
        # Load inventory
        table = self.dynamodb.Table("neighbornet_inventory")
        count = 0
        for batch in seed_data["inventory"]:
            try:
                table.put_item(Item=batch.to_dynamodb())
                count += 1
            except Exception as e:
                print(f"Error loading inventory batch {batch.batch_id}: {e}")
        results["inventory"] = count
        print(f"✓ Loaded {count} inventory batches")
        
        # Load requests
        table = self.dynamodb.Table("neighbornet_requests")
        count = 0
        for request in seed_data["requests"]:
            try:
                table.put_item(Item=request.to_dynamodb())
                count += 1
            except Exception as e:
                print(f"Error loading request {request.request_id}: {e}")
        results["requests"] = count
        print(f"Loaded {count} requests")

        # Load deterministic disaster fixtures. Alerts and tasks are generated by workflows.
        table = self.dynamodb.Table("neighbornet_disasters")
        count = 0
        for disaster in seed_data.get("disasters", []):
            try:
                table.put_item(Item=disaster.to_dynamodb())
                count += 1
            except Exception as e:
                print(f"Error loading disaster {disaster.disaster_id}: {e}")
        results["disasters"] = count
        print(f"Loaded {count} disaster events")
        return results
        print(f"✓ Loaded {count} requests")
        
        return results
    
    def reset_database(self) -> bool:
        """Reset database by deleting and recreating tables with seed data."""
        print("Resetting NeighborNet database...")
        
        # Delete existing tables
        print("\n1. Deleting existing tables...")
        delete_results = self.delete_tables()
        
        # Create tables
        print("\n2. Creating tables...")
        create_results = self.create_tables()
        
        # Load seed data
        print("\n3. Loading seed data...")
        seed_results = self.load_seed_data()
        
        print("\n✓ Database reset complete!")
        print(f"Tables created: {sum(1 for r in create_results.values() if r)}/{len(create_results)}")
        print(f"Total records loaded: {sum(seed_results.values())}")
        
        return all(create_results.values())


def initialize_database(use_local: bool = None, reset: bool = False) -> bool:
    """Initialize DynamoDB tables and data."""
    manager = DynamoDBManager(use_local=use_local)
    
    if reset:
        return manager.reset_database()
    else:
        print("Creating NeighborNet DynamoDB tables...")
        results = manager.create_tables()
        
        if all(results.values()):
            print("\nLoading seed data...")
            seed_results = manager.load_seed_data()
            print(f"✓ Database initialization complete! Loaded {sum(seed_results.values())} records")
            return True
        else:
            print("✗ Table creation failed")
            return False


if __name__ == "__main__":
    import sys
    
    use_local = "--local" in sys.argv or "--dev" in sys.argv
    reset = "--reset" in sys.argv
    
    print(f"Using {'local DynamoDB' if use_local else 'AWS DynamoDB'}")
    
    success = initialize_database(use_local=use_local, reset=reset)
    exit(0 if success else 1)
