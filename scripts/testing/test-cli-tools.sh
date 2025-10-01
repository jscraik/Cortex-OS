#!/bin/bash

# CLI Tools Integration Test Suite
# Tests all integrated CLI tools to ensure they're working properly

set -e  # Exit on any error

echo "🧪 CLI Tools Integration Test Suite"
echo "=================================="
echo ""

# Test 1: Semgrep Security Scan
echo "1️⃣  Testing Semgrep Security Scan..."
if pnpm security:scan --dryrun > /dev/null 2>&1; then
    echo "   ✅ Semgrep security scan: WORKING"
else
    echo "   ❌ Semgrep security scan: FAILED"
fi

# Test 2: Graphite CLI
echo "2️⃣  Testing Graphite CLI..."
if pnpm graphite:stack --help > /dev/null 2>&1; then
    echo "   ✅ Graphite CLI: WORKING"
else
    echo "   ❌ Graphite CLI: FAILED"
fi

# Test 3: Mermaid CLI
echo "3️⃣  Testing Mermaid CLI..."
if pnpm mermaid:validate > /dev/null 2>&1; then
    echo "   ✅ Mermaid CLI: WORKING"
else
    echo "   ❌ Mermaid CLI: FAILED"
fi

# Test 4: ESLint
echo "4️⃣  Testing ESLint..."
if pnpm lint --help > /dev/null 2>&1; then
    echo "   ✅ ESLint: WORKING"
else
    echo "   ❌ ESLint: FAILED"
fi

# Test 5: Package Dependencies
echo "5️⃣  Testing Package Dependencies..."
if pnpm list > /dev/null 2>&1; then
    echo "   ✅ Package dependencies: WORKING"
else
    echo "   ❌ Package dependencies: FAILED"
fi

echo ""
echo "🎉 Test suite completed!"
echo ""
echo "📋 Available CLI Tool Scripts:"
echo "   Security: pnpm security:scan[:all|:llm|:atlas|:ci]"
echo "   Graphite: pnpm graphite:[stack|branch|submit|restack|sync]"
echo "   Mermaid:  pnpm mermaid:[generate|docs|workflow|validate]"
echo "   Linting:  pnpm lint && pnpm format"
echo ""
echo "📚 Documentation: docs/cli-tools-integration.md"
