#!/usr/bin/env python3
"""
MLX Inference Server for Cortex-OS
FastAPI server providing MLX model inference endpoints for Apple Silicon

This is the development version that creates mock managers when dependencies are missing.
"""

import logging
import re
from datetime import datetime
from typing import Any, Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Mock implementations for development
class MockMLXModelManager:
    """Mock model manager for development without MLX dependencies"""

    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        self.loaded_models = {}
        self.model_configs = {
            "phi3-mini": {"ram_gb": 2, "use_cases": ["utility", "simple_task"]},
            "qwen3-coder": {"ram_gb": 17, "use_cases": ["code_generation"]},
            "qwen3-instruct": {"ram_gb": 22, "use_cases": ["general_chat"]},
            "mixtral": {"ram_gb": 12, "use_cases": ["fast_response"]},
            "glm-4.5": {"ram_gb": 22, "use_cases": ["document_analysis"]},
            "qwen2.5-vl": {"ram_gb": 3, "use_cases": ["image_analysis"]},
        }

    async def load_model(self, model_name: str) -> bool:
        if model_name in self.model_configs:
            self.loaded_models[model_name] = {
                "loaded_at": datetime.now(),
                "inference_count": 0,
            }
            logger.info(f"Mock loaded model: {model_name}")
            return True
        return False

    async def unload_model(self, model_name: str) -> bool:
        if model_name in self.loaded_models:
            del self.loaded_models[model_name]
            logger.info(f"Mock unloaded model: {model_name}")
            return True
        return False

    async def generate(
        self,
        model: str,
        prompt: str,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> Dict[str, Any]:
        if model not in self.loaded_models:
            raise ValueError(f"Model {model} not loaded")

        return {
            "text": f"[MOCK {model}] Response to: {prompt[:50]}...",
            "tokens": min(max_tokens, 100),
            "inference_time": 0.5,
        }

    def get_available_models(self) -> List[Dict[str, Any]]:
        models = []
        for name, config in self.model_configs.items():
            models.append(
                {
                    "name": name,
                    "ram_gb": config["ram_gb"],
                    "use_cases": config["use_cases"],
                    "loaded": name in self.loaded_models,
                }
            )
        return models

    def get_loaded_models_info(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": name,
                "loaded_at": model["loaded_at"].isoformat(),
                "inference_count": model["inference_count"],
            }
            for name, model in self.loaded_models.items()
        ]


class MockMLXMemoryManager:
    """Mock memory manager for development"""

    def __init__(self):
        self.total_ram_gb = 36
        self.mlx_reserved_gb = 28
        self.model_memory = {}

    def get_available_memory(self) -> int:
        return (self.mlx_reserved_gb * 1024) - sum(self.model_memory.values())

    def can_load_model_size(self, required_mb: int) -> bool:
        return self.get_available_memory() >= required_mb

    def register_model_memory(self, model_name: str, memory_mb: int):
        self.model_memory[model_name] = memory_mb

    def free_model_memory(self, model_name: str, memory_mb: int):
        if model_name in self.model_memory:
            del self.model_memory[model_name]

    def get_memory_status_report(self) -> Dict[str, Any]:
        used_memory = sum(self.model_memory.values())
        return {
            "mlx_reserved_gb": self.mlx_reserved_gb,
            "mlx_used_mb": used_memory,
            "mlx_available_mb": self.get_available_memory(),
            "loaded_models": [
                {"model": name, "memory_mb": memory}
                for name, memory in self.model_memory.items()
            ],
        }


# Try to import real managers, fall back to mocks
try:
    from memory_manager import MLXMemoryManager
    from model_manager import MLXModelManager

    logger.info("✅ Using unified MLX model manager")
    USE_PRODUCTION = True
except ImportError:
    logger.info("⚠️ Unified manager not available - using mocks")
    USE_PRODUCTION = False
    MLXModelManager = MockMLXModelManager
    MLXMemoryManager = MockMLXMemoryManager

# Try to import FastAPI
try:
    import uvicorn
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel, Field, field_validator

    FASTAPI_AVAILABLE = True
    logger.info("FastAPI available")
except ImportError:
    FASTAPI_AVAILABLE = False
    logger.warning("FastAPI not available - server will run in mock mode")

if FASTAPI_AVAILABLE:
    class InferenceRequest(BaseModel):
        model: str
        prompt: str
        max_tokens: int = Field(default=1000, ge=1, le=4096)
        temperature: float = Field(default=0.7, ge=0, le=1)

        @field_validator("prompt")
        @classmethod
        def sanitize_prompt(cls, v: str) -> str:
            if "<script" in v.lower():
                raise ValueError("Potential prompt injection detected")
            return re.sub(r"<[^>]+>", "", v)
else:
    class InferenceRequest:
        def __init__(self, **kwargs):
            # Required fields
            required_fields = ["model", "prompt"]
            for field in required_fields:
                if field not in kwargs:
                    raise ValueError(f"Missing required field: {field}")

            # Validate max_tokens
            max_tokens = kwargs.get("max_tokens", 1000)
            if not isinstance(max_tokens, int) or not (1 <= max_tokens <= 4096):
                raise ValueError("max_tokens must be an integer between 1 and 4096")

            # Validate temperature
            temperature = kwargs.get("temperature", 0.7)
            if not isinstance(temperature, (int, float)) or not (0 <= temperature <= 1):
                raise ValueError("temperature must be a float between 0 and 1")

            # Sanitize prompt
            prompt = kwargs["prompt"]
            if "<script" in prompt.lower():
                raise ValueError("Potential prompt injection detected")
            sanitized_prompt = re.sub(r"<[^>]+>", "", prompt)

            # Set attributes
            self.model = kwargs["model"]
            self.prompt = sanitized_prompt
            self.max_tokens = max_tokens
            self.temperature = temperature
            # Set any other attributes
            for k, v in kwargs.items():
                if k not in ["model", "prompt", "max_tokens", "temperature"]:
                    setattr(self, k, v)

# Initialize managers
memory_manager = MLXMemoryManager()
model_manager = MLXModelManager(memory_manager)


# Server implementation
class MLXServer:
    """MLX Inference Server"""

    def __init__(self):
        self.start_time = datetime.now()

    def create_app(self):
        """Create FastAPI app or return mock server"""
        if not FASTAPI_AVAILABLE:
            return self

        app = FastAPI(
            title="MLX Inference Server",
            description="Local MLX model inference for Cortex-OS",
            version="1.0.0",
        )

        @app.on_event("startup")
        async def startup_event():
            # Auto-load defaults from registry if supported
            if hasattr(model_manager, "ensure_defaults_loaded"):
                try:
                    await model_manager.ensure_defaults_loaded()
                except Exception:
                    logger.warning("Failed to ensure defaults loaded on startup")

        @app.get("/health")
        async def health_check():
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "uptime": str(datetime.now() - self.start_time),
                "memory_available": memory_manager.get_available_memory(),
                "loaded_models": len(model_manager.loaded_models),
            }

        @app.get("/models")
        async def list_models():
            """List all available models"""
            return model_manager.get_available_models()

        @app.get("/status")
        async def get_status():
            """Get server status"""
            return {
                "loaded_models": model_manager.get_loaded_models_info(),
                "memory": memory_manager.get_memory_status_report(),
                "uptime": str(datetime.now() - self.start_time),
            }

        @app.post("/models/{model_name}/load")
        async def load_model(model_name: str):
            """Load a specific model"""
            try:
                success = await model_manager.load_model(model_name)
                if success:
                    return {"message": f"Model {model_name} loaded successfully"}
                else:
                    raise HTTPException(
                        status_code=400, detail=f"Failed to load model {model_name}"
                    )
            except Exception:
                raise HTTPException(status_code=500, detail="Internal server error")

        @app.post("/models/{model_name}/unload")
        async def unload_model(model_name: str):
            """Unload a specific model"""
            try:
                success = await model_manager.unload_model(model_name)
                if success:
                    return {"message": f"Model {model_name} unloaded successfully"}
                else:
                    raise HTTPException(
                        status_code=400, detail=f"Model {model_name} not loaded"
                    )
            except Exception:
                raise HTTPException(status_code=500, detail="Internal server error")

        @app.post("/inference")
        async def inference(req: InferenceRequest):
            """Generate text using a loaded model"""
            try:
                result = await model_manager.generate(
                    model=req.model,
                    prompt=req.prompt,
                    max_tokens=req.max_tokens,
                    temperature=req.temperature,
                )

                return result
            except Exception:
                raise HTTPException(status_code=500, detail="Internal server error")
        return app

    # Mock server methods for when FastAPI is not available
    async def health_check(self):
        return {
            "status": "healthy (mock)",
            "timestamp": datetime.now().isoformat(),
            "message": "FastAPI not available - running in mock mode",
        }

    def run_mock_server(self):
        """Run a simple mock server for development"""
        logger.info("Running MLX server in mock mode")
        logger.info("Available endpoints:")
        logger.info("  - Health: /health")
        logger.info("  - Models: /models")
        logger.info("  - Status: /status")
        logger.info("  - Load: POST /models/{model_name}/load")
        logger.info("  - Inference: POST /inference")

        # Simulate server running
        import time

        try:
            while True:
                time.sleep(10)
                logger.info(
                    f"Mock server running... Memory: {memory_manager.get_available_memory()}MB available"
                )
        except KeyboardInterrupt:
            logger.info("Mock server stopped")


def main():
    """Main entry point"""
    server = MLXServer()

    if FASTAPI_AVAILABLE:
        app = server.create_app()
        logger.info("Starting MLX FastAPI server on port 8001")
        uvicorn.run(app, host="0.0.0.0", port=8001)
    else:
        logger.info("FastAPI not available - starting mock server")
        server.run_mock_server()


if __name__ == "__main__":
    main()
