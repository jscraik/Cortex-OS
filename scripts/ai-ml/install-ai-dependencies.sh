#!/bin/bash
# Install All MLX, llama.cpp, and Ollama Dependencies for Cortex-OS
# Run this script from the project root

set -e

echo "🚀 Installing Cortex-OS AI Dependencies (MLX, llama.cpp, Ollama)"
echo "================================================================="

# Check if we're on macOS for MLX support
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "✅ macOS detected - MLX acceleration available"
    MLX_AVAILABLE=true
else
    echo "⚠️  Non-macOS detected - MLX acceleration not available"
    MLX_AVAILABLE=false
fi

# Update Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
if command -v uv &> /dev/null; then
    echo "Using uv for Python package management"
    uv sync
    uv pip install --upgrade \
        mlx>=0.30.0 \
        mlx-lm>=0.28.0 \
        mlx-vlm>=0.4.0 \
        llama-cpp-python>=0.2.90 \
        sentence-transformers>=3.3.0 \
        transformers>=4.55.4 \
        torch>=2.8.0 \
        gguf>=0.1.0 \
        sentencepiece>=0.2.0 \
        protobuf>=4.21.0
else
    echo "Using pip for Python package management"
    pip install --upgrade \
        mlx>=0.30.0 \
        mlx-lm>=0.28.0 \
        mlx-vlm>=0.4.0 \
        llama-cpp-python>=0.2.90 \
        sentence-transformers>=3.3.0 \
        transformers>=4.55.4 \
        torch>=2.8.0 \
        gguf>=0.1.0 \
        sentencepiece>=0.2.0 \
        protobuf>=4.21.0
fi

# Update Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
if command -v pnpm &> /dev/null; then
    echo "Using pnpm for Node.js package management"
    pnpm install
else
    echo "Using npm for Node.js package management"
    npm install
fi

# Install/Update Ollama
echo ""
echo "🦙 Installing/Updating Ollama..."
if command -v ollama &> /dev/null; then
    echo "Ollama already installed, checking for updates..."
    # Ollama doesn't have a direct update command, so we'll just check version
    ollama --version
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Installing Ollama on macOS..."
        curl -fsSL https://ollama.ai/install.sh | sh
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Installing Ollama on Linux..."
        curl -fsSL https://ollama.ai/install.sh | sh
    else
        echo "⚠️  Please install Ollama manually from https://ollama.ai"
    fi
fi

# Pull recommended Ollama models
echo ""
echo "📥 Pulling recommended Ollama models..."
if command -v ollama &> /dev/null; then
    echo "Starting Ollama service..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 5  # Wait for Ollama to start

    echo "Pulling models..."
    ollama pull qwen3-coder:30b || echo "⚠️  Failed to pull qwen3-coder:30b"
    ollama pull phi4-mini-reasoning:latest || echo "⚠️  Failed to pull phi4-mini-reasoning:latest"
    ollama pull llama3.2:3b || echo "⚠️  Failed to pull llama3.2:3b"

    # Stop Ollama service
    kill $OLLAMA_PID 2>/dev/null || true
    echo "Ollama service stopped"
else
    echo "⚠️  Ollama not available, skipping model downloads"
fi

# Verify installations
echo ""
echo "🔍 Verifying installations..."
echo "==============================================="

# Check Python packages
echo "Python packages:"
python -c "import mlx.core; print('✅ MLX Core:', mlx.core.__version__)" 2>/dev/null || echo "❌ MLX Core not available"
python -c "import mlx_lm; print('✅ MLX-LM available')" 2>/dev/null || echo "❌ MLX-LM not available"
python -c "import llama_cpp; print('✅ llama-cpp-python available')" 2>/dev/null || echo "❌ llama-cpp-python not available"
python -c "import sentence_transformers; print('✅ sentence-transformers:', sentence_transformers.__version__)" 2>/dev/null || echo "❌ sentence-transformers not available"
python -c "import transformers; print('✅ transformers:', transformers.__version__)" 2>/dev/null || echo "❌ transformers not available"

# Check Ollama
echo ""
echo "Ollama:"
if command -v ollama &> /dev/null; then
    echo "✅ Ollama installed:"
    ollama --version
else
    echo "❌ Ollama not available"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Verify MLX models are available: ./scripts/verify-mlx-models.sh"
echo "2. Start development: pnpm dev"
echo "3. Run tests: pnpm test"
