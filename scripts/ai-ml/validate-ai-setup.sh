#!/bin/bash

# AI Models Validation Script
# Tests that all models are accessible and infrastructure is working

set -e

EXTERNAL_SSD="/Volumes/ExternalSSD"
AI_MODELS="$EXTERNAL_SSD/ai-models"

echo "🔍 AI Models Validation"
echo "======================="

# Test llama.cpp
echo ""
echo "🦙 Testing llama.cpp..."
LLAMA_SERVER="$AI_MODELS/llama.cpp/build/bin/llama-server"
if [ -f "$LLAMA_SERVER" ]; then
    echo "  ✅ llama-server binary found"
    echo "  📊 Binary info: $(file "$LLAMA_SERVER" | cut -d: -f2-)"

    # Check for GGUF models
    GGUF_COUNT=$(find "$AI_MODELS/llama.cpp/models" -name "*.gguf" 2>/dev/null | wc -l)
    echo "  📦 GGUF models available: $GGUF_COUNT"

    if [ "$GGUF_COUNT" -gt 0 ]; then
        echo "  📋 Available models:"
        find "$AI_MODELS/llama.cpp/models" -name "*.gguf" -exec basename {} \; | sed 's/^/    - /'
    fi
else
    echo "  ❌ llama-server binary not found"
fi

# Test Ollama
echo ""
echo "🦙 Testing Ollama..."
if command -v ollama >/dev/null 2>&1; then
    echo "  ✅ Ollama binary found"
    OLLAMA_VERSION=$(ollama --version 2>/dev/null | head -1)
    echo "  📊 Version: $OLLAMA_VERSION"

    echo "  📦 Installed models:"
    ollama list 2>/dev/null | tail -n +2 | sed 's/^/    /' || echo "    No models found"
else
    echo "  ❌ Ollama not available"
fi

# Test MLX models
echo ""
echo "🧠 Testing MLX models..."
MLX_COUNT=0
HF_CACHE="$EXTERNAL_SSD/ai-cache/huggingface/hub"

if [ -d "$HF_CACHE" ]; then
    MLX_COUNT=$(find "$HF_CACHE" -name "models--*mlx*" -type d 2>/dev/null | wc -l)
    echo "  📦 MLX models in HF cache: $MLX_COUNT"

    if [ "$MLX_COUNT" -gt 0 ]; then
        echo "  📋 Available MLX models:"
        find "$HF_CACHE" -name "models--*mlx*" -type d -exec basename {} \; | sed 's/models--//g' | sed 's/--/\//g' | sed 's/^/    - /'
    fi
fi

# Check for MLX knife
if command -v mlx-knife >/dev/null 2>&1; then
    echo "  ✅ mlx-knife available"
    echo "  📋 MLX knife models:"
    mlx-knife list 2>/dev/null | tail -n +2 | sed 's/^/    /'
else
    echo "  ❌ mlx-knife not available"
fi

# Test HuggingFace cache
echo ""
echo "🤗 Testing HuggingFace cache..."
if [ -d "$EXTERNAL_SSD/ai-cache/huggingface" ]; then
    echo "  ✅ Primary HF cache found"
    HF_MODELS=$(find "$EXTERNAL_SSD/ai-cache/huggingface/hub" -name "models--*" -type d 2>/dev/null | wc -l)
    echo "  📦 Models in primary cache: $HF_MODELS"
else
    echo "  ❌ Primary HF cache not found"
fi

# Check secondary caches
SECONDARY_CACHES=(
    "$EXTERNAL_SSD/huggingface_cache"
    "$EXTERNAL_SSD/models/hf"
)

for cache_dir in "${SECONDARY_CACHES[@]}"; do
    if [ -d "$cache_dir" ]; then
        models_count=$(find "$cache_dir" -name "models--*" -type d 2>/dev/null | wc -l)
        if [ "$models_count" -gt 0 ]; then
            echo "  ⚠️  Secondary cache found: $cache_dir ($models_count models)"
        fi
    fi
done

# Test embedding models
echo ""
echo "🔍 Testing Embedding models..."
EMBEDDING_COUNT=$(find "$EXTERNAL_SSD/ai-cache/huggingface/hub" -name "*embedding*" -o -name "*Embedding*" -type d 2>/dev/null | wc -l)
echo "  📦 Embedding models: $EMBEDDING_COUNT"

if [ "$EMBEDDING_COUNT" -gt 0 ]; then
    echo "  📋 Available embedding models:"
    find "$EXTERNAL_SSD/ai-cache/huggingface/hub" -name "*embedding*" -o -name "*Embedding*" -type d -exec basename {} \; | sed 's/models--//g' | sed 's/--/\//g' | sed 's/^/    - /'
fi

# Summary
echo ""
echo "📊 Validation Summary:"
echo "======================"
total_models=$((GGUF_COUNT + MLX_COUNT + EMBEDDING_COUNT))
echo "  Total models found: $total_models"
echo "  - GGUF (llama.cpp): $GGUF_COUNT"
echo "  - MLX models: $MLX_COUNT"
echo "  - Embedding models: $EMBEDDING_COUNT"

echo ""
if [ -f "$LLAMA_SERVER" ] && [ "$total_models" -gt 0 ]; then
    echo "✅ AI infrastructure looks good!"
    echo ""
    echo "💡 Quick start commands:"
    echo "   Start llama.cpp server: $AI_MODELS/start-llama-server.sh"
    echo "   List MLX models: $AI_MODELS/list-mlx-models.sh"
    echo "   Setup environment: source $AI_MODELS/setup-env.sh"
else
    echo "⚠️  Some issues detected. Run optimization script if needed:"
    echo "   $SCRIPT_DIR/optimize-ai-cache.sh"
fi
