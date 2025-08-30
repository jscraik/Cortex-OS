#!/usr/bin/env python3
"""
Unified MLX Model Manager for Cortex-OS.

Provides model loading/unloading and inference with optional real MLX usage.
Controlled via the ``MODEL_MANAGER_ENV`` environment variable:

* ``dev`` (default): uses lightweight mock models.
* ``prod``: uses real MLX models when the ``mlx_lm`` dependency is available.
"""

from __future__ import annotations

import gc
import logging
import os
from datetime import datetime
from typing import Any

try:
    from mlx_lm import generate as mlx_generate
    from mlx_lm import load as mlx_load  # type: ignore

    MLX_AVAILABLE = True
except Exception:  # pragma: no cover - executed when MLX is missing
    MLX_AVAILABLE = False

ENV = os.getenv("MODEL_MANAGER_ENV", "dev").lower()
USE_REAL_MLX = ENV == "prod" and MLX_AVAILABLE

logger = logging.getLogger(__name__)

_LOAD_LOCK = None
try:
    import asyncio

    _LOAD_LOCK = asyncio.Lock()
except Exception as e:
    logger.warning(f"Failed to initialize asyncio lock: {e}")


class MLXModelManager:
    """Manages MLX models with intelligent loading and memory optimization."""

    def __init__(self, memory_manager: Any) -> None:
        self.memory_manager = memory_manager
        self.loaded_models: dict[str, Any] = {}
        self.model_configs = self._load_model_configs()
        self.performance_metrics: dict[str, dict[str, Any]] = {}
        self.total_inferences = 0
        self.start_time = datetime.now()
        self.models_cache_dir = os.path.expanduser("~/.cache/mlx-models")
        os.makedirs(self.models_cache_dir, exist_ok=True)
        # Deterministic seed for reproducibility
        self.seed = int(os.getenv("CORTEX_SEED", "42"))
        # Best-effort global seeding (note: PYTHONHASHSEED must be set at process start to affect hashing)
        try:
            import random

            random.seed(self.seed)
        except Exception as e:
            logger.debug(f"Failed to set random seed: {e}")
        try:  # optional numpy
            import numpy as np  # type: ignore

            np.random.seed(self.seed)
        except Exception as e:
            logger.debug(f"Failed to set numpy random seed: {e}")
        os.environ.setdefault("PYTHONHASHSEED", str(self.seed))
        # Registry-driven defaults
        self.always_loaded = self._load_registry_always_loaded()

    def snapshot_meta(self, model: str, prompt: str) -> dict[str, Any]:
        import hashlib

        phash = hashlib.sha256((model + "\n" + prompt).encode("utf-8")).hexdigest()
        return {
            "seed": self.seed,
            "model": model,
            "model_id": self.model_configs[model]["id"]
            if model in self.model_configs
            else None,
            "ts": datetime.now().isoformat(),
            "prompt_sha256": phash,
        }

    def _load_model_configs(self) -> dict[str, dict[str, Any]]:
        """Load model configurations from the registry (MLX-only entries)."""
        try:
            import yaml  # type: ignore

            registry_path = os.path.join("configs", "models", "registry.yaml")
            if not os.path.exists(registry_path):
                raise FileNotFoundError(registry_path)
            with open(registry_path, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            cfgs: dict[str, dict[str, Any]] = {}
            for m in data.get("models", []) or []:
                adapters = set(m.get("adapters", []) or [])
                if "mlx" not in adapters:
                    continue
                name = m.get("name")
                mlx_id = m.get("mlx_id")
                if not name or not mlx_id:
                    # Skip incomplete entries
                    continue
                cfgs[name] = {
                    "id": mlx_id,
                    "ram_gb": m.get("ram_gb", 0),
                    "priority": m.get("priority", "medium"),
                    "context_window": m.get("ctx", None),
                    "roles": m.get("roles", []),
                }
            if cfgs:
                return cfgs
        except Exception as e:
            # Fall back to minimal defaults if registry missing or invalid
            logger.debug(f"Failed to load model registry: {e}")
        return {}

    def _load_registry_always_loaded(self) -> set:
        """Load always_loaded list from configs/models/registry.yaml if available."""
        try:
            import yaml  # type: ignore

            registry_path = os.path.join("configs", "models", "registry.yaml")
            if not os.path.exists(registry_path):
                return set()
            with open(registry_path, encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
            defaults = data.get("defaults", {}) or {}
            al = defaults.get("always_loaded", []) or []
            return set(al)
        except Exception:
            return set()

    async def load_model(self, model_name: str) -> bool:
        """Load a specific MLX model."""
        if model_name in self.loaded_models:
            logger.info("Model %s already loaded", model_name)
            return True

        if model_name not in self.model_configs:
            raise ValueError(f"Unknown model: {model_name}")

        config = self.model_configs[model_name]
        ram_needed_mb = config["ram_gb"] * 1024

        if not self.memory_manager.can_load_model_size(ram_needed_mb):
            logger.warning("Insufficient memory to load %s", model_name)
            return False

        try:
            load_start = datetime.now()
            if USE_REAL_MLX:
                # serialize loads; mlx weights init is blocking
                if _LOAD_LOCK:
                    async with _LOAD_LOCK:
                        model, tokenizer = await asyncio.to_thread(
                            mlx_load, config["id"]
                        )  # type: ignore
                else:
                    model, tokenizer = mlx_load(config["id"])  # type: ignore
                model_info = {
                    "name": model_name,
                    "config": config,
                    "model": model,
                    "tokenizer": tokenizer,
                    "loaded_at": datetime.now(),
                    "inference_count": 0,
                    "total_tokens": 0,
                    "mlx_real": True,
                }
            else:
                model_info = {
                    "name": model_name,
                    "config": config,
                    "loaded_at": datetime.now(),
                    "inference_count": 0,
                    "total_tokens": 0,
                    "mlx_real": False,
                }

            self.loaded_models[model_name] = model_info
            self.memory_manager.register_model_memory(model_name, ram_needed_mb)

            load_time = (datetime.now() - load_start).total_seconds()
            self.performance_metrics[model_name] = {
                "load_time": load_time,
                "inference_times": [],
                "token_rates": [],
                "memory_usage": ram_needed_mb,
            }
            logger.info("Successfully loaded %s in %.2fs", model_name, load_time)
            return True
        except (ImportError, RuntimeError, OSError) as exc:  # pragma: no cover
            logger.error("Failed to load %s: %s", model_name, exc)
            return False

    async def unload_model(self, model_name: str) -> bool:
        """Unload a specific model to free memory."""
        if model_name not in self.loaded_models:
            return False

        if model_name in self.always_loaded:
            logger.warning(
                "Cannot unload %s: marked always_loaded in registry", model_name
            )
            return False

        try:
            ram_freed = self.model_configs[model_name]["ram_gb"] * 1024
            if self.loaded_models[model_name].get("mlx_real"):
                gc.collect()

            del self.loaded_models[model_name]
            self.memory_manager.free_model_memory(model_name, ram_freed)
            logger.info("Unloaded %s, freed %d MB", model_name, ram_freed)
            return True
        except (KeyError, TypeError, ValueError) as exc:
            logger.error("Failed to unload %s: %s", model_name, exc)
            return False
        except Exception as exc:  # pragma: no cover
            logger.error("Unexpected error unloading %s: %s", model_name, exc)
            return False

    async def generate(
        self,
        model: str,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> dict[str, Any]:
        """Generate text using the specified model."""
        if model not in self.loaded_models:
            raise ValueError(f"Model {model} not loaded")

        start_time = datetime.now()
        model_info = self.loaded_models[model]

        try:
            if model_info.get("mlx_real") and MLX_AVAILABLE:
                # Wrap generate to support both streaming and non-stream modes
                def _run_generate_stream() -> str:
                    out_parts: list[str] = []
                    for part in mlx_generate(  # type: ignore
                        model_info["model"],
                        model_info["tokenizer"],
                        prompt=prompt,
                        stream=True,
                    ):
                        out_parts.append(str(part))
                    return "".join(out_parts)

                def _run_generate_once() -> str:
                    # Try to pass seed for determinism; fall back if unsupported
                    try:
                        return str(
                            mlx_generate(  # type: ignore
                                model_info["model"],
                                model_info["tokenizer"],
                                prompt=prompt,
                                seed=self.seed,  # type: ignore[arg-type]
                            )
                        )
                    except TypeError:
                        return str(
                            mlx_generate(  # type: ignore
                                model_info["model"],
                                model_info["tokenizer"],
                                prompt=prompt,
                            )
                        )

                if stream:
                    response_text = await asyncio.to_thread(_run_generate_stream)  # type: ignore
                else:
                    response_text = await asyncio.to_thread(_run_generate_once)  # type: ignore
                tokens_generated = len(str(response_text).split())
            else:
                response_text = f"[{model}] Mock response to: {prompt[:50]}..."
                tokens_generated = min(max_tokens, len(response_text.split()) * 2)

            inference_time = (datetime.now() - start_time).total_seconds()
            model_info["inference_count"] += 1
            model_info["total_tokens"] += tokens_generated
            self.total_inferences += 1

            if model in self.performance_metrics:
                self.performance_metrics[model]["inference_times"].append(
                    inference_time
                )
                if inference_time > 0:
                    self.performance_metrics[model]["token_rates"].append(
                        tokens_generated / inference_time
                    )

            return {
                "text": response_text,
                "tokens": tokens_generated,
                "inference_time": inference_time,
                "model": model,
                "mlx_real": model_info.get("mlx_real", False),
                "meta": self.snapshot_meta(model, prompt),
            }
        except (MemoryError, RuntimeError) as exc:
            logger.error("Generation error for %s: %s", model, exc)
            raise
        except Exception as exc:  # pragma: no cover
            logger.error("Unexpected generation error for %s: %s", model, exc)
            raise

    async def execute_model_swap(self, swap_strategy: dict[str, Any]) -> None:
        """Execute a model swap strategy."""
        for model_to_unload in swap_strategy.get("unload", []):
            await self.unload_model(model_to_unload)

        target_model = swap_strategy["target"]
        await self.load_model(target_model)
        logger.info("Model swap completed: loaded %s", target_model)

    def route_task_to_model(self, task_type: str) -> str:
        """Route a task to the most appropriate loaded model."""
        # Favor always_loaded if present, else any loaded model
        for m in self.always_loaded:
            if m in self.loaded_models:
                return m
        if self.loaded_models:
            # Return the first loaded model deterministically (sorted)
            return sorted(self.loaded_models.keys())[0]
        if self.loaded_models:
            return next(iter(self.loaded_models.keys()))
        # No models loaded; choose the highest priority MLX model from registry
        if self.model_configs:
            return sorted(
                self.model_configs.items(),
                key=lambda kv: (kv[1].get("priority", "medium") != "critical", kv[0]),
            )[0][0]
        # As a last resort, return a known MLX model id name if available in registry
        return ""

    async def ensure_defaults_loaded(self) -> None:
        """Ensure models in defaults.always_loaded are loaded."""
        for m in sorted(self.always_loaded):
            if m in self.model_configs:
                try:
                    await self.load_model(m)
                except Exception:
                    logger.warning("Failed to auto-load default model: %s", m)

    def is_model_loaded(self, model_name: str) -> bool:
        """Check if a model is currently loaded."""
        return model_name in self.loaded_models

    def get_available_models(self) -> list[dict[str, Any]]:
        """Get list of all available models with their specs."""
        models: list[dict[str, Any]] = []
        for name, config in self.model_configs.items():
            models.append(
                {
                    "name": name,
                    "id": config["id"],
                    "ram_gb": config["ram_gb"],
                    "use_cases": config.get("use_cases", []),
                    "loaded": name in self.loaded_models,
                }
            )
        return models

    def get_loaded_models_info(self) -> list[dict[str, Any]]:
        """Get info about currently loaded models."""
        return [
            {
                "name": name,
                "loaded_at": model["loaded_at"].isoformat(),
                "inference_count": model["inference_count"],
                "total_tokens": model["total_tokens"],
            }
            for name, model in self.loaded_models.items()
        ]

    def get_performance_metrics(self) -> dict[str, Any]:
        """Get performance metrics for loaded models."""
        return self.performance_metrics

    def get_model_recommendations(self) -> list[str]:
        """Recommend models based on priority and current load."""
        loaded = set(self.loaded_models.keys())
        return [
            name
            for name, cfg in sorted(
                self.model_configs.items(), key=lambda x: x[1]["priority"], reverse=True
            )
            if name not in loaded
        ]

    def get_uptime(self) -> float:
        """Return uptime in seconds."""
        return (datetime.now() - self.start_time).total_seconds()
