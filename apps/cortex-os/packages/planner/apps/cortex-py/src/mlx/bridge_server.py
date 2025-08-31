#!/usr/bin/env python3
"""
Python bridge server for ML optimization engine.

Provides a JSON-RPC interface for TypeScript orchestration layer to
communicate with Python ML optimization components.
"""

import asyncio
import json
import logging
import sys
import traceback
from datetime import datetime
from typing import Any

from .memory_monitor import MemoryMonitor
from .model_registry import ModelRegistry

# Import ML optimization components
from .optimization_engine import OptimizationContext, OptimizationEngine, TaskType
from .performance_tracker import InferenceMetrics, PerformanceTracker
from .security_validator import SecurityContext, SecurityValidator

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MLOptimizationBridgeServer:
    """Bridge server for ML optimization engine."""

    def __init__(self):
        """Initialize the bridge server."""

        # Initialize ML components
        self.model_registry = ModelRegistry()
        self.memory_monitor = MemoryMonitor()
        self.security_validator = SecurityValidator()
        self.performance_tracker = PerformanceTracker()
        self.optimization_engine = OptimizationEngine(
            self.model_registry,
            self.memory_monitor,
            self.security_validator,
            self.performance_tracker,
        )

        self.is_running = False

        # Method registry
        self.methods = {
            "health_check": self.health_check,
            "select_optimal_model": self.select_optimal_model,
            "validate_input": self.validate_input,
            "validate_output": self.validate_output,
            "get_performance_metrics": self.get_performance_metrics,
            "get_memory_state": self.get_memory_state,
            "get_optimization_stats": self.get_optimization_stats,
            "record_inference": self.record_inference,
        }

        logger.info("ML Optimization Bridge Server initialized")

    async def start(self):
        """Start the bridge server."""

        self.is_running = True

        try:
            # Send startup event
            await self.send_event(
                "bridge_started",
                {
                    "timestamp": datetime.now().isoformat(),
                    "components": [
                        "optimization_engine",
                        "model_registry",
                        "memory_monitor",
                        "security_validator",
                        "performance_tracker",
                    ],
                },
            )

            # Start message processing loop
            await self.message_loop()

        except Exception as e:
            logger.error(f"Bridge server error: {e}")
            await self.send_log("error", f"Bridge server error: {e}")
        finally:
            await self.cleanup()

    async def message_loop(self):
        """Main message processing loop."""

        while self.is_running:
            try:
                # Read message from stdin
                line = await self.read_stdin_line()
                if not line:
                    continue

                # Parse JSON message
                try:
                    message = json.loads(line)
                except json.JSONDecodeError as e:
                    await self.send_log("error", f"Invalid JSON: {e}")
                    continue

                # Process message
                await self.process_message(message)

            except EOFError:
                # EOF received, shutdown gracefully
                logger.info("EOF received, shutting down")
                break
            except Exception as e:
                logger.error(f"Message loop error: {e}")
                await self.send_log("error", f"Message loop error: {e}")
                await asyncio.sleep(0.1)  # Brief pause to prevent tight error loop

    async def read_stdin_line(self) -> str | None:
        """Read a line from stdin asynchronously."""

        loop = asyncio.get_event_loop()

        def read_line():
            return sys.stdin.readline()

        try:
            line = await loop.run_in_executor(None, read_line)
            return line.strip() if line else None
        except Exception:
            return None

    async def process_message(self, message: dict[str, Any]):
        """Process incoming message."""

        request_id = message.get("id")
        method = message.get("method")
        params = message.get("params", {})

        if not request_id or not method:
            await self.send_log("error", "Invalid message format")
            return

        try:
            # Call method
            if method in self.methods:
                result = await self.methods[method](**params)

                # Send response
                await self.send_response(request_id, result)

            else:
                await self.send_error(request_id, f"Unknown method: {method}")

        except Exception as e:
            logger.error(f"Method {method} failed: {e}")
            await self.send_error(request_id, f"Method failed: {e!s}")

    async def send_response(self, request_id: str, result: Any):
        """Send successful response."""

        response = {"type": "response", "id": request_id, "result": result}

        await self.send_message(response)

    async def send_error(self, request_id: str, error: str):
        """Send error response."""

        response = {"type": "response", "id": request_id, "error": error}

        await self.send_message(response)

    async def send_event(self, event: str, data: Any):
        """Send event message."""

        message = {
            "type": "event",
            "event": event,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }

        await self.send_message(message)

    async def send_log(self, level: str, message: str):
        """Send log message."""

        log_message = {
            "type": "log",
            "level": level,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }

        await self.send_message(log_message)

    async def send_message(self, message: dict[str, Any]):
        """Send message to stdout."""

        try:
            json_message = json.dumps(message)
            print(json_message, flush=True)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")

    # API Methods

    async def health_check(self) -> dict[str, Any]:
        """Health check endpoint."""

        try:
            # Check component health
            memory_state = await self.memory_monitor.get_memory_state()
            performance_metrics = await self.performance_tracker.get_current_metrics()

            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "components": {
                    "optimization_engine": "healthy",
                    "model_registry": "healthy",
                    "memory_monitor": "healthy",
                    "security_validator": "healthy",
                    "performance_tracker": "healthy",
                },
                "system": {
                    "memory_usage_percent": memory_state.usage_percent,
                    "available_memory_gb": memory_state.available_gb,
                    "average_latency_ms": performance_metrics.latency_ms,
                },
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
            }

    async def select_optimal_model(
        self, context: dict[str, Any], force_reevaluation: bool = False
    ) -> dict[str, Any]:
        """Select optimal model for given context."""

        try:
            # Convert context
            optimization_context = OptimizationContext(
                task_type=TaskType[context["task_type"]],
                priority=context.get("priority", "normal"),
                max_latency_ms=context.get("max_latency_ms"),
                min_quality_score=context.get("min_quality_score", 0.5),
                memory_limit_gb=context.get("memory_limit_gb"),
                security_level=context.get("security_level", "standard"),
                user_preferences=context.get("user_preferences", {}),
                session_id=context.get("session_id"),
            )

            # Select model
            selection = await self.optimization_engine.select_optimal_model(
                optimization_context, force_reevaluation
            )

            # Convert to serializable format
            return {
                "model_config": {
                    "name": selection.model_config.name,
                    "backend": selection.model_config.backend.value,
                    "model_path": selection.model_config.model_path,
                    "memory_gb": selection.model_config.memory_gb,
                    "context_length": selection.model_config.context_length,
                    "quality_score": selection.model_config.quality_score,
                    "specialized_tasks": [
                        task.name for task in selection.model_config.specialized_tasks
                    ],
                    "sandboxed": selection.model_config.sandboxed,
                    "pii_redaction": selection.model_config.pii_redaction,
                },
                "confidence": selection.confidence,
                "reasoning": selection.reasoning,
                "estimated_memory_gb": selection.estimated_memory_gb,
                "estimated_latency_ms": selection.estimated_latency_ms,
                "switch_reason": selection.switch_reason.name
                if selection.switch_reason
                else None,
            }

        except Exception as e:
            logger.error(f"Model selection failed: {e}")
            raise

    async def validate_input(
        self, input_text: str, context: dict[str, Any], model_name: str | None = None
    ) -> dict[str, Any]:
        """Validate input for security violations."""

        try:
            # Convert security context
            security_context = SecurityContext(
                user_id=context.get("user_id"),
                session_id=context.get("session_id"),
                security_level=context.get("security_level", "STANDARD"),
                source_ip=context.get("source_ip"),
                user_agent=context.get("user_agent"),
                content_sensitivity=context.get("content_sensitivity", "public"),
                data_classification=context.get("data_classification", "general"),
                gdpr_applicable=context.get("gdpr_applicable", False),
                hipaa_applicable=context.get("hipaa_applicable", False),
                sox_applicable=context.get("sox_applicable", False),
                metadata=context.get("metadata", {}),
            )

            # Get model config if specified
            model_config = None
            if model_name:
                model_config = self.model_registry.get_model(model_name)

            # Validate input
            result = await self.security_validator.validate_input(
                input_text, security_context, model_config
            )

            # Convert to serializable format
            return {
                "is_valid": result.is_valid,
                "security_score": result.security_score,
                "violations": [
                    {
                        "violation_type": v.violation_type.name,
                        "severity": v.severity,
                        "description": v.description,
                        "blocked": v.blocked,
                        "sanitized": v.sanitized,
                    }
                    for v in result.violations
                ],
                "sanitized_input": result.sanitized_input,
                "recommendations": result.recommendations,
                "validation_time_ms": result.validation_time_ms,
                "rules_applied": result.rules_applied,
            }

        except Exception as e:
            logger.error(f"Input validation failed: {e}")
            raise

    async def validate_output(
        self,
        output_text: str,
        input_text: str,
        context: dict[str, Any],
        model_name: str | None = None,
    ) -> dict[str, Any]:
        """Validate output for security violations."""

        try:
            # Convert security context
            security_context = SecurityContext(
                user_id=context.get("user_id"),
                session_id=context.get("session_id"),
                security_level=context.get("security_level", "STANDARD"),
                source_ip=context.get("source_ip"),
                user_agent=context.get("user_agent"),
                content_sensitivity=context.get("content_sensitivity", "public"),
                data_classification=context.get("data_classification", "general"),
                gdpr_applicable=context.get("gdpr_applicable", False),
                hipaa_applicable=context.get("hipaa_applicable", False),
                sox_applicable=context.get("sox_applicable", False),
                metadata=context.get("metadata", {}),
            )

            # Get model config if specified
            model_config = None
            if model_name:
                model_config = self.model_registry.get_model(model_name)

            # Validate output
            result = await self.security_validator.validate_output(
                output_text, input_text, security_context, model_config
            )

            # Convert to serializable format
            return {
                "is_valid": result.is_valid,
                "security_score": result.security_score,
                "violations": [
                    {
                        "violation_type": v.violation_type.name,
                        "severity": v.severity,
                        "description": v.description,
                        "blocked": v.blocked,
                        "sanitized": v.sanitized,
                    }
                    for v in result.violations
                ],
                "sanitized_output": result.sanitized_output,
                "recommendations": result.recommendations,
                "validation_time_ms": result.validation_time_ms,
                "rules_applied": result.rules_applied,
            }

        except Exception as e:
            logger.error(f"Output validation failed: {e}")
            raise

    async def get_performance_metrics(self) -> dict[str, Any]:
        """Get current performance metrics."""

        try:
            current_metrics = await self.performance_tracker.get_current_metrics()
            aggregated_metrics = await self.performance_tracker.get_aggregated_metrics(
                60
            )
            slo_status = await self.performance_tracker.check_slo_compliance()

            return {
                "average_latency_ms": current_metrics.latency_ms,
                "p95_latency_ms": aggregated_metrics.p95_latency_ms,
                "tokens_per_second": current_metrics.tokens_per_second,
                "error_rate": aggregated_metrics.error_rate,
                "memory_usage_gb": aggregated_metrics.average_memory_mb / 1024,
                "carbon_emission_g": aggregated_metrics.total_carbon_g,
                "slo_compliance": slo_status,
            }

        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            raise

    async def get_memory_state(self) -> dict[str, Any]:
        """Get memory state and predictions."""

        try:
            memory_state = await self.memory_monitor.get_memory_state()

            # Get memory prediction for next 5 minutes
            prediction = await self.memory_monitor.predict_memory_usage(
                model_names=[],  # Current models
                context_lengths=[],
                horizon_minutes=5,
            )

            return {
                "current": {
                    "total_gb": memory_state.total_gb,
                    "available_gb": memory_state.available_gb,
                    "used_gb": memory_state.used_gb,
                    "usage_percent": memory_state.usage_percent,
                },
                "predictions": {
                    "predicted_memory_gb": prediction.predicted_memory_gb,
                    "confidence": prediction.confidence,
                    "reasoning": prediction.reasoning,
                },
            }

        except Exception as e:
            logger.error(f"Failed to get memory state: {e}")
            raise

    async def get_optimization_stats(self) -> dict[str, Any]:
        """Get optimization engine statistics."""

        try:
            stats = await self.optimization_engine.get_optimization_stats()
            return stats

        except Exception as e:
            logger.error(f"Failed to get optimization stats: {e}")
            raise

    async def record_inference(self, metrics: dict[str, Any]) -> dict[str, Any]:
        """Record inference metrics."""

        try:
            inference_metrics = InferenceMetrics(
                request_time=datetime.now(),
                latency_ms=metrics["latency_ms"],
                input_tokens=metrics.get("input_tokens", 0),
                output_tokens=metrics.get("output_tokens", 0),
                model_name=metrics.get("model_name", ""),
                task_type=metrics.get("task_type", ""),
                error_occurred=metrics.get("error_occurred", False),
                user_id=metrics.get("user_id"),
                session_id=metrics.get("session_id"),
            )

            await self.performance_tracker.record_inference(inference_metrics)

            return {"success": True}

        except Exception as e:
            logger.error(f"Failed to record inference: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources."""

        try:
            await self.optimization_engine.cleanup()
            await self.memory_monitor.cleanup()
            await self.security_validator.cleanup()
            await self.performance_tracker.cleanup()

            await self.send_event(
                "bridge_shutdown", {"timestamp": datetime.now().isoformat()}
            )

        except Exception as e:
            logger.error(f"Cleanup error: {e}")


async def main():
    """Main entry point."""

    # Create and start bridge server
    bridge_server = MLOptimizationBridgeServer()

    try:
        await bridge_server.start()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Bridge server failed: {e}")
        logger.error(traceback.format_exc())
    finally:
        await bridge_server.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
