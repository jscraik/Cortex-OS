#!/bin/bash
# Cortex-OS Documentation Index
# Quick navigation tool for documentation directory

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📚 Cortex-OS Documentation Hub"
echo "============================="
echo ""
echo "📁 Main Categories:"
echo "  architecture      - System architecture and design"
echo "  guides           - Getting started and workflow guides"
echo "  reference        - API docs, CLI reference, standards"
echo "  integrations     - MCP, GitHub, Python, cloud services"
echo "  security         - Security policies and implementation"
echo "  project          - Planning, research, and tasks"
echo "  reports          - Status reports and audits"
echo "  community        - Contributing guidelines"
echo "  archive          - Historical documentation"
echo ""
echo "🚀 Quick Navigation:"
echo "  ./docs/index.sh architecture     # View architecture docs"
echo "  ./docs/index.sh guides           # View all guides"
echo "  ./docs/index.sh security         # View security docs"
echo "  ./docs/index.sh integrations     # View integration docs"
echo ""

if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
    echo "📋 Detailed Documentation Structure:"
    echo "=================================="

    for dir in architecture guides reference integrations security project reports community archive; do
        if [ -d "$DOCS_DIR/$dir" ] && [ "$(ls -A $DOCS_DIR/$dir 2>/dev/null)"" ]; then
            echo ""
            echo "📂 $dir/"
            find "$DOCS_DIR/$dir" -name "*.md" | sed 's|.*/||' | sed 's/^/  /'
        fi
    done
fi

if [ "$1" = "--find" ] && [ -n "$2" ]; then
    echo "🔍 Searching for: $2"
    echo "==================="
    find "$DOCS_DIR" -name "*$2*" -type f | grep -v node_modules | sort
fi

if [ -n "$1" ] && [ "$1" != "--list" ] && [ "$1" != "-l" ] && [ "$1" != "--find" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
    if [ -d "$DOCS_DIR/$1" ]; then
        echo ""
        echo "📂 Contents of $1/:"
        echo "==================="
        ls -la "$DOCS_DIR/$1"
        echo ""
        echo "📖 Available files:"
        find "$DOCS_DIR/$1" -name "*.md" | while read file; do
            echo "  → ${file#$DOCS_DIR/}"
        done
    else
        echo "❌ Directory '$1' not found"
        echo ""
        echo "Available directories:"
        ls -1 "$DOCS_DIR" | grep -v "README.md" | grep -v "index.sh" | sed 's/^/  - /'
    fi
fi

if [ -z "$1" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo ""
    echo "Usage: $0 [OPTION] [DIRECTORY]"
    echo ""
    echo "Options:"
    echo "  --list, -l    List all documentation in categories"
    echo "  --find NAME   Find documentation by name pattern"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                         # Show overview"
    echo "  $0 architecture            # Show architecture contents"
    echo "  $0 --list                  # List all documentation"
    echo "  $0 --find security         # Find security-related docs"
fi