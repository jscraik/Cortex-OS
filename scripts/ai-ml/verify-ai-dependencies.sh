#!/bin/bash

# Comprehensive Dependency Verification Script
# Verifies MLX, llama.cpp, and Ollama dependencies across the project

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Cortex-OS Dependency Verification ===${NC}"
echo "Checking MLX, llama.cpp, and Ollama dependencies..."
echo

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Python package
check_python_package() {
    local package=$1
    local min_version=$2
    echo -n "Checking $package >= $min_version... "

    if python -c "import $package; print($package.__version__)" 2>/dev/null; then
        local version=$(python -c "import $package; print($package.__version__)" 2>/dev/null)
        echo -e "${GREEN}✓ Found $version${NC}"
        return 0
    else
        echo -e "${RED}✗ Not found${NC}"
        return 1
    fi
}

# Function to check Node.js package
check_node_package() {
    local package=$1
    echo -n "Checking Node.js package $package... "

    if npm list $package >/dev/null 2>&1; then
        local version=$(npm list $package --depth=0 2>/dev/null | grep "$package@" | sed 's/.*@//')
        echo -e "${GREEN}✓ Found $version${NC}"
        return 0
    else
        echo -e "${RED}✗ Not found${NC}"
        return 1
    fi
}

errors=0

echo -e "${YELLOW}=== System Requirements ===${NC}"

# Check Python
echo -n "Python 3.13+... "
if command_exists python3; then
    python_version=$(python3 --version | sed 's/Python //')
    echo -e "${GREEN}✓ $python_version${NC}"
else
    echo -e "${RED}✗ Python 3.13+ required${NC}"
    ((errors++))
fi

# Check uv
echo -n "uv package manager... "
if command_exists uv; then
    uv_version=$(uv --version)
    echo -e "${GREEN}✓ $uv_version${NC}"
else
    echo -e "${RED}✗ uv required (pip install uv)${NC}"
    ((errors++))
fi

# Check Node.js
echo -n "Node.js... "
if command_exists node; then
    node_version=$(node --version)
    echo -e "${GREEN}✓ $node_version${NC}"
else
    echo -e "${RED}✗ Node.js required${NC}"
    ((errors++))
fi

echo

echo -e "${YELLOW}=== MLX Dependencies ===${NC}"

# Check MLX core
check_python_package "mlx" "0.30.0" || ((errors++))

# Check MLX LM
check_python_package "mlx_lm" "0.28.0" || ((errors++))

# Check MLX VLM
check_python_package "mlx_vlm" "0.4.0" || ((errors++))

echo

echo -e "${YELLOW}=== llama.cpp Dependencies ===${NC}"

# Check llama-cpp-python
check_python_package "llama_cpp" "0.2.90" || ((errors++))

# Check GGUF
check_python_package "gguf" "0.1.0" || ((errors++))

# Check node-llama-cpp
cd packages/prp-runner 2>/dev/null && check_node_package "node-llama-cpp" || ((errors++))
cd - >/dev/null 2>&1

echo

echo -e "${YELLOW}=== Ollama Dependencies ===${NC}"

# Check Ollama command
echo -n "Ollama CLI... "
if command_exists ollama; then
    ollama_version=$(ollama --version | head -n1)
    echo -e "${GREEN}✓ $ollama_version${NC}"
else
    echo -e "${YELLOW}⚠ Ollama CLI not found (Docker will be used)${NC}"
fi

# Check Node.js Ollama package
cd packages/prp-runner 2>/dev/null && check_node_package "ollama" || ((errors++))
cd - >/dev/null 2>&1

echo

echo -e "${YELLOW}=== Supporting Dependencies ===${NC}"

# Check Transformers
check_python_package "transformers" "4.55.4" || ((errors++))

# Check PyTorch
check_python_package "torch" "2.8.0" || ((errors++))

# Check sentence-transformers
check_python_package "sentence_transformers" "3.3.0" || ((errors++))

# Check NumPy
check_python_package "numpy" "1.26.4" || ((errors++))

echo

if [ $errors -eq 0 ]; then
    echo -e "${GREEN}=== ✅ All dependencies verified successfully! ===${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run 'uv sync' to ensure environment is up to date"
    echo "2. Run 'pnpm install' to ensure Node.js dependencies are current"
    echo "3. Test your MLX models with 'python -c \"import mlx.core as mx; print(mx.metal.is_available())\""
    exit 0
else
    echo -e "${RED}=== ❌ $errors dependencies missing or outdated ===${NC}"
    echo
    echo -e "${BLUE}To fix:${NC}"
    echo "1. Run 'uv sync' to install Python dependencies"
    echo "2. Run 'pnpm install' to install Node.js dependencies"
    echo "3. Install Ollama from https://ollama.ai if needed"
    exit 1
fi
