#!/usr/bin/env python3
"""
Test GPT-OSS-20B model with mlx-lm
"""

import os
import sys

# Set cache directories
os.environ.setdefault('HF_HOME', '/Volumes/ExternalSSD/huggingface_cache')
os.environ.setdefault('TRANSFORMERS_CACHE', '/Volumes/ExternalSSD/huggingface_cache')
os.environ.setdefault('MLX_CACHE_DIR', '/Volumes/ExternalSSD/ai-cache')

try:
    from mlx_lm import load, generate
    print("✅ mlx-lm imported successfully")
except ImportError as e:
    print(f"❌ Failed to import mlx-lm: {e}")
    sys.exit(1)

def test_gpt_oss():
    """Test GPT-OSS-20B model"""
    print("🚀 Loading GPT-OSS-20B model...")
    
    model_name = "lmstudio-community/gpt-oss-20b-MLX-8bit"
    
    try:
        # Load model and tokenizer
        print(f"Loading model: {model_name}")
        model, tokenizer = load(model_name)
        print("✅ Model loaded successfully")
        
        # Prepare prompt
        prompt = "Write a story about Einstein"
        messages = [{"role": "user", "content": prompt}]
        
        print(f"🎯 Generating text for prompt: '{prompt}'")
        
        # Apply chat template
        formatted_prompt = tokenizer.apply_chat_template(
            messages, 
            add_generation_prompt=True,
            tokenize=False
        )
        
        print(f"📝 Formatted prompt: {formatted_prompt[:100]}...")
        
        # Generate text
        print("⏳ Generating response...")
        text = generate(
            model, 
            tokenizer, 
            prompt=formatted_prompt, 
            verbose=True,
            max_tokens=500,
            temp=0.7
        )
        
        print("\n" + "="*50)
        print("🎉 GENERATED STORY:")
        print("="*50)
        print(text)
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error with GPT-OSS model: {e}")
        print("💡 This might be expected if the model isn't downloaded yet")
        print("   The model will be downloaded automatically on first use")
        
        # Try with a smaller model from your ExternalSSD
        print("\n🔄 Trying with Qwen2.5-0.5B instead...")
        try_qwen_fallback()

def try_qwen_fallback():
    """Try with a smaller Qwen model from ExternalSSD"""
    try:
        # Check if we have local models
        local_models = [
            "mlx-community/Qwen2.5-0.5B-Instruct-4bit",
            "mlx-community/Phi-3-mini-4k-instruct-4bit",
        ]
        
        for model_name in local_models:
            print(f"\n🧪 Trying {model_name}...")
            try:
                model, tokenizer = load(model_name)
                print(f"✅ {model_name} loaded successfully")
                
                # Simple generation
                prompt = "Write a short story about Einstein:"
                response = generate(
                    model,
                    tokenizer,
                    prompt=prompt,
                    max_tokens=200,
                    temp=0.7,
                    verbose=True
                )
                
                print(f"\n📖 Story from {model_name}:")
                print("-" * 40)
                print(response)
                print("-" * 40)
                return
                
            except Exception as e:
                print(f"⚠️  {model_name} failed: {e}")
                continue
                
        print("❌ No local models available for testing")
        
    except Exception as e:
        print(f"❌ Fallback failed: {e}")

if __name__ == "__main__":
    print("🧪 Testing MLX-LM with GPT-OSS model...")
    print(f"📁 Cache directory: {os.environ.get('HF_HOME')}")
    
    test_gpt_oss()
    
    print("\n✅ Test completed!")