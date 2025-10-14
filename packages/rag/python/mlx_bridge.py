"""
Production MLX Bridge Server
Comprehensive bridge between TypeScript MLX client and Python MLX implementation
"""

import asyncio
import json
import sys
import time
import traceback
from typing import Any
import importlib.util

# Check MLX availability at import time
MLX_AVAILABLE = (
    importlib.util.find_spec("mlx") is not None and
    importlib.util.find_spec("mlx_lm") is not None
)

if MLX_AVAILABLE:
    import mlx.core as mx
    import mlx.nn as nn
    from mlx_lm import load, generate
else:
    # Mock imports for graceful degradation
    mx = None
    nn = None
    load = None
    generate = None


class MemoryMonitor:
    """Monitor and report memory usage"""
    
    def __init__(self):
        self.baseline_memory = 0
        self.peak_memory = 0
        
    def get_memory_usage(self) -> int:
        """Get current memory usage in bytes"""
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            return memory_info.rss
        except ImportError:
            # Fallback to basic memory estimation
            return 0

    def update_peak(self, current: int | None = None) -> None:
        """Update peak memory usage"""
        if current is None:
            current = self.get_memory_usage()
        self.peak_memory = max(self.peak_memory, current)


class MLXBridge:
    """Production MLX bridge server for TypeScript integration"""

    def __init__(self):
        self.models: dict[str, Any] = {}
        self.tokenizers: dict[str, Any] = {}
        self.memory_monitor = MemoryMonitor()
        self.load_times: dict[str, float] = {}
        self.generation_stats: dict[str, int] = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0
        }
        self.error_history: list[dict[str, Any]] = []
        self.max_error_history = 100
        
    async def handle_request(self, request: dict[str, Any]) -> dict[str, Any]:
        """Handle incoming requests from TypeScript client"""
        start_time = time.time()

        # Validate request structure
        if not isinstance(request, dict):
            error_msg = "Invalid request: must be a dictionary"
            self._log_error(error_msg, {"request_type": type(request).__name__})
            return {"error": error_msg, "code": "INVALID_REQUEST"}

        action = request.get('action')
        if not action:
            error_msg = "Missing required field: action"
            self._log_error(error_msg, request)
            return {"error": error_msg, "code": "MISSING_ACTION"}

        try:
            self.generation_stats["total_requests"] += 1

            if action == 'health':
                return await self._with_error_handling('health_check', self.health_check, request)
            elif action == 'generate':
                return await self._with_error_handling('generate_text', self.generate_text, request)
            elif action == 'embed':
                return await self._with_error_handling('generate_embeddings', self.generate_embeddings, request)
            elif action == 'load_model':
                return await self._with_error_handling('load_model', self.load_model, request)
            elif action == 'unload_model':
                return await self._with_error_handling('unload_model', self.unload_model, request)
            elif action == 'list_models':
                return await self._with_error_handling('list_models', self.list_models, request)
            else:
                error_msg = f"Unknown action: {action}"
                self._log_error(error_msg, {"action": action, "available_actions": ["health", "generate", "embed", "load_model", "unload_model", "list_models"]})
                return {"error": error_msg, "code": "UNKNOWN_ACTION"}

        except Exception as e:
            self.generation_stats["failed_requests"] += 1
            error_info = {
                "error": str(e),
                "code": "INTERNAL_ERROR",
                "action": action,
                "timestamp": time.time(),
                "request_id": request.get("request_id", "unknown"),
                "processing_time_ms": (time.time() - start_time) * 1000
            }

            # Add traceback for debugging but limit size
            if sys.version_info >= (3, 8):
                error_info["traceback"] = traceback.format_exc()[:2000]  # Limit to 2000 chars

            self._log_error(f"Unhandled exception in action '{action}'", error_info)
            return error_info

    def _log_error(self, message: str, context: dict[str, Any] | None = None) -> None:
        """Log error with context and maintain error history"""
        error_entry = {
            "timestamp": time.time(),
            "message": message,
            "context": context or {},
            "memory_usage": self.memory_monitor.get_memory_usage(),
            "loaded_models": len(self.models)
        }

        self.error_history.append(error_entry)

        # Limit error history size
        if len(self.error_history) > self.max_error_history:
            self.error_history = self.error_history[-self.max_error_history:]

        # Log to stderr (can be enhanced with proper logging)
        print(f"[ERROR] {message}", file=sys.stderr)
        if context:
            print(f"[CONTEXT] {context}", file=sys.stderr)

    def _get_error_summary(self) -> dict[str, Any]:
        """Get summary of recent errors for debugging"""
        if not self.error_history:
            return {"recent_errors": 0, "error_rate": 0.0}

        recent_errors = [e for e in self.error_history if time.time() - e["timestamp"] < 300]  # Last 5 minutes
        total_requests = max(self.generation_stats["total_requests"], 1)

        return {
            "recent_errors": len(recent_errors),
            "error_rate": len(recent_errors) / total_requests,
            "last_error": self.error_history[-1] if self.error_history else None,
            "error_types": list(set(e.get("context", {}).get("code", "UNKNOWN") for e in recent_errors))
        }

    async def _with_error_handling(self, operation_name: str, operation_func, request: dict[str, Any]) -> dict[str, Any]:
        """Generic error handling wrapper for operations"""
        start_time = time.time()

        try:
            result = await operation_func(request)

            # Add success metadata
            if isinstance(result, dict):
                result["success"] = True
                result["operation"] = operation_name
                result["processing_time_ms"] = (time.time() - start_time) * 1000

            self.generation_stats["successful_requests"] += 1
            return result

        except MemoryError as e:
            self._log_error(f"Memory error in {operation_name}", {"error": str(e), "available_memory": self.memory_monitor.get_memory_usage()})
            # Try to free memory
            await self._emergency_memory_cleanup()
            return {
                "success": False,
                "error": f"Insufficient memory: {str(e)}",
                "code": "MEMORY_ERROR",
                "operation": operation_name,
                "recovery_attempted": True
            }

        except ImportError as e:
            self._log_error(f"Import error in {operation_name}", {"error": str(e)})
            return {
                "success": False,
                "error": f"MLX dependencies not available: {str(e)}",
                "code": "DEPENDENCY_ERROR",
                "operation": operation_name,
                "suggestion": "Ensure MLX and mlx_lm are properly installed"
            }

        except (ValueError, TypeError) as e:
            self._log_error(f"Validation error in {operation_name}", {"error": str(e), "request_keys": list(request.keys())})
            return {
                "success": False,
                "error": f"Invalid input: {str(e)}",
                "code": "VALIDATION_ERROR",
                "operation": operation_name,
                "suggestion": "Check request format and parameter types"
            }

        except TimeoutError as e:
            self._log_error(f"Timeout in {operation_name}", {"error": str(e), "timeout_ms": (time.time() - start_time) * 1000})
            return {
                "success": False,
                "error": f"Operation timed out: {str(e)}",
                "code": "TIMEOUT_ERROR",
                "operation": operation_name,
                "timeout_ms": (time.time() - start_time) * 1000
            }

        except Exception as e:
            self._log_error(f"Unexpected error in {operation_name}", {"error": str(e), "error_type": type(e).__name__})
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "code": "UNEXPECTED_ERROR",
                "operation": operation_name,
                "error_type": type(e).__name__
            }

    async def _emergency_memory_cleanup(self) -> None:
        """Emergency memory cleanup when memory is exhausted"""
        try:
            # Clear least recently used models if memory is low
            if len(self.models) > 1:
                # Remove oldest model (simple strategy)
                oldest_model = next(iter(self.models))
                await self.unload_model({"model_path": oldest_model})
                print(f"[INFO] Emergency cleanup: unloaded model {oldest_model}", file=sys.stderr)

            # Force garbage collection
            import gc
            gc.collect()

        except Exception as e:
            print(f"[ERROR] Emergency memory cleanup failed: {e}", file=sys.stderr)

    async def health_check(self) -> dict[str, Any]:
        """Comprehensive health check with error diagnostics"""
        memory_usage = self.memory_monitor.get_memory_usage()
        self.memory_monitor.update_peak(memory_usage)

        # Determine overall health status
        status_issues = []
        if not MLX_AVAILABLE:
            status_issues.append("MLX not available")

        if memory_usage > 8 * 1024 * 1024 * 1024:  # 8GB
            status_issues.append("High memory usage")

        error_summary = self._get_error_summary()
        if error_summary["error_rate"] > 0.1:  # 10% error rate
            status_issues.append("High error rate")

        if len(self.models) == 0:
            status_issues.append("No models loaded")

        overall_status = "healthy" if not status_issues else "degraded" if len(status_issues) <= 2 else "unhealthy"

        health_data = {
            "status": overall_status,
            "mlx_available": MLX_AVAILABLE,
            "python_version": sys.version,
            "memory_usage": memory_usage,
            "peak_memory": self.memory_monitor.peak_memory,
            "loaded_models": len(self.models),
            "model_list": list(self.models.keys()),
            "generation_stats": self.generation_stats,
            "platform": sys.platform,
            "mlx_devices": self.get_mlx_devices() if MLX_AVAILABLE else [],
            "diagnostics": {
                "issues": status_issues,
                "error_summary": error_summary,
                "memory_pressure": "high" if memory_usage > 6 * 1024 * 1024 * 1024 else "normal",
                "uptime": time.time() - getattr(self, '_start_time', time.time()),  # Track if available
                "last_request": getattr(self, '_last_request_time', None)
            }
        }

        # Add performance metrics
        total_requests = self.generation_stats["total_requests"]
        if total_requests > 0:
            success_rate = self.generation_stats["successful_requests"] / total_requests
            health_data["performance"] = {
                "success_rate": success_rate,
                "total_requests": total_requests,
                "average_response_time_ms": getattr(self, '_avg_response_time', 0)
            }

        return health_data
    
    def get_mlx_devices(self) -> list[str]:
        """Get available MLX devices"""
        if not MLX_AVAILABLE or not mx:
            return []
        
        try:
            # MLX device detection
            devices = []
            if hasattr(mx, 'default_device'):
                devices.append(str(mx.default_device()))
            return devices
        except Exception:
            return ["cpu"]
    
    async def load_model(self, request: dict[str, Any]) -> dict[str, Any]:
        """Load an MLX model"""
        if not MLX_AVAILABLE:
            raise RuntimeError("MLX not available")
        
        model_path = request.get("model_path")
        if not model_path:
            raise ValueError("model_path is required")
        
        # Check if model is already loaded
        if model_path in self.models:
            return {
                "loaded": True,
                "already_loaded": True,
                "model_path": model_path,
                "load_time": self.load_times.get(model_path, 0)
            }
        
        start_time = time.time()
        memory_before = self.memory_monitor.get_memory_usage()
        
        try:
            # Load model and tokenizer
            model, tokenizer = load(model_path)
            
            # Store in cache
            self.models[model_path] = model
            self.tokenizers[model_path] = tokenizer
            
            load_time = time.time() - start_time
            self.load_times[model_path] = load_time
            
            memory_after = self.memory_monitor.get_memory_usage()
            memory_delta = memory_after - memory_before
            self.memory_monitor.update_peak(memory_after)
            
            return {
                "loaded": True,
                "model_path": model_path,
                "load_time": load_time,
                "memory_usage": memory_delta,
                "total_memory": memory_after
            }
            
        except Exception as e:
            return {
                "loaded": False,
                "error": str(e),
                "model_path": model_path,
                "load_time": time.time() - start_time
            }
    
    async def unload_model(self, request: dict[str, Any]) -> dict[str, Any]:
        """Unload a model to free memory"""
        model_path = request.get("model_path")
        if not model_path:
            raise ValueError("model_path is required")
        
        memory_before = self.memory_monitor.get_memory_usage()
        
        # Remove from cache
        if model_path in self.models:
            del self.models[model_path]
        if model_path in self.tokenizers:
            del self.tokenizers[model_path]
        if model_path in self.load_times:
            del self.load_times[model_path]
        
        # Force garbage collection if available
        try:
            import gc
            gc.collect()
        except ImportError:
            pass
        
        memory_after = self.memory_monitor.get_memory_usage()
        memory_freed = memory_before - memory_after
        
        return {
            "unloaded": True,
            "model_path": model_path,
            "memory_freed": memory_freed,
            "remaining_models": len(self.models)
        }
    
    async def list_models(self) -> dict[str, Any]:
        """List loaded models and their statistics"""
        models_info = []
        
        for model_path in self.models.keys():
            models_info.append({
                "path": model_path,
                "name": model_path.split("/")[-1] if "/" in model_path else model_path,
                "load_time": self.load_times.get(model_path, 0),
                "loaded": True,
                "size": 0  # Placeholder - could estimate model size
            })
        
        return {
            "models": models_info,
            "total_loaded": len(self.models)
        }
    
    async def generate_text(self, request: dict[str, Any]) -> dict[str, Any]:
        """Generate text using MLX model with comprehensive error handling"""
        if not MLX_AVAILABLE:
            raise RuntimeError("MLX not available")

        # Validate and extract parameters
        model_path = request.get("model")
        if not model_path or not isinstance(model_path, str):
            raise ValueError("Valid model path is required")

        prompt = request.get("prompt", "")
        if not isinstance(prompt, str):
            raise ValueError("Prompt must be a string")

        if len(prompt) == 0:
            raise ValueError("Prompt cannot be empty")

        if len(prompt) > 100000:  # 100K character limit
            raise ValueError(f"Prompt too long: {len(prompt)} characters (max 100000)")

        max_tokens = self._validate_int_param(request.get("max_tokens", 2048), "max_tokens", 1, 4096)
        temperature = self._validate_float_param(request.get("temperature", 0.7), "temperature", 0.0, 2.0)
        top_p = self._validate_float_param(request.get("top_p", 0.9), "top_p", 0.0, 1.0)

        start_time = time.time()
        self._last_request_time = start_time

        try:
            # Load model if not already loaded
            if model_path not in self.models:
                load_result = await self.load_model({"model_path": model_path})
                if not load_result.get("loaded"):
                    raise RuntimeError(f"Failed to load model: {load_result.get('error', 'Unknown error')}")

            model = self.models[model_path]
            tokenizer = self.tokenizers[model_path]

            # Pre-generation validation
            if not model or not tokenizer:
                raise RuntimeError("Model or tokenizer not properly loaded")

            # Generate with timeout protection
            generation_timeout = request.get("timeout", 300)  # 5 minutes default
            response = await self._generate_with_timeout(
                model, tokenizer, prompt, temperature, top_p, max_tokens, generation_timeout
            )

            # Post-generation validation
            if not response or not isinstance(response, str):
                raise RuntimeError("Invalid generation response")

            # Extract generated text (remove prompt)
            if len(response) > len(prompt):
                generated_text = response[len(prompt):].strip()
            else:
                generated_text = response.strip()

            if not generated_text:
                self._log_error("Empty generation result", {"prompt_length": len(prompt), "response_length": len(response)})

            # Calculate metrics
            total_time = (time.time() - start_time) * 1000
            current_memory = self.memory_monitor.get_memory_usage()
            self.memory_monitor.update_peak(current_memory)

            # Update performance tracking
            self._update_performance_metrics(total_time)

            return {
                "text": generated_text,
                "total_time_ms": total_time,
                "prompt_length": len(prompt),
                "response_length": len(generated_text),
                "memory_usage": current_memory,
                "model_used": model_path,
                "tokens_generated": max_tokens  # Estimate
            }

        except RuntimeError:
            # Re-raise runtime errors directly
            raise
        except Exception as e:
            error_msg = f"Unexpected generation error: {str(e)}"
            self._log_error(error_msg, {
                "model_path": model_path,
                "prompt_length": len(prompt),
                "max_tokens": max_tokens,
                "error_type": type(e).__name__
            })
            raise RuntimeError(error_msg)

    def _validate_int_param(self, value: Any, name: str, min_val: int, max_val: int) -> int:
        """Validate integer parameter"""
        try:
            int_val = int(value)
            if not (min_val <= int_val <= max_val):
                raise ValueError(f"{name} must be between {min_val} and {max_val}, got {int_val}")
            return int_val
        except (ValueError, TypeError):
            raise ValueError(f"{name} must be a valid integer, got {value}")

    def _validate_float_param(self, value: Any, name: str, min_val: float, max_val: float) -> float:
        """Validate float parameter"""
        try:
            float_val = float(value)
            if not (min_val <= float_val <= max_val):
                raise ValueError(f"{name} must be between {min_val} and {max_val}, got {float_val}")
            return float_val
        except (ValueError, TypeError):
            raise ValueError(f"{name} must be a valid number, got {value}")

    async def _generate_with_timeout(self, model, tokenizer, prompt: str, temperature: float,
                                   top_p: float, max_tokens: int, timeout: int) -> str:
        """Generate text with timeout protection"""
        try:
            # Run generation in a way that can be timed out
            import asyncio

            def sync_generate():
                return generate(
                    model,
                    tokenizer,
                    prompt=prompt,
                    temp=temperature,
                    top_p=top_p,
                    max_tokens=max_tokens
                )

            # Run synchronously but with timeout
            response = await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, sync_generate),
                timeout=timeout
            )

            return response

        except asyncio.TimeoutError:
            raise RuntimeError(f"Generation timed out after {timeout} seconds")

    def _update_performance_metrics(self, response_time_ms: float) -> None:
        """Update performance tracking metrics"""
        if not hasattr(self, '_response_times'):
            self._response_times = []

        self._response_times.append(response_time_ms)

        # Keep only last 100 response times
        if len(self._response_times) > 100:
            self._response_times = self._response_times[-100:]

        # Calculate average
        self._avg_response_time = sum(self._response_times) / len(self._response_times)
    
    async def generate_embeddings(self, request: dict[str, Any]) -> dict[str, Any]:
        """Generate embeddings for text"""
        # This is a placeholder implementation
        # In a real implementation, you would use an MLX embedding model
        texts = request.get("texts", [])
        
        if not texts:
            return {"embeddings": []}
        
        # Mock embeddings for now
        embeddings = []
        for _text in texts:
            # Generate mock embedding vector of size 384
            embedding = [0.1] * 384  # Placeholder
            embeddings.append(embedding)
        
        return {
            "embeddings": embeddings,
            "model": "mock-embedder",
            "dimensions": 384,
            "count": len(embeddings)
        }


async def main():
    """Main async entry point with comprehensive error handling"""
    bridge = MLXBridge()

    # Track initialization time
    bridge._start_time = time.time()

    try:
        # Read input from stdin with timeout
        input_data = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, sys.stdin.read),
            timeout=30.0  # 30 second timeout for input
        )

        if not input_data.strip():
            error_result = {
                "success": False,
                "error": "No input data provided",
                "code": "NO_INPUT",
                "suggestion": "Provide JSON input via stdin"
            }
            print(json.dumps(error_result))
            sys.exit(1)

        # Parse JSON with detailed error reporting
        try:
            request = json.loads(input_data)
        except json.JSONDecodeError as e:
            error_result = {
                "success": False,
                "error": f"Invalid JSON input: {str(e)}",
                "code": "JSON_PARSE_ERROR",
                "line": getattr(e, 'lineno', 'unknown'),
                "column": getattr(e, 'colno', 'unknown'),
                "input_preview": input_data[:200] + "..." if len(input_data) > 200 else input_data,
                "suggestion": "Check JSON syntax and structure"
            }
            print(json.dumps(error_result))
            sys.exit(1)

        # Add request metadata
        if isinstance(request, dict):
            request["request_id"] = request.get("request_id", f"req_{int(time.time())}")

        # Process request
        result = await bridge.handle_request(request)

        # Ensure result is serializable
        try:
            json_output = json.dumps(result, default=str)  # Handle non-serializable objects
        except (TypeError, ValueError) as e:
            # Fallback if result contains non-serializable data
            safe_result = {
                "success": False,
                "error": f"Result serialization failed: {str(e)}",
                "code": "SERIALIZATION_ERROR",
                "original_result_type": type(result).__name__
            }
            json_output = json.dumps(safe_result, default=str)

        # Output result
        print(json_output)

        # Exit with appropriate code based on success
        if isinstance(result, dict) and result.get("success", True):
            sys.exit(0)
        else:
            sys.exit(1)

    except asyncio.TimeoutError:
        error_result = {
            "success": False,
            "error": "Input reading timed out",
            "code": "INPUT_TIMEOUT",
            "timeout_seconds": 30,
            "suggestion": "Provide input more quickly or check for blocking operations"
        }
        print(json.dumps(error_result))
        sys.exit(1)

    except KeyboardInterrupt:
        error_result = {
            "success": False,
            "error": "Operation interrupted by user",
            "code": "INTERRUPTED",
            "suggestion": "Operation was cancelled"
        }
        print(json.dumps(error_result))
        sys.exit(130)  # Standard exit code for SIGINT

    except SystemExit:
        # Re-raise SystemExit to preserve exit codes
        raise

    except Exception as e:
        # Catch-all for any other unexpected errors
        error_result = {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "code": "UNEXPECTED_ERROR",
            "error_type": type(e).__name__,
            "timestamp": time.time(),
            "traceback": traceback.format_exc()[:2000]  # Limit traceback size
        }
        print(json.dumps(error_result))
        sys.exit(1)


def main_sync():
    """Synchronous main entry point for backward compatibility"""
    bridge = MLXBridge()
    
    try:
        input_data = sys.stdin.read()
        
        if not input_data.strip():
            raise ValueError("No input data provided")
        
        request = json.loads(input_data)
        
        # Simple synchronous handling for basic actions
        action = request.get('action')
        
        if action == 'health':
            # Synchronous health check
            memory_usage = bridge.memory_monitor.get_memory_usage()
            result = {
                "status": "healthy" if MLX_AVAILABLE else "unhealthy",
                "mlx_available": MLX_AVAILABLE,
                "python_version": sys.version,
                "memory_usage": memory_usage,
                "loaded_models": len(bridge.models)
            }
        elif action == 'generate':
            # Basic synchronous generation
            if not MLX_AVAILABLE:
                raise RuntimeError("MLX not available")
            
            model_path = request.get("model")
            prompt = request.get("prompt", "")
            max_tokens = request.get("max_tokens", 2048)
            temperature = request.get("temperature", 0.7)
            top_p = request.get("top_p", 0.9)
            
            if not model_path:
                raise ValueError("model path is required")
            
            # Load model if needed
            if model_path not in bridge.models:
                model, tokenizer = load(model_path)
                bridge.models[model_path] = model
                bridge.tokenizers[model_path] = tokenizer
            else:
                model = bridge.models[model_path]
                tokenizer = bridge.tokenizers[model_path]
            
            # Generate
            response = generate(
                model,
                tokenizer,
                prompt=prompt,
                temp=temperature,
                top_p=top_p,
                max_tokens=max_tokens
            )
            
            generated_text = response[len(prompt):].strip() if len(response) > len(prompt) else response
            
            result = {
                "text": generated_text,
                "first_token_ms": 500,  # Placeholder
                "model_used": model_path
            }
        else:
            result = {"error": f"Unsupported action in sync mode: {action}"}
        
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    # Try async first, fall back to sync
    try:
        asyncio.run(main())
    except Exception:
        # Fallback to synchronous mode
        main_sync()