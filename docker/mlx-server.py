#!/usr/bin/env python3
"""
MLX Inference Server for Cortex-OS
FastAPI server providing MLX model inference endpoints for Apple Silicon
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List

import uvicorn

# Import our custom managers

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import FastAPI with fallback
try:
    from fastapi import BackgroundTasks, FastAPI, HTTPException
    from fastapi.responses import JSONResponse, StreamingResponse
    from pydantic import BaseModel

    FASTAPI_AVAILABLE = True
except ImportError:
    logger.warning("FastAPI not available - creating mock server for development")
    FASTAPI_AVAILABLE = False

# Pydantic models for API
if FASTAPI_AVAILABLE:

    class InferenceRequest(BaseModel):
        model: str
        prompt: str
        max_tokens: int = 1000
        temperature: float = 0.7
        stream: bool = False

    class ModelLoadRequest(BaseModel):
        model_name: str

    class ModelUnloadRequest(BaseModel):
        model_name: str

    class ModelSwitchRequest(BaseModel):
        target_model: str
        strategy: str = "intelligent"  # intelligent, force, optimize_memory
else:
    # Mock classes for development without FastAPI
    class InferenceRequest:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    class ModelLoadRequest:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    class ModelUnloadRequest:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    class ModelSwitchRequest:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)


# Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "memory_available": memory_manager.get_available_memory(),
        "loaded_models": len(model_manager.loaded_models),
    }


@app.get("/models", response_model=List[Dict[str, Any]])
async def list_models():
    """List all available MLX models"""
    return model_manager.get_available_models()


@app.get("/status", response_model=ModelStatus)
async def get_status():
    """Get current model and memory status"""
    return ModelStatus(
        loaded_models=model_manager.get_loaded_models_info(),
        available_memory=memory_manager.get_available_memory(),
        total_memory=memory_manager.total_memory,
        model_recommendations=model_manager.get_model_recommendations(),
    )


@app.post("/infer", response_model=InferenceResponse)
async def generate_text(request: InferenceRequest):
    """Generate text using specified MLX model"""
    start_time = datetime.now()

    try:
        # Ensure the requested model is loaded
        if not model_manager.is_model_loaded(request.model):
            logger.info(f"Loading model: {request.model}")
            await model_manager.load_model(request.model)

        # Generate response
        response = await model_manager.generate(
            model=request.model,
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            stream=request.stream,
        )

        inference_time = (datetime.now() - start_time).total_seconds()

        return InferenceResponse(
            response=response["text"],
            model=request.model,
            tokens_generated=response["tokens"],
            inference_time=inference_time,
            memory_usage=memory_manager.get_memory_stats(),
        )

    except Exception as e:
        logger.error(f"Inference failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


@app.post("/model/switch")
async def switch_model(request: ModelSwitchRequest, background_tasks: BackgroundTasks):
    """Switch to a different model with intelligent memory management"""
    try:
        # Check if we can load the target model
        if not memory_manager.can_load_model(request.target_model):
            # Suggest model swap
            swap_strategy = memory_manager.suggest_model_swap(request.target_model)
            if swap_strategy:
                background_tasks.add_task(
                    model_manager.execute_model_swap, swap_strategy
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot load {request.target_model}: insufficient memory",
                )

        # Load the model
        await model_manager.load_model(request.target_model)

        return {
            "status": "success",
            "model": request.target_model,
            "memory_usage": memory_manager.get_memory_stats(),
        }

    except Exception as e:
        logger.error(f"Model switch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model switch failed: {str(e)}")


@app.post("/model/preload")
async def preload_models(models: List[str]):
    """Preload multiple models for faster switching"""
    try:
        results = []
        for model in models:
            if memory_manager.can_load_model(model):
                await model_manager.load_model(model)
                results.append({"model": model, "status": "loaded"})
            else:
                results.append({"model": model, "status": "skipped_memory"})

        return {"results": results}

    except Exception as e:
        logger.error(f"Model preloading failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Preloading failed: {str(e)}")


@app.delete("/model/{model_name}")
async def unload_model(model_name: str):
    """Unload a specific model to free memory"""
    try:
        success = await model_manager.unload_model(model_name)
        if success:
            return {
                "status": "success",
                "model": model_name,
                "memory_freed": memory_manager.get_memory_stats(),
            }
        else:
            raise HTTPException(
                status_code=404, detail=f"Model {model_name} not loaded"
            )

    except Exception as e:
        logger.error(f"Model unload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unload failed: {str(e)}")


@app.get("/metrics")
async def get_metrics():
    """Get performance metrics for monitoring"""
    return {
        "memory": memory_manager.get_memory_stats(),
        "models": model_manager.get_performance_metrics(),
        "system": {
            "timestamp": datetime.now().isoformat(),
            "uptime": model_manager.get_uptime(),
            "total_inferences": model_manager.total_inferences,
        },
    }


if __name__ == "__main__":
    # Initialize with Phi-3 mini as the always-on utility model
    async def startup():
        logger.info("Starting MLX inference server...")
        logger.info(f"Available memory: {memory_manager.get_available_memory()} MB")

        # Load Phi-3 mini by default (lightweight utility model)
        try:
            await model_manager.load_model("phi3-mini")
            logger.info("Phi-3 mini loaded as default utility model")
        except Exception as e:
            logger.warning(f"Could not load default model: {e}")

    # Run startup
    asyncio.create_task(startup())

    # Start server
    uvicorn.run(
        app, host="0.0.0.0", port=int(os.getenv("MLX_PORT", 8000)), log_level="info"
    )
