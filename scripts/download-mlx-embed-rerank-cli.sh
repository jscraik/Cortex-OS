#!/bin/bash

# Download MLX Embedding and Reranker Models using huggingface-cli
# This script downloads the most important MLX-optimized embedding and reranker models

set -e

EXTERNAL_SSD="/Volumes/ExternalSSD"
HF_CACHE="$EXTERNAL_SSD/ai-cache/huggingface"

# Set HuggingFace cache location
export HF_HUB_CACHE="$HF_CACHE"
export HUGGINGFACE_HUB_CACHE="$HF_CACHE"

echo "🤖 Downloading MLX Embedding & Reranker Models"
echo "=============================================="

# Check if ExternalSSD is mounted
if [ ! -d "$EXTERNAL_SSD" ]; then
    echo "❌ ExternalSSD not mounted at $EXTERNAL_SSD"
    exit 1
fi

# Create cache directory if it doesn't exist
mkdir -p "$HF_CACHE"

echo "📦 Cache location: $HF_CACHE"
echo ""

# Function to download model using huggingface-cli
download_model() {
    local model_repo="$1"
    local model_type="$2"

    echo "⬇️  Downloading $model_type model: $model_repo"

    if huggingface-cli download "$model_repo" --cache-dir "$HF_CACHE" --quiet; then
        echo "✅ Downloaded: $model_repo"
    else
        echo "❌ Failed to download: $model_repo"
    fi
    echo ""
}

# Download MLX Embedding Models
echo "🔍 Downloading MLX Embedding Models..."

# Qwen3 Embedding Models (MLX-optimized)
download_model "mlx-community/Qwen3-Embedding-4B-4bit-DWQ" "embedding"
download_model "mlx-community/Qwen3-Embedding-0.6B-4bit-DWQ" "embedding"
download_model "mlx-community/Qwen3-Embedding-8B-4bit-DWQ" "embedding"

# BGE Embedding Models (MLX-optimized)
download_model "mlx-community/bge-small-en-v1.5-bf16" "embedding"
download_model "mlx-community/bge-small-en-v1.5-4bit" "embedding"

echo "🔄 Searching for MLX Reranker Models..."

# Try to download some potential reranker models
potential_rerankers=(
    "mlx-community/bge-reranker-base"
    "mlx-community/bge-reranker-large"
    "mlx-community/bge-reranker-v2-m3"
)

for model in "${potential_rerankers[@]}"; do
    download_model "$model" "reranker"
done

echo ""
echo "📊 Summary of Available Models"
echo "=============================="

# Show what we now have
if [ -d "$HF_CACHE/hub" ]; then
    echo "🔍 MLX Embedding Models:"
    find "$HF_CACHE/hub" -name "models--mlx-community*" -type d | grep -i "embed" | sed 's|.*models--||' | sed 's|--|/|g' | sed 's/^/  📦 /'

    echo ""
    echo "🔄 MLX Reranker Models:"
    find "$HF_CACHE/hub" -name "models--mlx-community*" -type d | grep -i "rerank" | sed 's|.*models--||' | sed 's|--|/|g' | sed 's/^/  📦 /'

    echo ""
    echo "📊 All MLX Embedding/Reranker Models:"
    find "$HF_CACHE/hub" -name "models--*" -type d | grep -E "(embed|rerank)" | sed 's|.*models--||' | sed 's|--|/|g' | sed 's/^/  📦 /'
else
    echo "❌ Cache directory not found"
fi

echo ""
echo "✅ MLX Embedding & Reranker models download complete!"
echo ""
echo "💡 To test embedding models:"
echo "   python3 -c \"from sentence_transformers import SentenceTransformer; model = SentenceTransformer('mlx-community/bge-small-en-v1.5-bf16', cache_folder='$HF_CACHE')\""
