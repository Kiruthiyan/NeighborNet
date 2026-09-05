"""
FastAPI application entry point for NeighborNet Resilience.
Sets up the API server with proper middleware, routes, and error handling.
"""

import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from src.config import get_settings
from src.services.database import initialize_database
from src.services.logging import setup_logging

from src.api.agent import router as agent_router
from src.api.alerts import router as alerts_router
from src.api.audit import router as audit_router
from src.api.dashboard import router as dashboard_router
from src.api.decisions import router as decisions_router
from src.api.disasters import router as disasters_router
from src.api.disruptions import router as disruptions_router
from src.api.metrics import router as metrics_router
from src.api.requests import router as requests_router
from src.api.resources import router as resources_router
from src.api.tasks import router as tasks_router
from src.api.volunteers import router as volunteers_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    settings = get_settings()
    
    # Setup logging
    setup_logging(settings.log_level, settings.log_format)
    logger = structlog.get_logger()
    
    logger.info(
        "Starting NeighborNet Resilience",
        environment=settings.environment,
        debug=settings.debug,
        strands_provider=settings.strands_model_provider,
    )
    
    # Initialize database
    try:
        await initialize_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        if not (settings.demo_mode and settings.is_development):
            raise
        logger.warning("Continuing with in-memory demo store")
    
    # Initialize Strands agents (will be implemented in later tasks)
    # try:
    #     await initialize_strands_agents()
    #     logger.info("Strands agents initialized successfully")
    # except Exception as e:
    #     logger.error("Failed to initialize Strands agents", error=str(e))
    #     raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down NeighborNet Resilience")


# Create FastAPI application
app = FastAPI(
    title="NeighborNet Resilience API",
    description="Autonomous community resource coordination using Strands Agents SDK",
    version="0.1.0",
    docs_url="/docs" if get_settings().debug else None,
    redoc_url="/redoc" if get_settings().debug else None,
    lifespan=lifespan,
)

# Add middleware
settings = get_settings()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=[*settings.allowed_hosts, "testserver"]
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path),
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler for unhandled errors."""
    logger = structlog.get_logger()
    logger.error(
        "Unhandled exception",
        error=str(exc),
        path=str(request.url.path),
        exc_info=True,
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "path": str(request.url.path),
        }
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "neighbornet-resilience",
        "version": "0.1.0",
        "environment": settings.environment,
    }


@app.get("/")
async def root():
    """Root endpoint with basic information."""
    return {
        "message": "NeighborNet Resilience - Autonomous Community Resource Coordination",
        "description": "The community plan repairs itself when reality changes",
        "version": "0.1.0",
        "docs": "/docs" if settings.debug else "Documentation not available in production",
    }


app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(resources_router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(requests_router, prefix="/api/requests", tags=["Requests"])
app.include_router(volunteers_router, prefix="/api/volunteers", tags=["Volunteers"])
app.include_router(disasters_router, prefix="/api/disasters", tags=["Disasters"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Volunteer Alerts"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(disruptions_router, prefix="/api/disruptions", tags=["Disruptions"])
app.include_router(decisions_router, prefix="/api/decisions", tags=["Decisions"])
app.include_router(audit_router, prefix="/api/audit", tags=["Audit"])
app.include_router(metrics_router, prefix="/api/metrics", tags=["Metrics"])


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "src.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
