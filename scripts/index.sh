#!/bin/bash
# Cortex-OS Scripts Index
# Quick navigation tool for scripts directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🏛️  Cortex-OS Scripts Directory"
echo "=============================="
echo ""
echo "📁 Core Categories:"
echo "  core        - Essential development scripts"
echo "  memory      - Memory management and monitoring"
echo "  testing     - Test execution and validation"
echo "  ai-ml       - AI/ML tools and integration"
echo "  deployment  - Build and deployment automation"
echo "  system      - System utilities"
echo "  development - Development workflow tools"
echo "  performance - Performance monitoring"
echo ""
echo "📁 Specialized Directories:"
echo "  security      - Security scanning (30+ scripts)"
echo "  code-quality  - Code quality tools (16+ scripts)"
echo "  mcp           - Model Context Protocol tools"
echo "  mlx           - MLX-specific tools"
echo "  maintenance   - System maintenance"
echo "  github-apps   - GitHub applications"
echo "  compliance    - Licensing and governance"
echo "  templates     - Code templates"
echo "  updates       - Update scripts"
echo "  utils         - General utilities"
echo "  legacy        - Deprecated scripts"
echo ""
echo "🚀 Quick Start:"
echo "  ./scripts/core/dev-setup.sh           - Setup development environment"
echo "  ./scripts/memory/memory-guard.sh      - Memory monitoring"
echo "  ./scripts/testing/test-safe.sh        - Run tests safely"
echo "  ./scripts/security/security-scan.sh   - Security scanning"
echo ""

if [ "$1" = "--list" ]; then
    echo "📋 Detailed Script List:"
    echo "======================="

    for dir in core memory testing ai-ml deployment system development performance legacy; do
        if [ -d "$SCRIPT_DIR/$dir" ] && [ "$(ls -A $SCRIPT_DIR/$dir 2>/dev/null)" ]; then
            echo ""
            echo "📂 $dir/"
            ls -1 "$SCRIPT_DIR/$dir" | sed 's/^/  /'
        fi
    done
fi

if [ "$1" = "--find" ] && [ -n "$2" ]; then
    echo "🔍 Searching for: $2"
    echo "==================="
    find "$SCRIPT_DIR" -name "*$2*" -type f | grep -v node_modules | sort
fi

if [ -z "$1" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo ""
    echo "Usage: $0 [OPTION] [ARG]"
    echo ""
    echo "Options:"
    echo "  --list       List all scripts in categories"
    echo "  --find NAME  Find scripts by name pattern"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list                    # List all scripts"
    echo "  $0 --find memory             # Find memory-related scripts"
    echo "  $0 --find test               # Find test scripts"
fi