#!/usr/bin/env python3
"""
MLX Integration Test Suite
Demonstrates the complete working MLX system
"""

import asyncio
import sys
from pathlib import Path

import pytest

pytest.importorskip("mlx")

import pytest
import pytest_asyncio

# Add the bridge to the path
sys.path.insert(0, str(Path(__file__).parent / "cli" / "bridge"))

from mlx_bridge import MLXBridge


class TestMLXIntegration:
    """Test cases for MLX Bridge integration"""

    @pytest_asyncio.fixture
    async def bridge(self):
        """Create MLX bridge instance for testing"""
        return MLXBridge()

    @pytest.mark.asyncio
    async def test_bridge_initialization(self, bridge):
        """Test MLX bridge initializes properly"""
        assert bridge is not None
        assert bridge.server_url == "http://localhost:8000"
        assert len(bridge.models_config) > 0

    @pytest.mark.asyncio
    async def test_get_model_status(self, bridge):
        """Test getting model status"""
        status = await bridge.get_model_status()

        assert "memory" in status
        assert "models" in status
        assert "current_model" in status
        assert "server_status" in status

        # Check memory status structure
        memory = status["memory"]
        assert "total_gb" in memory
        assert "available_gb" in memory
        assert "used_gb" in memory
        assert "usage_percentage" in memory

        # Check models list
        assert len(status["models"]) > 0

    @pytest.mark.asyncio
    async def test_switch_model_success(self, bridge):
        """Test successfully switching to a valid model"""
        result = await bridge.switch_model("phi3-mini")

        assert result["success"] is True
        assert result["model"] == "phi3-mini"
        assert "memory_mb" in result
        assert "context_length" in result
        assert bridge.current_model == "phi3-mini"

    @pytest.mark.asyncio
    async def test_switch_model_invalid(self, bridge):
        """Test switching to an invalid model fails gracefully"""
        result = await bridge.switch_model("nonexistent-model")

        assert result["success"] is False
        assert "error" in result
        assert "available_models" in result
        assert bridge.current_model is None

    @pytest.mark.asyncio
    async def test_run_inference_no_model(self, bridge):
        """Test inference fails when no model is loaded"""
        result = await bridge.run_inference("test prompt")

        assert result["success"] is False
        assert "error" in result
        assert "No model loaded" in result["error"]

    @pytest.mark.asyncio
    async def test_run_inference_with_model(self, bridge):
        """Test inference works when model is loaded"""
        # First load a model
        await bridge.switch_model("phi3-mini")

        # Then run inference
        result = await bridge.run_inference("What is 2 + 2?")

        assert result["success"] is True
        assert "response" in result
        assert "stats" in result
        assert len(result["response"]) > 0

        # Check stats structure
        stats = result["stats"]
        assert "inference_time_ms" in stats
        assert "tokens_generated" in stats
        assert "tokens_per_second" in stats
        assert "model_used" in stats
        assert stats["model_used"] == "phi3-mini"

    @pytest.mark.asyncio
    async def test_get_available_models(self, bridge):
        """Test getting list of available models"""
        models = await bridge.get_available_models()

        assert isinstance(models, list)
        assert len(models) > 0
        assert "phi3-mini" in models
        assert "gemma-3-270m" in models
        assert "qwen3-coder" in models

    @pytest.mark.asyncio
    async def test_unload_model(self, bridge):
        """Test unloading a model"""
        # First load a model
        await bridge.switch_model("phi3-mini")
        assert bridge.current_model == "phi3-mini"

        # Then unload it
        result = await bridge.unload_model()

        assert result["success"] is True
        assert result["unloaded_model"] == "phi3-mini"
        assert "memory_freed_mb" in result
        assert bridge.current_model is None

    @pytest.mark.asyncio
    async def test_unload_model_none_loaded(self, bridge):
        """Test unloading when no model is loaded"""
        result = await bridge.unload_model()

        assert result["success"] is False
        assert "error" in result
        assert "No model loaded" in result["error"]

    @pytest.mark.asyncio
    async def test_health_check(self, bridge):
        """Test bridge health check"""
        health = await bridge.health_check()

        assert "bridge_status" in health
        assert "server_reachable" in health
        assert "models_available" in health
        assert "current_model" in health
        assert "timestamp" in health

        assert health["bridge_status"] == "healthy"
        assert health["server_reachable"] is True
        assert health["models_available"] > 0


async def demonstrate_mlx_system():
    """Demonstrate the complete MLX system functionality"""

    print("🧠 MLX Integration Demonstration")
    print("=" * 50)

    # Initialize bridge
    print("\n1. Initializing MLX Bridge...")
    bridge = MLXBridge()

    # Check initial status
    print("\n2. Checking initial system status...")
    status = await bridge.get_model_status()
    print(f"📊 Memory: {status['memory']['available_gb']:.1f}GB available")
    print(f"🤖 Models configured: {len(status['models'])}")

    # Load model
    print("\n3. Loading Phi-3-mini model...")
    load_result = await bridge.switch_model("phi3-mini")
    if load_result["success"]:
        print("✅ Model loaded successfully!")
        print(f"   Memory used: {load_result['memory_mb'] / 1024:.1f}GB")
    else:
        print(f"❌ Model loading failed: {load_result['error']}")
        return

    # Test inference
    print("\n4. Testing inference...")
    test_prompts = [
        "What is 2 + 2?",
        "Explain machine learning in one sentence.",
        "Write a Python function to calculate factorial.",
    ]

    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n   Test {i}: {prompt}")

        # Format prompt for Phi-3
        formatted_prompt = f"<|user|>\n{prompt}\n<|assistant|>\n"

        result = await bridge.run_inference(formatted_prompt, max_tokens=100)
        if result["success"]:
            response = result["response"].strip()
            # Clean up response (remove any prompt echoing)
            if "\n" in response:
                response = response.split("\n")[0]

            print(f"   💬 Response: {response}")
            print(f"   ⚡ Speed: {result['stats']['tokens_per_second']:.1f} tok/s")
        else:
            print(f"   ❌ Error: {result['error']}")

    # Final status check
    print("\n5. Final system status...")
    final_status = await bridge.get_model_status()
    loaded_models = [m for m in final_status["models"] if m["loaded"]]

    if loaded_models:
        model = loaded_models[0]
        print(f"✅ Active model: {model['name']}")
        print(f"📊 Memory usage: {model['memory_mb'] / 1024:.1f}GB")
        print(f"🎯 Context length: {model['context_length']} tokens")

    print("\n🎉 MLX Integration Test Complete!")
    print(
        f"📈 System Performance: {final_status['memory']['usage_percentage']:.1f}% memory used"
    )


if __name__ == "__main__":
    try:
        asyncio.run(demonstrate_mlx_system())
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
