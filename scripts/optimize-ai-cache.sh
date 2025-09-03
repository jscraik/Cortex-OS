#!/bin/bash

# AI Models Cache Optimization Script
# Consolidates scattered model caches and optimizes storage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORTEX_ROOT="$(dirname "$SCRIPT_DIR")"
EXTERNAL_SSD="/Volumes/ExternalSSD"

# Target directories for consolidated cache
TARGET_AI_MODELS="$EXTERNAL_SSD/ai-models"
TARGET_HF_CACHE="$EXTERNAL_SSD/ai-cache/huggingface"
TARGET_MLX_CACHE="$TARGET_AI_MODELS/mlx-models"

echo "🚀 AI Models Cache Optimization"
echo "================================"

# Check if ExternalSSD is mounted
if [ ! -d "$EXTERNAL_SSD" ]; then
    echo "❌ ExternalSSD not mounted at $EXTERNAL_SSD"
    exit 1
fi

echo "📋 Current cache locations found:"
echo "  - $EXTERNAL_SSD/ai-cache/huggingface"
echo "  - $EXTERNAL_SSD/huggingface_cache"
echo "  - $EXTERNAL_SSD/models/hf"
echo "  - $EXTERNAL_SSD/ai-tmp (temporary MLX files)"

# Function to safely move models
move_models() {
    local src="$1"
    local dst="$2"
    local model_type="$3"
    
    if [ -d "$src" ] && [ -d "$src"/*/ ] 2>/dev/null; then
        echo "📦 Moving $model_type models from $src to $dst"
        mkdir -p "$dst"
        
        for model_dir in "$src"/models--*; do
            if [ -d "$model_dir" ]; then
                model_name=$(basename "$model_dir")
                if [ ! -d "$dst/$model_name" ]; then
                    echo "  → $model_name"
                    mv "$model_dir" "$dst/"
                else
                    echo "  ⚠️  $model_name already exists in target, skipping"
                fi
            fi
        done
    fi
}

# Create target directories
echo "📁 Creating target directory structure..."
mkdir -p "$TARGET_HF_CACHE/hub"
mkdir -p "$TARGET_MLX_CACHE"
mkdir -p "$TARGET_AI_MODELS/embeddings"
mkdir -p "$TARGET_AI_MODELS/rerankers"

# Consolidate HuggingFace models
echo "🔄 Consolidating HuggingFace caches..."

# Move from secondary cache locations to primary
if [ -d "$EXTERNAL_SSD/huggingface_cache/hub" ]; then
    move_models "$EXTERNAL_SSD/huggingface_cache/hub" "$TARGET_HF_CACHE/hub" "HuggingFace"
fi

if [ -d "$EXTERNAL_SSD/models/hf/huggingface/hub" ]; then
    move_models "$EXTERNAL_SSD/models/hf/huggingface/hub" "$TARGET_HF_CACHE/hub" "HuggingFace"
fi

# Move direct model directories
if [ -d "$EXTERNAL_SSD/huggingface_cache" ]; then
    for model_dir in "$EXTERNAL_SSD/huggingface_cache"/models--*; do
        if [ -d "$model_dir" ]; then
            model_name=$(basename "$model_dir")
            if [ ! -d "$TARGET_HF_CACHE/hub/$model_name" ]; then
                echo "  → Moving $model_name"
                mv "$model_dir" "$TARGET_HF_CACHE/hub/"
            fi
        fi
    done
fi

# Organize MLX models specifically
echo "🔄 Organizing MLX models..."
mkdir -p "$TARGET_MLX_CACHE"

for model_dir in "$TARGET_HF_CACHE/hub"/models--*mlx*; do
    if [ -d "$model_dir" ]; then
        model_name=$(basename "$model_dir")
        echo "  → Creating MLX symlink for $model_name"
        ln -sf "$model_dir" "$TARGET_MLX_CACHE/$model_name" 2>/dev/null || true
    fi
done

# Clean up temporary MLX files (optional)
echo "🧹 Cleaning up temporary MLX files..."
if [ -d "$EXTERNAL_SSD/ai-tmp" ]; then
    echo "  Found $(find "$EXTERNAL_SSD/ai-tmp" -name "mlx-*" | wc -l) temporary MLX files"
    echo "  These can be safely removed (y/N)?"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "$EXTERNAL_SSD/ai-tmp"/mlx-*
        echo "  ✅ Cleaned up temporary files"
    fi
fi

# Set up environment variables script
echo "⚙️  Creating environment setup script..."
cat > "$TARGET_AI_MODELS/setup-env.sh" << 'EOF'
#!/bin/bash
# AI Models Environment Setup

export HF_HOME="/Volumes/ExternalSSD/ai-cache/huggingface"
export HF_HUB_CACHE="/Volumes/ExternalSSD/ai-cache/huggingface/hub"
export TRANSFORMERS_CACHE="/Volumes/ExternalSSD/ai-cache/huggingface"
export OLLAMA_MODELS="/Volumes/ExternalSSD/ai-models/ollama"

# MLX specific
export MLX_CACHE_DIR="/Volumes/ExternalSSD/ai-models/mlx-models"

echo "🔧 AI Models environment configured:"
echo "   HF_HOME: $HF_HOME"
echo "   HF_HUB_CACHE: $HF_HUB_CACHE"
echo "   OLLAMA_MODELS: $OLLAMA_MODELS"
echo "   MLX_CACHE_DIR: $MLX_CACHE_DIR"
EOF

chmod +x "$TARGET_AI_MODELS/setup-env.sh"

# Create model access scripts
echo "📝 Creating model access scripts..."

# llama.cpp server script
cat > "$TARGET_AI_MODELS/start-llama-server.sh" << 'EOF'
#!/bin/bash
# Start llama.cpp server with specified model

MODEL_NAME=${1:-"mistral-7b-v0.1.Q4_K_M.gguf"}
PORT=${2:-8081}
NGLPU=${3:-1}

LLAMA_BIN="/Volumes/ExternalSSD/ai-models/llama.cpp/build/bin/llama-server"
MODELS_DIR="/Volumes/ExternalSSD/ai-models/llama.cpp/models"

if [ ! -f "$LLAMA_BIN" ]; then
    echo "❌ llama-server binary not found at $LLAMA_BIN"
    exit 1
fi

if [ ! -f "$MODELS_DIR/$MODEL_NAME" ]; then
    echo "❌ Model $MODEL_NAME not found in $MODELS_DIR"
    echo "Available models:"
    ls -1 "$MODELS_DIR"/*.gguf 2>/dev/null || echo "  No GGUF models found"
    exit 1
fi

echo "🚀 Starting llama.cpp server..."
echo "   Model: $MODEL_NAME"
echo "   Port: $PORT"
echo "   GPU Layers: $NGLPU"
echo "   URL: http://127.0.0.1:$PORT"

cd "/Volumes/ExternalSSD/ai-models/llama.cpp"
exec "$LLAMA_BIN" -m "$MODELS_DIR/$MODEL_NAME" -ngl "$NGLPU" --port "$PORT"
EOF

chmod +x "$TARGET_AI_MODELS/start-llama-server.sh"

# MLX model launcher script
cat > "$TARGET_AI_MODELS/list-mlx-models.sh" << 'EOF'
#!/bin/bash
# List available MLX models

echo "🤖 Available MLX Models:"
echo "========================"

MLX_CACHE="/Volumes/ExternalSSD/ai-models/mlx-models"
HF_CACHE="/Volumes/ExternalSSD/ai-cache/huggingface/hub"

if [ -d "$MLX_CACHE" ]; then
    for model_link in "$MLX_CACHE"/*; do
        if [ -L "$model_link" ]; then
            model_name=$(basename "$model_link" | sed 's/models--//g' | sed 's/--/\//g')
            echo "  📦 $model_name"
        fi
    done
fi

echo ""
echo "🔍 Direct MLX models in HF cache:"
for model_dir in "$HF_CACHE"/models--*mlx*; do
    if [ -d "$model_dir" ]; then
        model_name=$(basename "$model_dir" | sed 's/models--//g' | sed 's/--/\//g')
        size=$(du -sh "$model_dir" 2>/dev/null | cut -f1)
        echo "  📦 $model_name ($size)"
    fi
done
EOF

chmod +x "$TARGET_AI_MODELS/list-mlx-models.sh"

# Summary
echo ""
echo "✅ Optimization complete!"
echo ""
echo "📊 Summary:"
echo "  🎯 Target structure:"
echo "     AI Models: $TARGET_AI_MODELS"
echo "     HF Cache: $TARGET_HF_CACHE"
echo "     MLX Models: $TARGET_MLX_CACHE"
echo ""
echo "🔧 Created utilities:"
echo "     Environment: $TARGET_AI_MODELS/setup-env.sh"
echo "     llama.cpp: $TARGET_AI_MODELS/start-llama-server.sh"
echo "     MLX listing: $TARGET_AI_MODELS/list-mlx-models.sh"
echo ""
echo "💡 Next steps:"
echo "   1. Source the environment: source $TARGET_AI_MODELS/setup-env.sh"
echo "   2. Update inventory: $CORTEX_ROOT/scripts/scan-ai-models.sh"
echo "   3. Test model loading with created scripts"
