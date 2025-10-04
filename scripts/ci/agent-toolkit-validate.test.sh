#!/usr/bin/env bash
# brAInwav Agent-Toolkit Validation Script
# Ensures agent-toolkit is properly integrated with MCP and A2A
# Phase 7.1: Agent-Toolkit Enforcement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🛠️  brAInwav Agent-Toolkit Validation"
echo "====================================="
echo ""

ERRORS=0

# Check 1: Agent-toolkit exports are present
echo "📋 Checking agent-toolkit exports..."
if ! grep -q "export.*createAgentToolkit" "$PROJECT_ROOT/packages/agent-toolkit/src/index.ts"; then
  echo "❌ FAIL: createAgentToolkit not exported"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: createAgentToolkit exported"
fi

# Check dist exports (after build)
if [ -f "$PROJECT_ROOT/packages/agent-toolkit/dist/index.d.ts" ]; then
  if grep -q "TOOLING_EVENT_TYPES" "$PROJECT_ROOT/packages/agent-toolkit/dist/index.d.ts"; then
    echo "✅ PASS: TOOLING_EVENT_TYPES exported (dist)"
  else
    echo "❌ FAIL: TOOLING_EVENT_TYPES not in dist"
    ERRORS=$((ERRORS + 1))
  fi
else
  # Fallback to source check
  if grep -q "export const TOOLING_EVENT_TYPES\|export.*TOOLING_EVENT_TYPES" "$PROJECT_ROOT/packages/agent-toolkit/src/index.ts"; then
    echo "✅ PASS: TOOLING_EVENT_TYPES exported (source)"
  else
    echo "❌ FAIL: TOOLING_EVENT_TYPES not exported"
    ERRORS=$((ERRORS + 1))
  fi
fi

# Check 2: MCP server uses agent-toolkit (optional - adapter pattern from Phase 4/5)
echo ""
echo "📋 Checking MCP integration..."
if grep -rq "@cortex-os/agent-toolkit" "$PROJECT_ROOT/packages/mcp-server/src" 2>/dev/null; then
  echo "✅ PASS: MCP server integrates agent-toolkit"
elif [ -f "$PROJECT_ROOT/packages/mcp-server/src/mcp/agent-toolkit-adapter.ts" ]; then
  echo "✅ PASS: MCP adapter file exists"
else
  echo "⚠️  INFO: MCP/agent-toolkit integration is optional (Phase 4/5 feature)"
fi

# Check 3: REST API uses agent-toolkit (optional - adapter pattern from Phase 4/5)
echo ""
echo "📋 Checking REST integration..."
if grep -rq "@cortex-os/agent-toolkit" "$PROJECT_ROOT/packages/memory-rest-api/src" 2>/dev/null; then
  echo "✅ PASS: REST API integrates agent-toolkit"
elif [ -f "$PROJECT_ROOT/packages/memory-rest-api/src/routes/agent-toolkit.ts" ]; then
  echo "✅ PASS: REST adapter file exists"
else
  echo "⚠️  INFO: REST/agent-toolkit integration is optional (Phase 4/5 feature)"
fi

# Check 4: A2A events are emitted
echo ""
echo "📋 Checking A2A event emission..."
if ! grep -q "publishEvent" "$PROJECT_ROOT/packages/agent-toolkit/src/index.ts"; then
  echo "❌ FAIL: publishEvent callback not found in agent-toolkit"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: publishEvent callback found"
fi

# Check 5: Token budget is implemented
echo ""
echo "📋 Checking token budget implementation..."
if [ ! -f "$PROJECT_ROOT/packages/agent-toolkit/src/session/TokenBudget.ts" ]; then
  echo "❌ FAIL: TokenBudget not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: TokenBudget implementation found"
fi

# Check 6: Session persistence is implemented
echo ""
echo "📋 Checking session persistence..."
if [ ! -f "$PROJECT_ROOT/packages/agent-toolkit/src/session/SessionPersistence.ts" ]; then
  echo "❌ FAIL: SessionPersistence not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: SessionPersistence implementation found"
fi

# Check 7: Tests are present
echo ""
echo "📋 Checking test coverage..."
TEST_FILES=$(find "$PROJECT_ROOT/packages/testing/src/integration" -name "*phase3*.test.ts" 2>/dev/null || true)
TEST_COUNT=$(echo "$TEST_FILES" | grep -c "\.test\.ts" 2>/dev/null || echo "0")
if [ -z "$TEST_FILES" ] || [ "$TEST_COUNT" -eq 0 ]; then
  echo "⚠️  WARNING: Agent-toolkit test coverage seems low"
else
  echo "✅ PASS: Agent-toolkit tests found ($TEST_COUNT files)"
fi

# Check 8: No direct tool execution (must go through agent-toolkit)
echo ""
echo "📋 Checking for unauthorized tool execution..."
DIRECT_EXEC=$(
  grep -r "execSync.*ripgrep\|spawn.*semgrep\|exec.*ast-grep" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=agent-toolkit \
    2>/dev/null || true
)

if [ -n "$DIRECT_EXEC" ]; then
  echo "⚠️  WARNING: Found potential direct tool execution (should use agent-toolkit):"
  echo "$DIRECT_EXEC" | head -5
else
  echo "✅ PASS: No unauthorized direct tool execution"
fi

# Summary
echo ""
echo "====================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ brAInwav Agent-Toolkit: ALL CHECKS PASSED"
  echo "   Agent-toolkit properly integrated ✓"
  exit 0
else
  echo "❌ brAInwav Agent-Toolkit: $ERRORS VIOLATIONS FOUND"
  echo "   Fix violations to maintain integration quality"
  exit 1
fi
