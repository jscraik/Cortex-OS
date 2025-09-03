#!/bin/bash

# Download MLX Embedding and Reranker Models
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

# Function to download model
download_model() {
    local model_repo="$1"
    local model_type="$2"
    
    echo "⬇️  Downloading $model_type model: $model_repo"
    
    python3 -c "
from huggingface_hub import snapshot_download
import os

os.environ['HF_HUB_CACHE'] = '$HF_CACHE'
os.environ['HUGGINGFACE_HUB_CACHE'] = '$HF_CACHE'

try:
    snapshot_download(
        repo_id='$model_repo',
        cache_dir='$HF_CACHE',
        local_files_only=False
    )
    print('✅ Downloaded: $model_repo')
except Exception as e:
    print(f'❌ Failed to download $model_repo: {e}')
"
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

echo ""
echo "🔄 Downloading MLX Reranker Models..."

# Search for MLX reranker models and download what's available
echo "ℹ️  Searching for MLX reranker models..."

python3 -c "
from huggingface_hub import HfApi
import os

os.environ['HF_HUB_CACHE'] = '$HF_CACHE'

api = HfApi()

# Search for MLX reranker models
models = api.list_models(
    search='reranker mlx',
    library='mlx',
    limit=10
)

print('Available MLX Reranker Models:')
for model in models:
    print(f'  - {model.id}')
    
# Also search for bge-reranker models
bge_models = api.list_models(
    search='bge-reranker',
    author='mlx-community',
    limit=5
)

print('\\nAvailable BGE Reranker Models:')
for model in bge_models:
    print(f'  - {model.id}')
"

# Download additional useful models if available
echo ""
echo "🎯 Attempting to download additional reranker models..."

# Try some common reranker model names
potential_rerankers=(
    "mlx-community/bge-reranker-base"
    "mlx-community/bge-reranker-large" 
    "mlx-community/bge-reranker-v2-m3"
)

for model in "${potential_rerankers[@]}"; do
    echo "🔍 Checking for: $model"
    python3 -c "
from huggingface_hub import HfApi, snapshot_download
import os

os.environ['HF_HUB_CACHE'] = '$HF_CACHE'

api = HfApi()

try:
    # Check if model exists
    info = api.model_info('$model')
    print('✅ Model exists, downloading...')
    
    snapshot_download(
        repo_id='$model',
        cache_dir='$HF_CACHE',
        local_files_only=False
    )
    print('✅ Downloaded: $model')
except Exception as e:
    print(f'❌ Model not available: $model')
"
done

echo ""
echo "📊 Summary of Downloaded Models"
echo "==============================="

python3 -c "
import os

cache_dir = '$HF_CACHE/hub'
if os.path.exists(cache_dir):
    embedding_count = 0
    reranker_count = 0
    
    for item in os.listdir(cache_dir):
        if 'models--' in item:
            if 'embedding' in item.lower() or 'embed' in item.lower():
                embedding_count += 1
                if 'mlx' in item.lower():
                    print(f'📦 Embedding: {item.replace(\"models--\", \"\").replace(\"--\", \"/\")}')
            elif 'rerank' in item.lower():
                reranker_count += 1
                if 'mlx' in item.lower():
                    print(f'🔄 Reranker: {item.replace(\"models--\", \"\").replace(\"--\", \"/\")}')
    
    print(f'\\n📊 Total embedding models: {embedding_count}')
    print(f'📊 Total reranker models: {reranker_count}')
else:
    print('❌ Cache directory not found')
"

echo ""
echo "✅ MLX Embedding & Reranker models download complete!"
echo ""
echo "💡 To use these models:"
echo "   - Set HF_HUB_CACHE=$HF_CACHE"
echo "   - Load models using mlx-community/* repo IDs"
echo "   - Test with: python -c \"from sentence_transformers import SentenceTransformer; model = SentenceTransformer('mlx-community/bge-small-en-v1.5-bf16')\""
