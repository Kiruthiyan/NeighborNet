# NeighborNet Resilience Makefile

.PHONY: help dev build test lint clean install setup demo

help:  ## Show this help message
	@echo "NeighborNet Resilience - Autonomous Community Resource Coordination"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup:  ## Initial project setup
	@echo "Setting up NeighborNet Resilience development environment..."
	cd backend && poetry install
	cd backend && poetry run pre-commit install
	@echo "Creating environment files..."
	cp backend/.env.example backend/.env
	@echo "Creating necessary directories..."
	mkdir -p agent_sessions docker-data/dynamodb docker-data/localstack logs audit_logs
	@echo "Setup complete! Run 'make dev' to start development environment."

install:  ## Install dependencies
	cd backend && poetry install
	cd frontend && npm install

dev:  ## Start development environment
	@echo "Starting NeighborNet development environment..."
	docker-compose up --build

dev-detached:  ## Start development environment in background
	docker-compose up --build -d

stop:  ## Stop development environment  
	docker-compose down

logs:  ## Show logs from all services
	docker-compose logs -f

logs-api:  ## Show API logs
	docker-compose logs -f api

logs-frontend:  ## Show frontend logs
	docker-compose logs -f frontend

build:  ## Build all containers
	docker-compose build

clean:  ## Clean up containers and volumes
	docker-compose down -v --remove-orphans
	docker system prune -f

test:  ## Run all tests
	cd backend && poetry run pytest

test-unit:  ## Run unit tests only
	cd backend && poetry run pytest tests/ -m "unit"

test-integration:  ## Run integration tests only
	cd backend && poetry run pytest tests/ -m "integration"

test-coverage:  ## Run tests with coverage report
	cd backend && poetry run pytest --cov=src --cov-report=html --cov-report=term

test-models:  ## Run model tests only
	cd backend && poetry run pytest tests/test_models.py -v

lint:  ## Run linting and formatting
	cd backend && poetry run black src tests
	cd backend && poetry run isort src tests
	cd backend && poetry run flake8 src tests
	cd backend && poetry run mypy src

lint-check:  ## Check linting without making changes
	cd backend && poetry run black --check src tests
	cd backend && poetry run isort --check-only src tests
	cd backend && poetry run flake8 src tests

format:  ## Format code
	cd backend && poetry run black src tests
	cd backend && poetry run isort src tests

demo:  ## Run demo scenarios
	@echo "Running NeighborNet demo scenarios..."
	cd backend && poetry run python -m src.demo.scenario_runner

demo-flood:  ## Run flood disruption demo
	cd backend && poetry run python -m src.demo.flood_scenario

# Database management
db-init:  ## Initialize DynamoDB tables (local)
	cd backend && poetry run python -m src.services.dynamodb_tables --local

db-reset:  ## Reset DynamoDB with fresh seed data (local)
	cd backend && poetry run python -m src.services.dynamodb_tables --local --reset

db-seed:  ## Generate and display seed data
	cd backend && poetry run python -m src.services.seed_data

evaluation:  ## Run evaluation suite
	cd backend && poetry run python -m src.evaluation.run_evaluation

shell-api:  ## Open shell in API container
	docker-compose exec api bash

shell-db:  ## Connect to local DynamoDB
	aws dynamodb list-tables --endpoint-url http://localhost:8001 --region us-west-2

reset-data:  ## Reset all local data
	docker-compose down -v
	rm -rf docker-data agent_sessions logs audit_logs
	mkdir -p agent_sessions docker-data/dynamodb docker-data/localstack logs audit_logs

health:  ## Check service health
	@echo "Checking API health..."
	curl -f http://localhost:8000/health || echo "API not responding"
	@echo "Checking frontend..."
	curl -f http://localhost:3000 || echo "Frontend not responding"

# AWS deployment commands
deploy-dev:  ## Deploy to development environment
	@echo "Deploying to AWS development environment..."
	# TODO: Add AWS CDK or Terraform deployment commands

deploy-prod:  ## Deploy to production environment  
	@echo "Deploying to AWS production environment..."
	# TODO: Add AWS CDK or Terraform deployment commands

# Documentation
docs:  ## Generate documentation
	cd backend && poetry run sphinx-build -b html docs docs/_build

docs-serve:  ## Serve documentation locally
	cd backend/docs/_build && python -m http.server 8080