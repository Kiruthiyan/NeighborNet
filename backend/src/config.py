"""
Configuration management for NeighborNet Resilience.
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path
from typing import Optional

from botocore.config import Config as BotoClientConfig
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8", 
        case_sensitive=False,
        enable_decoding=False,
    )
    
    # Environment
    environment: str = Field(default="development", alias="NODE_ENV")
    debug: bool = Field(default=True, alias="DEBUG")
    
    # AWS Configuration
    aws_region: str = Field(default="us-west-2", alias="AWS_REGION")
    aws_access_key_id: Optional[str] = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    aws_endpoint_url: Optional[str] = Field(default=None, alias="AWS_ENDPOINT_URL")
    
    # Amazon Bedrock Model Configuration
    bedrock_model_id: str = Field(
        default="us.amazon.nova-pro-v1:0", 
        alias="BEDROCK_MODEL_ID"
    )
    bedrock_model_region: str = Field(default="us-west-2", alias="BEDROCK_MODEL_REGION")
    bedrock_model_temperature: float = Field(default=0.7, alias="BEDROCK_MODEL_TEMPERATURE")
    bedrock_model_max_tokens: int = Field(default=4000, alias="BEDROCK_MODEL_MAX_TOKENS")
    
    # Strands Configuration
    strands_model_provider: str = Field(default="bedrock", alias="STRANDS_MODEL_PROVIDER")
    strands_log_level: str = Field(default="INFO", alias="STRANDS_LOG_LEVEL")
    strands_session_storage: str = Field(default="file", alias="STRANDS_SESSION_STORAGE")
    strands_session_base_dir: Path = Field(
        default=Path("./agent_sessions"), 
        alias="STRANDS_SESSION_BASE_DIR"
    )
    
    # Database Configuration
    database_url: str = Field(
        default="dynamodb://localhost:8001", 
        alias="DATABASE_URL"
    )
    dynamodb_endpoint_url: Optional[str] = Field(
        default=None, 
        alias="DYNAMODB_ENDPOINT_URL"
    )
    dynamodb_region: str = Field(default="us-west-2", alias="DYNAMODB_REGION")
    persist_to_dynamodb: bool = Field(default=False, alias="PERSIST_TO_DYNAMODB")
    
    # API Configuration
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    api_secret_key: str = Field(
        default="dev-secret-key-change-in-production", 
        alias="API_SECRET_KEY"
    )
    api_algorithm: str = Field(default="HS256", alias="API_ALGORITHM")
    api_access_token_expire_minutes: int = Field(
        default=30, 
        alias="API_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    
    # Logging Configuration
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")
    
    # Demo Configuration
    demo_mode: bool = Field(default=True, alias="DEMO_MODE")
    demo_data_reset_on_start: bool = Field(
        default=False, 
        alias="DEMO_DATA_RESET_ON_START"
    )
    
    # Notification Configuration
    sns_topic_arn: Optional[str] = Field(default=None, alias="SNS_TOPIC_ARN")
    sns_endpoint_url: Optional[str] = Field(default=None, alias="SNS_ENDPOINT_URL")
    
    # Audit Configuration
    audit_s3_bucket: str = Field(
        default="neighbornet-audit-logs", 
        alias="AUDIT_S3_BUCKET"
    )
    s3_endpoint_url: Optional[str] = Field(default=None, alias="S3_ENDPOINT_URL")
    
    # Monitoring Configuration
    cloudwatch_namespace: str = Field(
        default="NeighborNet/Resilience", 
        alias="CLOUDWATCH_NAMESPACE"
    )
    cloudwatch_endpoint_url: Optional[str] = Field(
        default=None, 
        alias="CLOUDWATCH_ENDPOINT_URL"
    )
    
    # Security Configuration
    allowed_hosts: list[str] = Field(
        default=["localhost", "127.0.0.1", "0.0.0.0", "testserver"], 
        alias="ALLOWED_HOSTS"
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"], 
        alias="CORS_ORIGINS"
    )
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, alias="RATE_LIMIT_PER_MINUTE")
        
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() in ("development", "dev", "local")

    @field_validator("allowed_hosts", "cors_origins", mode="before")
    @classmethod
    def parse_csv_list(cls, value):
        """Accept comma-separated env values as well as JSON arrays."""

        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @field_validator(
        "debug", "demo_mode", "demo_data_reset_on_start", "persist_to_dynamodb", mode="before"
    )
    @classmethod
    def parse_boolish(cls, value):
        """Accept common deployment strings for booleans."""

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on", "debug", "development"}:
                return True
            if normalized in {"false", "0", "no", "off", "release", "production"}:
                return False
        return value
        
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() in ("production", "prod")
        
    def get_aws_config(self) -> dict:
        """Get AWS configuration for boto3 clients."""
        config = {
            "region_name": self.aws_region,
        }
        
        if self.aws_endpoint_url:
            config["endpoint_url"] = self.aws_endpoint_url
            
        if self.aws_access_key_id and self.aws_secret_access_key:
            config.update({
                "aws_access_key_id": self.aws_access_key_id,
                "aws_secret_access_key": self.aws_secret_access_key,
            })
            
        return config
        
    def get_bedrock_config(self) -> dict:
        """Get Amazon Bedrock configuration for Strands agents."""
        return {
            "model_id": self.bedrock_model_id,
            "region_name": self.bedrock_model_region,
            "temperature": self.bedrock_model_temperature,
            "max_tokens": self.bedrock_model_max_tokens,
        }

    def get_boto_client_config(self) -> BotoClientConfig:
        """Conservative timeout/retry settings shared by boto3 clients.

        Without this, a hung or unreachable AWS endpoint (DynamoDB, Bedrock)
        can block a request far longer than acceptable in a live demo.
        """
        return BotoClientConfig(
            connect_timeout=5,
            read_timeout=30,
            retries={"max_attempts": 2, "mode": "standard"},
        )


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the global settings instance."""
    return settings
