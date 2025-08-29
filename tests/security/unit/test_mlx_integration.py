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

# Add the bridge to the path
sys.path.insert(0, str(Path(__file__).parent / "cli" / "bridge"))

from mlx_bridge import MLXBridge


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
