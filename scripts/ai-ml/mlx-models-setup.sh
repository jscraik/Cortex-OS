#!/bin/bash
# brAInwav Cortex-OS MLX Models Setup and Migration Script
# Ensures all 7 required models are available in correct ExternalSSD locations

set -euo pipefail

# Auto-load environment configuration
source .env.local 2>/dev/null || true

echo "🔧 brAInwav Cortex-OS MLX Models Setup"
echo "======================================"
echo

# Check if ExternalSSD is mounted
if [ ! -d "/Volumes/ExternalSSD" ]; then
    echo "❌ ExternalSSD is not mounted. Please mount it first."
    exit 1
fi

# Ensure required directories exist
echo "📁 Creating required directories..."
mkdir -p "/Volumes/ExternalSSD/ai-cache/huggingface/hub"
mkdir -p "/Volumes/ExternalSSD/ai-cache/huggingface/models"
mkdir -p "/Volumes/ExternalSSD/ai-models"
echo "✅ Directories created"
echo

# Define the 7 required models with their HuggingFace repo names
declare -a required_models=(
    "brAInwav/GLM-4.5-mlx-4Bit:GLM-4.5-mlx-4Bit:hub"
    "mlx-community/Qwen2.5-VL-3B-Instruct-6bit:Qwen2.5-VL-3B:hub"
    "mlx-community/gemma-2-2b-it-4bit:Gemma-2-2B:hub"
    "mlx-community/SmolLM-135M-Instruct-4bit:SmolLM-135M:direct"
    "mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit:Qwen3-Coder-30B:hub"
    "Qwen/Qwen3-Embedding-4B:Qwen3-Embedding-4B:direct"
    "Qwen/Qwen3-Reranker-4B:Qwen3-Reranker-4B:direct"
)

echo "🤖 Checking and setting up required models..."
echo "---------------------------------------------"

available_count=0
download_needed=()

for model_entry in "${required_models[@]}"; do
    IFS=':' read -r repo_name display_name location_type <<< "$model_entry"
    
    # Determine target path based on location type
    if [ "$location_type" = "hub" ]; then
        target_path="/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--${repo_name//\//--}"
    else
        target_path="/Volumes/ExternalSSD/ai-cache/huggingface/models--${repo_name//\//--}"
    fi
    
    echo "🔍 Checking $display_name..."
    
    if [ -d "$target_path" ]; then
        echo "  ✅ $display_name: Found at $target_path"
        ((available_count++))
    else
        echo "  ❌ $display_name: NOT FOUND at $target_path"
        
        # Check if it exists in legacy location
        legacy_path="/Volumes/ExternalSSD/huggingface_cache/models--${repo_name//\//--}"
        if [ -d "$legacy_path" ]; then
            echo "  📦 Found in legacy location: $legacy_path"
            echo "  🔄 Migrating to correct location..."
            
            # Create parent directory if needed
            mkdir -p "$(dirname "$target_path")"
            
            # Move the model
            if mv "$legacy_path" "$target_path"; then
                echo "  ✅ Successfully migrated $display_name"
                ((available_count++))
            else
                echo "  ❌ Failed to migrate $display_name"
                download_needed+=("$model_entry")
            fi
        else
            echo "  📥 Model needs to be downloaded"
            download_needed+=("$model_entry")
        fi
    fi
done

echo
echo "📊 Model Status Summary:"
echo "Available models: $available_count/7"

if [ ${#download_needed[@]} -gt 0 ]; then
    echo
    echo "🚀 Models that need to be downloaded:"
    echo "------------------------------------"
    
    for model_entry in "${download_needed[@]}"; do
        IFS=':' read -r repo_name display_name location_type <<< "$model_entry"
        echo "  📥 $display_name ($repo_name)"
    done
    echo
    
    # Check if huggingface-cli is available
    if command -v huggingface-cli &> /dev/null; then
        echo "💡 HuggingFace CLI is available. You can download missing models with:"
        echo
        
        # Set environment for downloads
        export HF_HOME="/Volumes/ExternalSSD/ai-cache"
        export TRANSFORMERS_CACHE="/Volumes/ExternalSSD/ai-cache/huggingface/transformers"
        
        for model_entry in "${download_needed[@]}"; do
            IFS=':' read -r repo_name display_name location_type <<< "$model_entry"
            echo "   huggingface-cli download \"$repo_name\" --local-dir-use-symlinks False"
        done
        echo
        
        read -p "🤔 Would you like to download the missing models now? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🚀 Starting downloads..."
            
            for model_entry in "${download_needed[@]}"; do
                IFS=':' read -r repo_name display_name location_type <<< "$model_entry"
                echo "📥 Downloading $display_name..."
                
                if huggingface-cli download "$repo_name" --local-dir-use-symlinks False; then
                    echo "✅ Successfully downloaded $display_name"
                else
                    echo "❌ Failed to download $display_name"
                fi
            done
            
            echo "🔍 Re-running model check..."
            exec "$0"
        else
            echo "⏭️  Skipping downloads. Run this script again when ready."
        fi
    else
        echo "❌ HuggingFace CLI not found. Install with:"
        echo "   pip install huggingface_hub[cli]"
        echo
        echo "💡 Or download models manually to the correct locations shown above."
    fi
else
    echo "🎉 All required models are available!"
fi

echo
echo "🏥 Final Health Status:"
echo "----------------------"
if [ $available_count -ge 5 ]; then
    echo "✅ brAInwav Cortex-OS MLX setup is ready for deployment"
    echo "   Status: HEALTHY ($available_count/7 models available)"
    exit 0
elif [ $available_count -ge 3 ]; then
    echo "⚠️  brAInwav Cortex-OS MLX setup has minimal functionality"
    echo "   Status: DEGRADED ($available_count/7 models available)"
    exit 1
else
    echo "❌ brAInwav Cortex-OS MLX setup is not functional"
    echo "   Status: UNHEALTHY ($available_count/7 models available)"
    exit 2
fi
