#!/usr/bin/env python3
"""
MLX Inference Server for Cortex-OS
FastAPI server providing MLX model inference endpoints for Apple Silicon
"""

import asyncio
import logging
import os
from datetime import datetime
from typing import Any, Dict, List

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

import memory_manager
import model_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()


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


class InferenceResponse(BaseModel):
    response: str
    model: str
    tokens_generated: int
    inference_time: float
    memory_usage: Dict[str, Any]


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
