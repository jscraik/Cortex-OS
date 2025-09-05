from __future__ import annotations

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, cast

import instructor
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from mlx_inference import (
    InferenceRequest as MLXInferenceRequest,
)

# Import our new modules
from mlx_inference import (
    MLXInferenceEngine,
    create_mlx_engine,
)
from model_registry import (
    DeploymentStrategy,
    ModelRegistry,
    ModelVersionManager,
)
from monitoring import (
    MonitoringService,
    create_monitoring_service,
)
from openai import AsyncOpenAI
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from pydantic import BaseModel

from security import (
    AuthenticationValidator,
    RateLimiter,
    SecurityValidator,
    StructuredOutputValidator,
    StructuredResponse,
    create_auth_validator,
    create_output_validator,
    create_rate_limiter,
    create_security_validator,
)

# Environment configuration
MODEL_NAME = os.getenv("MODEL_NAME", "cortex-default")
MODEL_PATH = os.getenv("MODEL_PATH", "/models/default")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-secret-key")

# Git commit hash for versioning
try:
    import shutil
    import subprocess

    GIT = shutil.which("git")
    if GIT:
        COMMIT_HASH = subprocess.check_output(
            [GIT, "rev-parse", "HEAD"], text=True
        ).strip()
    else:
        COMMIT_HASH = "unknown"
except Exception:
    COMMIT_HASH = "unknown"

# Prometheus metrics
REQUEST_COUNT = Counter(
    "inference_requests_total",
    "Total inference requests",
    ["model", "status"],
)
REQUEST_LATENCY = Histogram(
    "inference_request_latency_seconds",
    "Latency of inference requests",
    ["model"],
)
CACHE_HITS = Counter(
    "inference_cache_hits_total",
    "Inference cache hits",
    ["model"],
)
SECURITY_BLOCKS = Counter(
    "security_blocks_total",
    "Total security blocks",
    ["reason"],
)

# Global application state
inference_engine: MLXInferenceEngine | None = None
security_validator: SecurityValidator | None = None
rate_limiter: RateLimiter | None = None
auth_validator: AuthenticationValidator | None = None
output_validator: StructuredOutputValidator | None = None
instructor_client: instructor.AsyncInstructor | None = None
monitoring_service: MonitoringService | None = None
model_registry: ModelRegistry | None = None
version_manager: ModelVersionManager | None = None

logger = logging.getLogger("ml_inference")
logging.basicConfig(level=logging.INFO)


class InferenceRequest(BaseModel):
    """Enhanced inference request model."""

    prompt: str
    max_tokens: int | None = None
    temperature: float | None = None
    stream: bool = False
    return_structured: bool = False


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str
    code: str
    details: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    global \
        inference_engine, \
        security_validator, \
        rate_limiter, \
        auth_validator, \
        output_validator, \
        instructor_client, \
        monitoring_service, \
        model_registry, \
        version_manager

    logger.info("Starting ML Inference Service...")

    try:
        # Initialize model registry first
        model_registry = ModelRegistry()
        version_manager = ModelVersionManager(model_registry)

        # Initialize monitoring service
        monitoring_service = create_monitoring_service()
        await monitoring_service.start()

        # Initialize components
        security_validator = create_security_validator()
        rate_limiter = create_rate_limiter()
        auth_validator = create_auth_validator(JWT_SECRET_KEY)
        output_validator = create_output_validator()

        # Initialize MLX inference engine
        inference_engine = create_mlx_engine(MODEL_NAME, MODEL_PATH)
        await inference_engine.initialize()

        # Initialize instructor client for structured outputs
        base_client = AsyncOpenAI(
            api_key="ollama",  # Ollama doesn't require a real API key
            base_url=OLLAMA_BASE_URL,
        )

        instructor_client = instructor.from_openai(
            base_client, mode=instructor.Mode.JSON
        )

        logger.info("ML Inference Service initialized successfully")

        yield

    except Exception as e:
        logger.error(f"Failed to initialize service: {e}")
        raise
    finally:
        # Cleanup
        if monitoring_service:
            await monitoring_service.stop()
        if inference_engine:
            await inference_engine.shutdown()
        logger.info("ML Inference Service shutdown complete")


# Create FastAPI app with lifespan
app = FastAPI(
    title="Cortex ML Inference Service",
    description="Production-ready ML inference with MLX and instructor integration",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(authorization: str = Header(None)) -> dict[str, Any] | None:
    """Extract and validate user from authorization header."""
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]  # Remove "Bearer " prefix
    return await auth_validator.validate_token(token)


async def check_rate_limit(
    request: Request, user: dict[str, Any] = Depends(get_current_user)
):
    """Check rate limits for the request."""
    user_id = user.get("user_id") if user else None

    if not await rate_limiter.check_rate_limit(request, user_id):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


@app.post("/predict", dependencies=[Depends(check_rate_limit)])
async def predict(
    request: InferenceRequest, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Enhanced prediction endpoint with security and structured outputs."""
    start_time = time.perf_counter()
    user_id = user.get("user_id") if user else "anonymous"

    try:
        # Security validation
        validation_result = await security_validator.validate_input(
            request.prompt, user_id
        )

        if not validation_result.is_safe:
            SECURITY_BLOCKS.labels(
                reason=validation_result.content_category.value
            ).inc()
            REQUEST_COUNT.labels(model=MODEL_NAME, status="blocked").inc()

            raise HTTPException(
                status_code=400,
                detail=f"Content blocked: {validation_result.reasoning}",
            )

        # Prepare MLX inference request
        mlx_request = MLXInferenceRequest(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stream=request.stream,
            batch_id=f"user_{user_id}_{int(time.time())}",
        )

        # Perform inference
        inference_response = await inference_engine.generate_text(mlx_request)

        # Sanitize output
        sanitized_text = security_validator.sanitize_output(inference_response.text)

        # Structure output if requested
        if request.return_structured and instructor_client:
            try:
                structured_response = await output_validator.structure_response(
                    sanitized_text
                )
                response_data = {
                    "response": structured_response.content,
                    "structured": structured_response.dict(),
                    "metadata": {
                        "model": MODEL_NAME,
                        "tokens_generated": inference_response.tokens_generated,
                        "latency_ms": inference_response.latency_ms,
                        "cached": inference_response.cached,
                        "security_level": validation_result.security_level.value,
                    },
                }
            except Exception as e:
                logger.warning(f"Structured output failed: {e}")
                response_data = {
                    "response": sanitized_text,
                    "metadata": {
                        "model": MODEL_NAME,
                        "tokens_generated": inference_response.tokens_generated,
                        "latency_ms": inference_response.latency_ms,
                        "cached": inference_response.cached,
                        "security_level": validation_result.security_level.value,
                        "structured_output_error": str(e),
                    },
                }
        else:
            response_data = {
                "response": sanitized_text,
                "metadata": {
                    "model": MODEL_NAME,
                    "tokens_generated": inference_response.tokens_generated,
                    "latency_ms": inference_response.latency_ms,
                    "cached": inference_response.cached,
                    "security_level": validation_result.security_level.value,
                },
            }

        # Update metrics
        duration = time.perf_counter() - start_time
        REQUEST_COUNT.labels(model=MODEL_NAME, status="success").inc()
        REQUEST_LATENCY.labels(model=MODEL_NAME).observe(duration)

        if inference_response.cached:
            CACHE_HITS.labels(model=MODEL_NAME).inc()

        logger.info(
            "Inference completed",
            extra={
                "user_id": user_id,
                "prompt_length": len(request.prompt),
                "response_length": len(sanitized_text),
                "latency_ms": inference_response.latency_ms,
                "cached": inference_response.cached,
            },
        )

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(model=MODEL_NAME, status="error").inc()
        logger.error(f"Inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/structured", dependencies=[Depends(check_rate_limit)])
async def structured_inference(
    request: InferenceRequest,
    response_model: str = "StructuredResponse",
    user: dict[str, Any] = Depends(get_current_user),
) -> StructuredResponse:
    """Endpoint specifically for structured outputs using instructor."""

    if not instructor_client:
        raise HTTPException(status_code=503, detail="Instructor client not available")

    user_id = user.get("user_id") if user else "anonymous"

    try:
        # Security validation
        validation_result = await security_validator.validate_input(
            request.prompt, user_id
        )

        if not validation_result.is_safe:
            SECURITY_BLOCKS.labels(
                reason=validation_result.content_category.value
            ).inc()
            raise HTTPException(status_code=400, detail="Content blocked")

        # Use instructor for structured generation
        structured_response = await instructor_client.chat.completions.create(
            model=MODEL_NAME,  # This should map to your Ollama model
            response_model=StructuredResponse,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that provides structured responses.",
                },
                {"role": "user", "content": request.prompt},
            ],
            max_tokens=request.max_tokens or 512,
            temperature=request.temperature or 0.7,
        )

        # Sanitize the structured content
        structured_response.content = security_validator.sanitize_output(
            structured_response.content
        )

        REQUEST_COUNT.labels(model=MODEL_NAME, status="success").inc()

        return structured_response

    except HTTPException:
        raise
    except Exception as e:
        REQUEST_COUNT.labels(model=MODEL_NAME, status="error").inc()
        logger.error(f"Structured inference failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Structured inference failed")


@app.get("/health")
async def health() -> dict[str, Any]:
    """Enhanced health check."""
    health_data = {
        "status": "ok",
        "model": MODEL_NAME,
        "commit": COMMIT_HASH,
        "timestamp": time.time(),
    }

    if inference_engine:
        engine_status = inference_engine.get_status()
        health_data.update(
            {
                "engine_initialized": engine_status["initialized"],
                "mlx_available": engine_status["mlx_available"],
                "cache_info": engine_status["cache_info"],
            }
        )

    return health_data


@app.get("/ready")
async def ready() -> dict[str, Any]:
    """Readiness check."""
    ready_status = {
        "status": "ready"
        if inference_engine and inference_engine.is_initialized
        else "not_ready",
        "model": MODEL_NAME,
        "commit": COMMIT_HASH,
        "components": {
            "inference_engine": inference_engine is not None
            and inference_engine.is_initialized,
            "security_validator": security_validator is not None,
            "rate_limiter": rate_limiter is not None,
            "instructor_client": instructor_client is not None,
        },
    }

    if not all(ready_status["components"].values()):
        raise HTTPException(status_code=503, detail="Service not ready")

    return ready_status


@app.get("/metrics")
async def get_metrics() -> Response:
    """Prometheus metrics endpoint."""
    if monitoring_service:
        data = monitoring_service.get_metrics_export()
    else:
        data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)


@app.get("/performance/report")
async def performance_report(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get detailed performance report."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if monitoring_service:
        report = monitoring_service.get_performance_report()
        return (
            report if isinstance(report, dict) else {"error": "Invalid report format"}
        )
    else:
        return {"error": "Monitoring service not available"}


@app.get("/alerts/active")
async def active_alerts(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get active alerts."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if monitoring_service:
        return {
            "alerts": monitoring_service.alert_manager.get_active_alerts(),
            "summary": monitoring_service.get_alert_summary(),
        }
    else:
        return {"error": "Monitoring service not available"}


@app.get("/health/score")
async def health_score() -> dict[str, Any]:
    """Get health score and status."""
    if monitoring_service:
        status = monitoring_service.get_health_status()
        return (
            status
            if isinstance(status, dict)
            else {"health_score": 50.0, "status": "unknown"}
        )
    else:
        return {
            "health_score": 50.0,
            "status": "unknown",
            "message": "Monitoring service not available",
        }


# Model Registry Endpoints
@app.post("/models/register")
async def register_model(
    model_data: dict[str, Any], user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Register a new model version."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    try:
        model_id = await model_registry.register_model(
            model_path=model_data["model_path"],
            name=model_data["name"],
            version=model_data["version"],
            description=model_data["description"],
            model_type=model_data["model_type"],
            framework=model_data["framework"],
            created_by=user.get("user_id", "unknown"),
            tags=model_data.get("tags"),
            parameters=model_data.get("parameters"),
            performance_metrics=model_data.get("performance_metrics"),
            dependencies=model_data.get("dependencies"),
        )
        return {"model_id": model_id, "status": "registered"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/models/{model_id}/activate")
async def activate_model(
    model_id: str, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Activate a model version."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    try:
        await model_registry.activate_model(model_id)
        return {"model_id": model_id, "status": "activated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/models/{model_name}")
async def get_model_versions(model_name: str) -> dict[str, Any]:
    """Get all versions of a model."""
    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    models = model_registry.list_models(model_name)
    return {
        "model_name": model_name,
        "versions": [
            {
                "model_id": m.model_id,
                "version": m.version,
                "status": m.status.value,
                "created_at": m.created_at.isoformat(),
                "description": m.description,
                "performance_metrics": m.performance_metrics,
            }
            for m in models
        ],
    }


@app.get("/models")
async def list_all_models() -> dict[str, Any]:
    """List all models in the registry."""
    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    models = model_registry.list_models()
    return {
        "models": [
            {
                "model_id": m.model_id,
                "name": m.name,
                "version": m.version,
                "status": m.status.value,
                "created_at": m.created_at.isoformat(),
                "description": m.description,
            }
            for m in models
        ],
        "stats": model_registry.get_registry_stats(),
    }


@app.post("/ab-tests/start")
async def start_ab_test(
    test_config: dict[str, Any], user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, Any]:
    """Start an A/B test between two models."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    try:
        await model_registry.start_ab_test(
            test_id=test_config["test_id"],
            model_a=test_config["model_a"],
            model_b=test_config["model_b"],
            traffic_split=test_config["traffic_split"],
            duration_hours=test_config.get("duration_hours"),
            success_metrics=test_config.get("success_metrics"),
        )
        return {"test_id": test_config["test_id"], "status": "started"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/ab-tests")
async def list_ab_tests() -> dict[str, Any]:
    """List all active A/B tests."""
    if not model_registry:
        raise HTTPException(status_code=503, detail="Model registry not available")

    active_tests = model_registry.list_active_ab_tests()
    return {
        "active_tests": [
            {
                "test_id": t.test_id,
                "model_a": t.model_a,
                "model_b": t.model_b,
                "traffic_split": t.traffic_split,
                "start_time": t.start_time.isoformat(),
                "end_time": t.end_time.isoformat() if t.end_time else None,
                "success_metrics": t.success_metrics,
            }
            for t in active_tests
        ]
    }


@app.post("/models/{model_id}/deploy")
async def deploy_model(
    model_id: str,
    deployment_config: dict[str, Any],
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Deploy a model with specified strategy."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not version_manager:
        raise HTTPException(status_code=503, detail="Version manager not available")

    try:
        strategy = DeploymentStrategy(deployment_config.get("strategy", "immediate"))
        environment = deployment_config.get("environment", "production")
        rollout_percentage = deployment_config.get("rollout_percentage", 100.0)

        deployment_id = await version_manager.deploy_model(
            model_id=model_id,
            strategy=strategy,
            environment=environment,
            rollout_percentage=rollout_percentage,
        )

        return {
            "deployment_id": deployment_id,
            "model_id": model_id,
            "strategy": strategy.value,
            "status": "deployed",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health/detailed")
async def detailed_health() -> dict[str, Any]:
    """Detailed health check with component status."""
    health_report = {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {},
        "errors": [],
    }

    try:
        if inference_engine and hasattr(inference_engine, "health_monitor"):
            health_checks = await inference_engine.health_monitor.run_health_checks()
            health_report["checks"] = health_checks

            # Determine overall status
            if not all(health_checks.values()):
                health_report["status"] = "degraded"
                if "errors" not in health_report:
                    health_report["errors"] = []
                cast(list[str], health_report["errors"]).append(
                    "Some health checks failed"
                )
        else:
            health_report["status"] = "degraded"
            if "errors" not in health_report:
                health_report["errors"] = []
            cast(list[str], health_report["errors"]).append(
                "Health monitoring not available"
            )

    except Exception as e:
        health_report["status"] = "unhealthy"
        if "errors" not in health_report:
            health_report["errors"] = []
        cast(list[str], health_report["errors"]).append(f"Health check error: {e!s}")

    return health_report


@app.get("/errors/metrics")
async def error_metrics(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get error metrics and statistics."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    metrics = {
        "total_errors": 0,
        "error_rate": 0.0,
        "error_types": {},
        "last_error": None,
        "recovery_stats": {"attempts": 0, "successes": 0, "success_rate": 0.0},
    }

    try:
        if inference_engine and hasattr(inference_engine, "error_handler"):
            error_handler = inference_engine.error_handler
            metrics.update(
                {
                    "total_errors": error_handler.metrics.total_errors,
                    "error_rate": error_handler.metrics.error_rate,
                    "error_types": error_handler.metrics.error_types,
                    "last_error": error_handler.metrics.last_error_time.isoformat()
                    if error_handler.metrics.last_error_time
                    else None,
                    "recovery_stats": {
                        "attempts": error_handler.metrics.recovery_attempts,
                        "successes": error_handler.metrics.successful_recoveries,
                        "success_rate": (
                            error_handler.metrics.successful_recoveries
                            / max(1, error_handler.metrics.recovery_attempts)
                        )
                        * 100,
                    },
                }
            )
    except Exception as e:
        logger.error(f"Error retrieving metrics: {e}")

    return metrics


@app.get("/circuit-breaker/status")
async def circuit_breaker_status(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Get circuit breaker status."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    status = {
        "state": "unknown",
        "failure_count": 0,
        "last_failure": None,
        "available": False,
    }

    try:
        if inference_engine and hasattr(inference_engine, "circuit_breaker"):
            cb = inference_engine.circuit_breaker
            status.update(
                {
                    "state": cb.state.value,
                    "failure_count": cb.failure_count,
                    "last_failure": cb.last_failure_time.isoformat()
                    if cb.last_failure_time
                    else None,
                    "available": cb.state.value != "open",
                }
            )
    except Exception as e:
        logger.error(f"Error retrieving circuit breaker status: {e}")

    return status


@app.post("/circuit-breaker/reset")
async def reset_circuit_breaker(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Reset circuit breaker (admin only)."""
    if not user or "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        if inference_engine and hasattr(inference_engine, "circuit_breaker"):
            cb = inference_engine.circuit_breaker
            cb.failure_count = 0
            cb.last_failure_time = None
            cb.state = cb.CircuitBreakerState.CLOSED
            return {"status": "circuit_breaker_reset", "timestamp": str(time.time())}
        else:
            raise HTTPException(status_code=500, detail="Circuit breaker not available")
    except Exception as e:
        logger.error(f"Error resetting circuit breaker: {e}")
        raise HTTPException(status_code=500, detail=f"Reset failed: {e!s}")


@app.get("/status")
async def status(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Detailed status endpoint."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    status_data = {
        "service": "ml-inference",
        "version": "1.0.0",
        "model": MODEL_NAME,
        "commit": COMMIT_HASH,
        "uptime": time.time(),
        "ollama_base_url": OLLAMA_BASE_URL,
    }

    if inference_engine:
        status_data["engine"] = inference_engine.get_status()

    if security_validator:
        status_data["security"] = {
            "validator_active": True,
            "content_filters": len(security_validator.banned_patterns),
            "pii_patterns": len(security_validator.pii_patterns),
        }

    return status_data


@app.post("/cache/clear")
async def clear_cache(
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Clear inference cache."""
    if not user or "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin access required")

    if inference_engine:
        inference_engine.clear_cache()

    return {"status": "cache_cleared", "timestamp": str(time.time())}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
