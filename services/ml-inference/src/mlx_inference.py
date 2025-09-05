"""
MLX-based inference engine for Apple Silicon.

Provides real ML model inference using fallback mechanisms when MLX is not available.
Enhanced with error handling, circuit breakers, and recovery mechanisms.
"""

import asyncio
import logging
import time
from functools import lru_cache
from typing import Any

import mlx.core as mx

# Import our error handling modules
from error_handling import (
    create_circuit_breaker,
    create_error_handler,
    create_health_monitor,
    retry_with_backoff,
)
from mlx_lm import generate, load
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ModelConfig(BaseModel):
    """Configuration for ML model."""

    name: str
    path: str
    max_tokens: int = 512
    temperature: float = 0.7
    batch_size: int = 4
    quantization: str | None = None
    adapter_path: str | None = None


class InferenceRequest(BaseModel):
    """Request for ML inference."""

    prompt: str
    max_tokens: int | None = None
    temperature: float | None = None
    stream: bool = False
    batch_id: str | None = None


class InferenceResponse(BaseModel):
    """Response from ML inference."""

    text: str
    tokens_generated: int
    latency_ms: float
    model_name: str
    batch_id: str | None = None
    cached: bool = False


class ModelManager:
    """Manages ML model loading and lifecycle."""

    def __init__(self, model_config: ModelConfig):
        self.config = model_config
        self.model: Any = None
        self.tokenizer: Any = None
        self.is_loaded = False
        self._load_lock = asyncio.Lock()

    async def load_model(self) -> None:
        """Load the ML model and tokenizer."""
        async with self._load_lock:
            if self.is_loaded:
                return

            try:
                logger.info(f"Loading model: {self.config.name}")
                start_time = time.time()

                # Use Apple Silicon GPU if available
                mx.set_default_device(mx.gpu)

                # Load model and tokenizer
                self.model, self.tokenizer = load(self.config.path)

                load_time = time.time() - start_time
                logger.info(f"Model loaded in {load_time:.2f}s")

                self.is_loaded = True

            except Exception as e:
                logger.error(f"Failed to load model: {e}")
                raise

    async def unload_model(self) -> None:
        """Unload the model to free memory."""
        async with self._load_lock:
            if not self.is_loaded:
                return

            self.model = None
            self.tokenizer = None
            self.is_loaded = False
            mx.eval([])  # MLX cleanup
            logger.info("Model unloaded")

    def get_model_info(self) -> dict[str, Any]:
        """Get information about the loaded model."""
        return {
            "model_info": self.model_manager.get_model_info(),
            "cache_info": self.get_cache_info(),
            "mlx_available": True,  # Always true since MLX is required
        }


class MLXInferenceEngine:
    """Main inference engine using MLX framework with enhanced error handling."""

    def __init__(
        self,
        model_config: ModelConfig,
        enable_caching: bool = True,
    ):
        self.model_config = model_config
        self.model_manager = ModelManager(model_config)
        self.is_initialized = False

        # Error handling and recovery
        self.error_handler = create_error_handler()
        self.circuit_breaker = create_circuit_breaker(
            failure_threshold=5,
            recovery_timeout=60,
            expected_exception=(ConnectionError, TimeoutError, RuntimeError),
        )
        self.health_monitor = create_health_monitor()

        # Register health checks
        self.health_monitor.register_health_check(
            "model_loaded", self._check_model_health
        )
        self.health_monitor.register_health_check(
            "memory_available", self._check_memory_health
        )

        # Caching setup
        self.enable_caching = enable_caching
        if enable_caching:
            self._cached_inference = lru_cache(maxsize=128)(self._raw_inference)
        else:
            self._cached_inference = self._raw_inference

    def _check_model_health(self) -> bool:
        """Health check for model availability."""
        try:
            return self.model_manager.is_loaded and self.model_manager.model is not None
        except Exception:
            return False

    def _check_memory_health(self) -> bool:
        """Health check for memory availability."""
        try:
            import psutil

            memory = psutil.virtual_memory()
            return memory.percent < 90  # Consider healthy if memory usage < 90%
        except ImportError:
            return True  # Assume healthy if psutil not available

    async def initialize(self) -> None:
        """Initialize the inference engine."""
        if self.is_initialized:
            return

        try:
            await self.model_manager.load_model()
            self.is_initialized = True
            logger.info("MLX Inference Engine initialized")

        except Exception as e:
            logger.error(f"Failed to initialize inference engine: {e}")
            raise

    async def shutdown(self) -> None:
        """Shutdown the inference engine."""
        if not self.is_initialized:
            return

        await self.model_manager.unload_model()
        self.is_initialized = False
        logger.info("MLX Inference Engine shutdown")

    @retry_with_backoff(max_attempts=3, exceptions=(ConnectionError, TimeoutError))
    async def generate_text(self, request: InferenceRequest) -> InferenceResponse:
        """Generate text using the loaded model with enhanced error handling."""
        if not self.is_initialized:
            raise RuntimeError("Inference engine not initialized")

        start_time = time.time()

        try:
            # Apply circuit breaker pattern
            return await self._generate_text_with_circuit_breaker(request, start_time)

        except Exception as e:
            # Handle error with recovery strategies
            logger.error(f"Text generation failed: {e}")

            try:
                fallback_response = await self.error_handler.handle_error(
                    e, "inference"
                )
                if isinstance(fallback_response, dict):
                    return InferenceResponse(
                        text=fallback_response.get(
                            "content", "Error occurred during inference"
                        ),
                        tokens_generated=0,
                        latency_ms=(time.time() - start_time) * 1000,
                        model_name=self.model_config.name,
                        batch_id=request.batch_id,
                        cached=False,
                    )
            except Exception:
                pass

            # Final fallback
            return InferenceResponse(
                text="Service temporarily unavailable. Please try again later.",
                tokens_generated=0,
                latency_ms=(time.time() - start_time) * 1000,
                model_name=self.model_config.name,
                batch_id=request.batch_id,
                cached=False,
            )

    async def _generate_text_with_circuit_breaker(
        self, request: InferenceRequest, start_time: float
    ) -> InferenceResponse:
        """Internal method with circuit breaker applied."""
        max_tokens = request.max_tokens or self.model_config.max_tokens
        temperature = request.temperature or self.model_config.temperature

        # Check cache first
        cached_result = None

        if self.enable_caching:
            try:
                cached_result = self._cached_inference(
                    request.prompt, max_tokens, temperature
                )
            except TypeError:
                # Cache miss or unhashable type
                pass

        if cached_result:
            text, tokens_generated = cached_result
            latency_ms = (time.time() - start_time) * 1000

            return InferenceResponse(
                text=text,
                tokens_generated=tokens_generated,
                latency_ms=latency_ms,
                model_name=self.model_config.name,
                batch_id=request.batch_id,
                cached=True,
            )

        # Perform actual inference with circuit breaker
        text, tokens_generated = await self._perform_inference_with_protection(
            request.prompt, max_tokens, temperature
        )

        latency_ms = (time.time() - start_time) * 1000

        return InferenceResponse(
            text=text,
            tokens_generated=tokens_generated,
            latency_ms=latency_ms,
            model_name=self.model_config.name,
            batch_id=request.batch_id,
            cached=False,
        )

    async def _perform_inference_with_protection(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> tuple[str, int]:
        """Perform inference with circuit breaker protection."""
        try:
            # Check health before inference
            health_status = await self.health_monitor.run_health_checks()
            if not health_status.get("model_loaded", False):
                raise RuntimeError("Model health check failed")

            return await self._perform_inference(prompt, max_tokens, temperature)

        except Exception as e:
            logger.error(f"Protected inference failed: {e}")
            raise

    async def _perform_inference(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> tuple[str, int]:
        """Perform the actual model inference."""
        try:
            # Run inference in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, self._run_inference, prompt, max_tokens, temperature
            )
            return result

        except Exception as e:
            logger.error(f"Inference failed: {e}")
            raise

    def _run_inference(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> tuple[str, int]:
        """Run inference in sync context."""
        if not self.model_manager.is_loaded:
            raise RuntimeError("Model not loaded")

        try:
            if not self.model_manager.model or not self.model_manager.tokenizer:
                raise RuntimeError("MLX model or tokenizer not available")

            # Use MLX generate function
            response = generate(
                self.model_manager.model,
                self.model_manager.tokenizer,
                prompt=prompt,
                max_tokens=max_tokens,
                temp=temperature,
                verbose=False,
            )

            # Extract generated text and token count
            generated_text = str(response)
            tokens_generated = len(generated_text.split())  # Approximate token count

            return generated_text, tokens_generated

        except Exception as e:
            logger.error(f"MLX inference generation failed: {e}")
            raise RuntimeError(f"MLX inference failed: {e}") from e

    def _raw_inference(
        self, prompt: str, max_tokens: int, temperature: float
    ) -> tuple[str, int]:
        """Raw inference method for caching."""
        return self._run_inference(prompt, max_tokens, temperature)

    def get_cache_info(self) -> dict[str, Any]:
        """Get cache statistics."""
        if not self.enable_caching:
            return {"enabled": False}

        cache_info = self._cached_inference.cache_info()
        return {
            "enabled": True,
            "hits": cache_info.hits,
            "misses": cache_info.misses,
            "maxsize": cache_info.maxsize,
            "currsize": cache_info.currsize,
            "hit_rate": cache_info.hits / max(1, cache_info.hits + cache_info.misses),
        }

    def clear_cache(self) -> None:
        """Clear the inference cache."""
        if self.enable_caching:
            self._cached_inference.cache_clear()
            logger.info("Inference cache cleared")

    def get_status(self) -> dict[str, Any]:
        """Get engine status."""
        return {
            "initialized": self.is_initialized,
            "model_info": self.model_manager.get_model_info(),
            "cache_info": self.get_cache_info(),
            "mlx_available": True,  # Always true since MLX is required
        }


# Factory function for creating inference engines
def create_mlx_engine(model_name: str, model_path: str) -> MLXInferenceEngine:
    """Create an MLX inference engine with default configuration."""

    config = ModelConfig(
        name=model_name, path=model_path, max_tokens=512, temperature=0.7, batch_size=4
    )

    return MLXInferenceEngine(model_config=config, enable_caching=True)
