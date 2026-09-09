"""
Tests for configuration management.
"""

import pytest
import os
from unittest.mock import patch
from src.config import Settings, get_settings


class TestSettings:
    """Test suite for Settings class."""
    
    def test_default_settings(self):
        """Test default settings are loaded correctly."""
        # Temporarily unset test environment variables. API_SECRET_KEY still
        # has to be supplied - Settings() now fails fast without one.
        with patch.dict(
            os.environ,
            {"API_SECRET_KEY": "test-only-secret-not-for-any-real-deployment-0123456789"},
            clear=True,
        ):
            settings = Settings(_env_file=None)
            
            assert settings.environment == "development"
            assert settings.debug is True
            assert settings.bedrock_model_id == "us.amazon.nova-pro-v1:0"
            assert settings.strands_model_provider == "bedrock"
            assert settings.api_port == 8000
        
    def test_environment_detection(self):
        """Test environment detection methods."""
        with patch.dict(os.environ, {"NODE_ENV": "development"}):
            dev_settings = Settings()
        
        with patch.dict(os.environ, {"NODE_ENV": "production"}):
            prod_settings = Settings()
        
        assert dev_settings.is_development is True
        assert dev_settings.is_production is False
        
        assert prod_settings.is_development is False
        assert prod_settings.is_production is True
        
    def test_aws_config_generation(self):
        """Test AWS configuration generation."""
        with patch.dict(os.environ, {
            "AWS_REGION": "us-east-1",
            "AWS_ACCESS_KEY_ID": "test_key",
            "AWS_SECRET_ACCESS_KEY": "test_secret"
        }):
            settings = Settings()
        
        config = settings.get_aws_config()
        
        assert config["region_name"] == "us-east-1"
        assert config["aws_access_key_id"] == "test_key"
        assert config["aws_secret_access_key"] == "test_secret"
        
    def test_bedrock_config_generation(self):
        """Test Bedrock configuration generation."""
        with patch.dict(os.environ, {
            "BEDROCK_MODEL_ID": "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            "BEDROCK_MODEL_TEMPERATURE": "0.5",
            "BEDROCK_MODEL_MAX_TOKENS": "2000"
        }):
            settings = Settings()
        
        config = settings.get_bedrock_config()
        
        assert config["model_id"] == "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        assert config["temperature"] == 0.5
        assert config["max_tokens"] == 2000
        
    def test_get_settings_singleton(self):
        """Test that get_settings returns the same instance."""
        settings1 = get_settings()
        settings2 = get_settings()
        
        assert settings1 is settings2