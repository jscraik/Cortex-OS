#!/bin/bash

# Comprehensive CLI Tools Test Suite
# Tests all CLI-using scripts and tools in the Cortex-OS workspace

set -e
cd "$(dirname "$0")/.."

echo "🔍 Comprehensive CLI Tools Test Suite"
echo "======================================"
echo "Testing all CLI-using scripts and tools..."
echo ""

# Test Results Tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_LIST=()

test_cli_tool() {
    local name="$1"
    local command="$2"
    local description="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "Testing: $name"
    echo "  Command: $command"
    echo "  Description: $description"
    
    if timeout 10 bash -c "$command" >/dev/null 2>&1; then
        echo "  ✅ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "  ❌ FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_LIST+=("$name")
    fi
    echo ""
}

# Core System CLIs
echo "=== Core System Tools ==="
test_cli_tool "Node.js" "node --version" "Node.js runtime"
test_cli_tool "PNPM" "pnpm --version" "Package manager"
test_cli_tool "Git" "git --version" "Version control"
test_cli_tool "Bash" "bash --version | head -1" "Shell"

# Rust/Cargo Tools
echo "=== Rust Ecosystem ==="
test_cli_tool "Cargo" "cargo --version" "Rust package manager"
test_cli_tool "Rustc" "rustc --version" "Rust compiler"

# Docker & Container Tools
echo "=== Container Tools ==="
test_cli_tool "Docker" "docker --version" "Container runtime"
test_cli_tool "Docker Compose" "docker compose version" "Container orchestration"
test_cli_tool "Docker Info" "docker info --format '{{.ServerVersion}}'" "Docker daemon availability"

# Development Tools
echo "=== Development Tools ==="
test_cli_tool "TypeScript" "npx tsc --version" "TypeScript compiler"
test_cli_tool "ESLint" "npx eslint --version" "JavaScript/TypeScript linter"
test_cli_tool "Biome" "npx biome --version" "Formatter and linter"
test_cli_tool "Vitest" "npx vitest --version" "Testing framework"
test_cli_tool "Nx" "npx nx --version" "Monorepo tool"

# Security & Analysis Tools
echo "=== Security & Analysis Tools ==="
test_cli_tool "Semgrep" "semgrep --version" "Static analysis security tool"
test_cli_tool "Bandit" "python3 -m bandit --version" "Python security linter"
test_cli_tool "Snyk" "snyk --version" "Security scanning tool"
test_cli_tool "AST-Grep" "ast-grep --version" "AST-based search tool"
test_cli_tool "Ripgrep" "rg --version" "Fast text search"

# Documentation Tools
echo "=== Documentation Tools ==="
test_cli_tool "Markdownlint" "npx markdownlint-cli2 --version" "Markdown linter"
test_cli_tool "MkDocs" "mkdocs --version" "Documentation generator"

# AI/ML Tools
echo "=== AI/ML Tools ==="
test_cli_tool "Python" "python3 --version" "Python runtime"
test_cli_tool "UV" "uv --version" "Python package manager"
test_cli_tool "Ruff" "ruff --version" "Python linter/formatter"

# Test Key Script Files
echo "=== Key Scripts ==="
test_cli_tool "NX Smart Wrapper" "node scripts/nx-smart.mjs --help | head -1" "Nx wrapper with smart execution"
test_cli_tool "Memory Manager" "bash scripts/memory-manager.sh --help | head -1" "Memory management utility"
test_cli_tool "Dev Setup" "bash scripts/dev-setup.sh --minimal --dry-run" "Development environment setup"
test_cli_tool "Memory Monitor" "timeout 5 bash scripts/memory-monitor.sh --dry-run" "Memory monitoring"
test_cli_tool "Agent Toolkit" "node scripts/agent-toolkit.mjs --help | head -1" "Agent development tools"
test_cli_tool "Docker Dev Helper" "timeout 5 bash scripts/docker-dev.sh help | head -1" "brAInwav Docker development manager"

# Test Package.json Scripts (dry-run where possible)
echo "=== Package.json Scripts ==="
test_cli_tool "Build Smart" "timeout 5 pnpm build:smart --dry-run" "Smart build wrapper"
test_cli_tool "Test Smart" "timeout 5 pnpm test:smart --dry-run" "Smart test wrapper"
test_cli_tool "Lint Check" "timeout 5 pnpm format:check | head -1" "Format checking"
test_cli_tool "Structure Validation" "timeout 10 pnpm structure:validate --dry-run" "Project structure validation"
test_cli_tool "Docker Dev Scripts" "grep -q 'dev:docker' package.json && echo 'Docker scripts configured'" "Docker Compose scripts"

# Test Cortex Binary
echo "=== Custom Binaries ==="
test_cli_tool "Cortex Binary" "./bin/cortex --help | head -1" "Main Cortex CLI tool"

# Summary
echo "======================================"
echo "🏁 Test Results Summary"
echo "======================================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ ${#FAILED_LIST[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed Tests:"
    for failed_test in "${FAILED_LIST[@]}"; do
        echo "  - $failed_test"
    done
    echo ""
    echo "🔧 Recommendations:"
    echo "  1. Install missing CLI tools using: pnpm ensure:tools"
    echo "  2. Check system dependencies: scripts/dev-setup.sh"
    echo "  3. Verify PATH configuration in your shell"
    echo "  4. Run individual failing tests for detailed error messages"
    exit 1
else
    echo ""
    echo "🎉 All CLI tools are functioning correctly!"
fi
