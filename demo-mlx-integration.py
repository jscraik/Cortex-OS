#!/usr/bin/env python3
"""
Demo: Complete MLX Integration in Cortex-OS
Shows all available models and capabilities
"""

import os

# Configure cache
os.environ.setdefault("HF_HOME", "/Volumes/ExternalSSD/huggingface_cache")


def show_mlx_models():
    """Display all available MLX models in the system"""

    print("🚀 Cortex-OS MLX Integration Demo")
    print("=" * 50)

    models = {
        "💬 Chat Models": {
            "qwen3-coder-30b-mlx": "30B parameters • Coding expert • 32k context",
            "qwen2.5-vl-3b-mlx": "3B parameters • Vision + Language • 32k context",
            "qwen2.5-0.5b-mlx": "0.5B parameters • Lightweight chat • 32k context",
            "mixtral-8x7b-mlx": "8x7B MoE • Advanced reasoning • 32k context",
            "gemma2-2b-mlx": "2B parameters • Google model • 8k context",
            "glm-4.5-mlx": "12B parameters • Multilingual • 32k context",
            "phi3-mini-mlx": "2B parameters • Microsoft model • 4k context",
            "gpt-oss-20b-mlx": "20B parameters • Open source GPT • 8k context",
        },
        "🔍 Embedding Models": {
            "qwen3-embedding-0.6b-mlx": "0.6B • 1536 dims • Fast inference",
            "qwen3-embedding-4b-mlx": "4B • 1536 dims • High quality",
            "qwen3-embedding-8b-mlx": "8B • 1536 dims • Best quality",
        },
        "📊 Reranking Models": {
            "qwen3-reranker-4b-mlx": "4B • Document reranking • Search optimization",
        },
    }

    for category, model_list in models.items():
        print(f"\n{category}")
        print("-" * 30)
        for name, desc in model_list.items():
            print(f"  {name:<25} │ {desc}")

    print(f"\n🎯 Total Models Available: {sum(len(v) for v in models.values())}")
    print(f"📁 Cache Location: {os.environ.get('HF_HOME')}")

    print("\n⚡ Fallback Chain:")
    print("  1. MLX (ExternalSSD) → 2. Ollama (Local) → 3. Frontier (Cloud)")

    print("\n🔧 Usage Examples:")
    print("  # TypeScript (Model Gateway)")
    print("  const response = await modelRouter.generateChat({")
    print("    messages: [{role: 'user', content: 'Write Python code'}],")
    print("    model: 'qwen3-coder-30b-mlx'")
    print("  });")
    print()
    print("  # Python (Direct MLX)")
    print("  from mlx_lm import load, generate")
    print("  model, tokenizer = load('lmstudio-community/gpt-oss-20b-MLX-8bit')")
    print("  response = generate(model, tokenizer, prompt='Story:', max_tokens=500)")

    print("\n✅ Features:")
    print("  ✓ Timeout protection (30s)")
    print("  ✓ Retry logic (2 attempts)")
    print("  ✓ Memory validation")
    print("  ✓ Performance budgets")
    print("  ✓ Comprehensive test coverage")
    print("  ✓ TDD compliance")

    print("\n🎉 Ready for Production!")


if __name__ == "__main__":
    show_mlx_models()
