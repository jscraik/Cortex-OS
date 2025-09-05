#!/bin/bash

# MLX Embedding & Reranker Models Verification Script
# Checks current status and downloads missing models

set -e

EXTERNAL_SSD="/Volumes/ExternalSSD"

echo "🔍 MLX Embedding & Reranker Models Status"
echo "=========================================="

# Check all cache locations
CACHE_LOCATIONS=(
    "$EXTERNAL_SSD/ai-cache/huggingface/hub"
    "$EXTERNAL_SSD/huggingface_cache/hub"
    "$EXTERNAL_SSD/models/hf/hub"
    "$EXTERNAL_SSD/ai-cache/huggingface"
)

echo ""
echo "📦 Available MLX Community Models:"
echo "-----------------------------------"

total_mlx_models=0
embedding_models=0
reranker_models=0

for cache_dir in "${CACHE_LOCATIONS[@]}"; do
    if [ -d "$cache_dir" ]; then
        echo "🔍 Checking: $cache_dir"

        # Find MLX community models
        find "$cache_dir" -name "*models--mlx-community*" -type d 2>/dev/null | while read -r model_path; do
            model_name=$(basename "$model_path" | sed 's|models--||' | sed 's|--|/|g')
            echo "  📦 $model_name"

            # Check if it's an embedding or reranker model
            if echo "$model_name" | grep -iq "embed\|bge"; then
                echo "    → Type: Embedding model"
                ((embedding_models++)) || true
            elif echo "$model_name" | grep -iq "rerank"; then
                echo "    → Type: Reranker model"
                ((reranker_models++)) || true
            else
                echo "    → Type: General model"
            fi

            ((total_mlx_models++)) || true
        done
    fi
done

echo ""
echo "📊 Summary:"
echo "----------"
echo "  Total MLX community models: $total_mlx_models"
echo "  Embedding models: $embedding_models"
echo "  Reranker models: $reranker_models"

echo ""
echo "🎯 Key MLX Models Status:"
echo "------------------------"

# Check for specific important models
important_models=(
    "mlx-community/bge-small-en-v1.5-bf16"
    "mlx-community/bge-small-en-v1.5-4bit"
    "mlx-community/Qwen3-Embedding-4B-4bit-DWQ"
    "mlx-community/Qwen3-Embedding-0.6B-4bit-DWQ"
    "mlx-community/Qwen3-Embedding-8B-4bit-DWQ"
)

for model in "${important_models[@]}"; do
    model_dir=$(echo "$model" | sed 's|/|--|g')
    found=false

    for cache_dir in "${CACHE_LOCATIONS[@]}"; do
        if [ -d "$cache_dir/models--$model_dir" ]; then
            echo "  ✅ $model"
            found=true
            break
        fi
    done

    if [ "$found" = false ]; then
        echo "  ❌ $model (missing)"
    fi
done

echo ""
echo "🔍 Standard Embedding/Reranker Models:"
echo "-------------------------------------"

# Check for standard models
for cache_dir in "${CACHE_LOCATIONS[@]}"; do
    if [ -d "$cache_dir" ]; then
        find "$cache_dir" -name "*models--Qwen*" -type d 2>/dev/null | grep -E "(Embed|Rerank)" | while read -r model_path; do
            model_name=$(basename "$model_path" | sed 's|models--||' | sed 's|--|/|g')
            echo "  📦 $model_name (standard)"
        done
    fi
done

echo ""
echo "💡 Quick Test Commands:"
echo "----------------------"
echo "# Test standard embedding:"
echo "python3 -c \"from sentence_transformers import SentenceTransformer; model = SentenceTransformer('Qwen/Qwen3-Embedding-4B', cache_folder='$EXTERNAL_SSD/ai-cache/huggingface'); print('✅ Standard embedding works')\""
echo ""
echo "# Test MLX embedding (if available):"
echo "python3 -c \"from sentence_transformers import SentenceTransformer; model = SentenceTransformer('mlx-community/bge-small-en-v1.5-bf16', cache_folder='$EXTERNAL_SSD/ai-cache/huggingface'); print('✅ MLX embedding works')\""

echo ""
echo "📋 Download Script:"
echo "------------------"
echo "To download missing MLX models, run:"
echo "  /Users/jamiecraik/.Cortex-OS/scripts/download-mlx-embed-rerank-cli.sh"
