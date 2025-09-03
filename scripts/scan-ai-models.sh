#!/bin/bash

# AI Models Inventory Management Script
# Updates the external-ssd-model-inventory.json with current model status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORTEX_ROOT="$(dirname "$SCRIPT_DIR")"
INVENTORY_FILE="$CORTEX_ROOT/data/external-ssd-model-inventory.json"
EXTERNAL_SSD="/Volumes/ExternalSSD"
AI_MODELS="$EXTERNAL_SSD/ai-models"
AI_CACHE="$EXTERNAL_SSD/ai-cache"

echo "🔍 Scanning AI Models and Infrastructure..."

# Check if ExternalSSD is mounted
if [ ! -d "$EXTERNAL_SSD" ]; then
    echo "❌ ExternalSSD not mounted at $EXTERNAL_SSD"
    exit 1
fi

# Function to get directory size
get_dir_size() {
    if [ -d "$1" ]; then
        du -sb "$1" 2>/dev/null | cut -f1 || echo "0"
    else
        echo "0"
    fi
}

# Function to check if path exists
path_exists() {
    if [ -e "$1" ]; then
        echo "available"
    else
        echo "missing"
    fi
}

echo "📋 Generating model inventory..."

# Scan MLX models in HuggingFace cache
echo "🔍 Scanning MLX models..."
MLX_MODELS=""
if [ -d "$AI_CACHE/huggingface/hub" ]; then
    for model_dir in "$AI_CACHE/huggingface/hub"/models--*mlx*; do
        if [ -d "$model_dir" ]; then
            model_name=$(basename "$model_dir" | sed 's/models--//g' | sed 's/--/\//g')
            size=$(get_dir_size "$model_dir")
            echo "  Found MLX model: $model_name"
        fi
    done
fi

# Scan llama.cpp models
echo "🔍 Scanning llama.cpp models..."
if [ -d "$AI_MODELS/llama.cpp/models" ]; then
    for model_file in "$AI_MODELS/llama.cpp/models"/*.gguf; do
        if [ -f "$model_file" ]; then
            model_name=$(basename "$model_file" .gguf)
            size=$(stat -f%z "$model_file" 2>/dev/null || echo "0")
            echo "  Found GGUF model: $model_name ($(numfmt --to=iec $size))"
        fi
    done
fi

# Scan Ollama models
echo "🔍 Scanning Ollama models..."
if command -v ollama >/dev/null 2>&1; then
    ollama list 2>/dev/null | tail -n +2 | while read -r line; do
        if [ -n "$line" ]; then
            model_name=$(echo "$line" | awk '{print $1}')
            echo "  Found Ollama model: $model_name"
        fi
    done
fi

# Check infrastructure status
echo "🔍 Checking infrastructure..."

LLAMA_SERVER_STATUS="missing"
if [ -f "$AI_MODELS/llama.cpp/build/bin/llama-server" ]; then
    LLAMA_SERVER_STATUS="available"
    echo "  ✅ llama-server binary found"
else
    echo "  ❌ llama-server binary missing"
fi

OLLAMA_STATUS="missing"
if command -v ollama >/dev/null 2>&1; then
    OLLAMA_STATUS="available"
    echo "  ✅ Ollama available"
else
    echo "  ❌ Ollama not available"
fi

HF_CACHE_STATUS=$(path_exists "$AI_CACHE/huggingface")
echo "  HuggingFace cache: $HF_CACHE_STATUS"

# Check MLX knife
MLX_KNIFE_STATUS="missing"
if command -v mlx-knife >/dev/null 2>&1; then
    MLX_KNIFE_STATUS="available"
    echo "  ✅ MLX knife available"
else
    echo "  ❌ MLX knife not available"
fi

echo "✅ Inventory scan complete"

# Instructions for manual inventory update
echo ""
echo "📝 To update the inventory file:"
echo "   Edit: $INVENTORY_FILE"
echo ""
echo "🔗 Key paths:"
echo "   AI Models: $AI_MODELS"
echo "   AI Cache: $AI_CACHE"
echo "   HF Hub: $AI_CACHE/huggingface/hub"
echo "   llama.cpp: $AI_MODELS/llama.cpp"
echo "   Ollama: $AI_MODELS/ollama"
echo ""
echo "📊 Current status:"
echo "   llama-server: $LLAMA_SERVER_STATUS"
echo "   Ollama: $OLLAMA_STATUS"
echo "   HF Cache: $HF_CACHE_STATUS"
echo "   MLX knife: $MLX_KNIFE_STATUS"
