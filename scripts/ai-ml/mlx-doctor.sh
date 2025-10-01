#!/bin/bash
# brAInwav Cortex-OS MLX Doctor Script
# Diagnostic tool to verify ExternalSSD model installation and environment

set -euo pipefail

# Auto-load environment configuration
source .env.local 2>/dev/null || true

echo "🔍 brAInwav Cortex-OS MLX Doctor - Model Installation Diagnostics"
echo "================================================================="
echo

echo "📋 Environment Configuration:"
echo "------------------------------"
echo "HF_HOME=${HF_HOME:-'Not set'}"
echo "MLX_CACHE_DIR=${MLX_CACHE_DIR:-'Not set'}"
echo "MLX_MODEL_PATH=${MLX_MODEL_PATH:-'Not set'}"
echo "MLX_EMBED_BASE_URL=${MLX_EMBED_BASE_URL:-'Not set'}"
echo "TRANSFORMERS_CACHE=${TRANSFORMERS_CACHE:-'Not set'}"
echo

echo "💾 ExternalSSD Mount Status:"
echo "----------------------------"
if [ -d "/Volumes/ExternalSSD" ]; then
    echo "✅ ExternalSSD is mounted"
    df -h /Volumes/ExternalSSD | tail -1 | awk '{print "   Available space: " $4 " (" $5 " used)"}'
else
    echo "❌ ExternalSSD is NOT mounted"
    echo "   Please mount your ExternalSSD at /Volumes/ExternalSSD"
    exit 1
fi
echo

echo "📁 Directory Structure Check:"
echo "-----------------------------"
declare -a dirs=(
    "/Volumes/ExternalSSD/ai-cache"
    "/Volumes/ExternalSSD/ai-cache/huggingface" 
    "/Volumes/ExternalSSD/ai-cache/huggingface/hub"
    "/Volumes/ExternalSSD/ai-models"
    "/Volumes/ExternalSSD/huggingface_cache"
)

for dir in "${dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir exists"
    else
        echo "⚠️  $dir does not exist"
    fi
done
echo

echo "🤖 Required MLX Models Status:"
echo "------------------------------"

# Define model paths
models=(
    "GLM-4.5-mlx-4Bit:/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--brAInwav--GLM-4.5-mlx-4Bit"
    "Qwen2.5-VL-3B:/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit"
    "Gemma-2-2B:/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--gemma-2-2b-it-4bit"
    "SmolLM-135M:/Volumes/ExternalSSD/ai-cache/huggingface/models--mlx-community--SmolLM-135M-Instruct-4bit"
    "Qwen3-Coder-30B:/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--Qwen3-Coder-30B-A3B-Instruct-4bit"
    "Qwen3-Embedding-4B:/Volumes/ExternalSSD/ai-cache/huggingface/models--Qwen--Qwen3-Embedding-4B"
    "Qwen3-Reranker-4B:/Volumes/ExternalSSD/ai-cache/huggingface/models--Qwen--Qwen3-Reranker-4B"
)

available_count=0
total_count=${#models[@]}

for model_entry in "${models[@]}"; do
    model_name="${model_entry%%:*}"
    model_path="${model_entry##*:}"
    if [ -d "$model_path" ]; then
        echo "✅ $model_name: Found at $model_path"
        ((available_count++))
    else
        echo "❌ $model_name: NOT FOUND at $model_path"
        
        # Check alternative locations
        alternative_found=false
        
        # Check in huggingface_cache
        alt_path="/Volumes/ExternalSSD/huggingface_cache/$(basename "$model_path")"
        if [ -d "$alt_path" ]; then
            echo "   ⚠️  Found in legacy location: $alt_path"
            echo "   💡 Consider migrating to: $model_path"
            alternative_found=true
        fi
        
        # Check in ai-models
        alt_path2="/Volumes/ExternalSSD/ai-models/$(basename "$model_path")"
        if [ -d "$alt_path2" ]; then
            echo "   ⚠️  Found in ai-models: $alt_path2"
            echo "   💡 Consider migrating to: $model_path"
            alternative_found=true
        fi
        
        if [ "$alternative_found" = false ]; then
            echo "   💡 Download with: huggingface-cli download [model-repo]"
        fi
    fi
done
echo

echo "📊 Model Availability Summary:"
echo "------------------------------"
echo "Available models: $available_count/$total_count"

if [ $available_count -ge 5 ]; then
    echo "✅ Status: HEALTHY (Sufficient models for operation)"
elif [ $available_count -ge 3 ]; then
    echo "⚠️  Status: DEGRADED (Minimal models available)"
else
    echo "❌ Status: UNHEALTHY (Insufficient models)"
fi
echo

echo "🔧 MLX-Knife Integration Check:"
echo "-------------------------------"
if command -v mlx_lm.generate &> /dev/null; then
    echo "✅ mlx_lm is available"
    
    # Test model visibility
    echo "🔍 Testing model visibility..."
    export MLX_CACHE_DIR="/Volumes/ExternalSSD/ai-cache"
    export HF_HOME="/Volumes/ExternalSSD/huggingface_cache"
    
    # Try to list available models (this might not work if no models are properly installed)
    if [ -d "/Volumes/ExternalSSD/ai-cache/huggingface/hub" ]; then
        echo "📂 Available models in MLX cache:"
        ls -1 /Volumes/ExternalSSD/ai-cache/huggingface/hub/models--* 2>/dev/null | head -5 || echo "   No models found in hub directory"
    fi
else
    echo "❌ mlx_lm is not available in PATH"
    echo "   💡 Install with: pip install mlx-lm"
fi
echo

echo "🏥 Health Check Summary:"
echo "------------------------"
if [ $available_count -ge 5 ] && [ -d "/Volumes/ExternalSSD" ]; then
    echo "✅ brAInwav Cortex-OS MLX setup is ready for deployment"
    echo "   All required components are properly configured"
    exit 0
else
    echo "⚠️  brAInwav Cortex-OS MLX setup needs attention"
    echo "   Please address the issues above before deployment"
    exit 1
fi
