#!/usr/bin/env python3
"""
Quick test of MLX with a small model
"""

import os
import sys

# Set cache directories
os.environ.setdefault('HF_HOME', '/Volumes/ExternalSSD/huggingface_cache')
os.environ.setdefault('TRANSFORMERS_CACHE', '/Volumes/ExternalSSD/huggingface_cache')

try:
    from mlx_lm import load, generate
    print("✅ mlx-lm imported successfully")
except ImportError as e:
    print(f"❌ Failed to import mlx-lm: {e}")
    sys.exit(1)

def test_small_model():
    """Test with a smaller model for quick validation"""
    print("🚀 Testing with a small model...")
    
    # Try a very small model that downloads quickly
    model_names = [
        "mlx-community/SmolLM-135M-Instruct-4bit",  # Tiny model
        "mlx-community/TinyLlama-1.1B-Chat-v1.0-4bit",  # Small model
    ]
    
    for model_name in model_names:
        try:
            print(f"\n📥 Trying {model_name}...")
            model, tokenizer = load(model_name)
            print(f"✅ {model_name} loaded successfully")
            
            # Test generation
            prompt = "Hello! Write a short greeting:"
            print(f"🎯 Prompt: {prompt}")
            
            response = generate(
                model,
                tokenizer,
                prompt=prompt,
                max_tokens=50,
                temp=0.7
            )
            
            print(f"🤖 Response: {response}")
            print("✅ MLX generation working!")
            return True
            
        except Exception as e:
            print(f"⚠️  {model_name} failed: {e}")
            continue
    
    return False

if __name__ == "__main__":
    print("🧪 Quick MLX Test...")
    
    if test_small_model():
        print("\n🎉 MLX is working correctly!")
        print("💡 You can now use larger models like gpt-oss-20b-MLX-8bit")
    else:
        print("\n❌ MLX test failed")
        print("💡 Check your MLX installation and cache permissions")