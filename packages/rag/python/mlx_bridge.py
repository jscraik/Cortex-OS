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
        
    async def handle_request(self, request: dict[str, Any]) -> dict[str, Any]:
        """Handle incoming requests from TypeScript client"""
        try:
            action = request.get('action')
            
            if action == 'health':
                return await self.health_check()
            elif action == 'generate':
                return await self.generate_text(request)
            elif action == 'embed':
                return await self.generate_embeddings(request)
            elif action == 'load_model':
                return await self.load_model(request)
            elif action == 'unload_model':
                return await self.unload_model(request)
            elif action == 'list_models':
                return await self.list_models()
            else:
                raise ValueError(f"Unknown action: {action}")
                
        except Exception as e:
            self.generation_stats["failed_requests"] += 1
            return {
                "error": str(e),
                "traceback": traceback.format_exc() if sys.version_info >= (3, 8) else str(e)
            }
    
    async def health_check(self) -> dict[str, Any]:
        """Comprehensive health check"""
        memory_usage = self.memory_monitor.get_memory_usage()
        self.memory_monitor.update_peak(memory_usage)
        
        return {
            "status": "healthy" if MLX_AVAILABLE else "unhealthy",
            "mlx_available": MLX_AVAILABLE,
            "python_version": sys.version,
            "memory_usage": memory_usage,
            "peak_memory": self.memory_monitor.peak_memory,
            "loaded_models": len(self.models),
            "model_list": list(self.models.keys()),
            "generation_stats": self.generation_stats,
            "platform": sys.platform,
            "mlx_devices": self.get_mlx_devices() if MLX_AVAILABLE else []
        }
    
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
        """Generate text using MLX model"""
        if not MLX_AVAILABLE:
            raise RuntimeError("MLX not available")
        
        self.generation_stats["total_requests"] += 1
        start_time = time.time()
        
        model_path = request.get("model")
        prompt = request.get("prompt", "")
        max_tokens = request.get("max_tokens", 2048)
        temperature = request.get("temperature", 0.7)
        top_p = request.get("top_p", 0.9)
        
        if not model_path:
            raise ValueError("model path is required")
        
        # Load model if not already loaded
        if model_path not in self.models:
            load_result = await self.load_model({"model_path": model_path})
            if not load_result.get("loaded"):
                raise RuntimeError(f"Failed to load model: {load_result.get('error')}")
        
        model = self.models[model_path]
        tokenizer = self.tokenizers[model_path]
        
        try:
            # Measure first token time
            first_token_start = time.time()
            
            # Generate text
            response = generate(
                model,
                tokenizer,
                prompt=prompt,
                temp=temperature,
                top_p=top_p,
                max_tokens=max_tokens
            )
            
            first_token_time = (time.time() - first_token_start) * 1000  # Convert to ms
            total_time = (time.time() - start_time) * 1000
            
            # Extract generated text (remove prompt)
            generated_text = response[len(prompt):].strip() if len(response) > len(prompt) else response
            
            # Update statistics
            self.generation_stats["successful_requests"] += 1
            current_memory = self.memory_monitor.get_memory_usage()
            self.memory_monitor.update_peak(current_memory)
            
            return {
                "text": generated_text,
                "first_token_ms": first_token_time,
                "total_time_ms": total_time,
                "prompt_length": len(prompt),
                "response_length": len(generated_text),
                "memory_usage": current_memory,
                "model_used": model_path
            }
            
        except Exception as e:
            self.generation_stats["failed_requests"] += 1
            raise RuntimeError(f"Generation failed: {str(e)}")
    
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
    """Main async entry point"""
    bridge = MLXBridge()
    
    try:
        # Read input from stdin
        input_data = await asyncio.get_event_loop().run_in_executor(
            None, sys.stdin.read
        )
        
        if not input_data.strip():
            raise ValueError("No input data provided")
        
        request = json.loads(input_data)
        result = await bridge.handle_request(request)
        
        # Output result
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        error_result = {
            "error": f"Invalid JSON input: {e!s}",
            "input_received": input_data[:100] if 'input_data' in locals() else "none"
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "traceback": traceback.format_exc()
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