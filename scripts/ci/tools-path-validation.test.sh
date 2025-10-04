#!/usr/bin/env bash
# brAInwav Tools Path Resolution Validation Script
# Ensures tools are resolved from correct directories
# Phase 7.1: Tools Path Enforcement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 brAInwav Tools Path Resolution Validation"
echo "============================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Tools directory structure exists
echo "📋 Checking tools directory structure..."
TOOLS_DIR="$PROJECT_ROOT/packages/agent-toolkit/tools"
if [ ! -d "$TOOLS_DIR" ]; then
  echo "❌ FAIL: Tools directory not found at $TOOLS_DIR"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: Tools directory exists"
  
  # Check for expected tool scripts
  EXPECTED_TOOLS=("ripgrep" "semgrep" "ast-grep" "comby" "eslint" "ruff" "cargo")
  for tool in "${EXPECTED_TOOLS[@]}"; do
    if [ ! -f "$TOOLS_DIR/$tool" ] && [ ! -f "$TOOLS_DIR/${tool}.sh" ]; then
      echo "⚠️  WARNING: Tool script not found: $tool"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  ✓ $tool found"
    fi
  done
fi

# Check 2: Tools path resolution in agent-toolkit
echo ""
echo "📋 Checking tools path resolution logic..."
if ! grep -q "AGENT_TOOLKIT_TOOLS_DIR\|CORTEX_HOME.*tools\|\.Cortex-OS/tools" \
  "$PROJECT_ROOT/packages/agent-toolkit/src/infra"/*.ts 2>/dev/null; then
  echo "❌ FAIL: Tools path resolution not implemented"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: Tools path resolution logic found"
fi

# Check 3: Environment variable support
echo ""
echo "📋 Checking environment variable support..."
ENV_SUPPORT=$(
  grep -r "process\.env\.AGENT_TOOLKIT_TOOLS_DIR\|process\.env\.CORTEX_HOME" \
    "$PROJECT_ROOT/packages/agent-toolkit/src" \
    --include="*.ts" \
    --exclude-dir=node_modules \
    2>/dev/null || true
)

if [ -z "$ENV_SUPPORT" ]; then
  echo "⚠️  WARNING: Environment variable support not detected"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: Environment variable support found"
fi

# Check 4: Docker compose mounts tools directory (optional for Phase 6)
echo ""
echo "📋 Checking Docker compose tools mounting..."
DOCKER_COMPOSE_FILES=(
  "$PROJECT_ROOT/docker/memory-stack/docker-compose.enhanced.yml"
  "$PROJECT_ROOT/docker/memory-stack/docker-compose.yml"
  "$PROJECT_ROOT/docker-compose.yml"
)

DOCKER_FOUND=false
for compose_file in "${DOCKER_COMPOSE_FILES[@]}"; do
  if [ -f "$compose_file" ]; then
    if grep -q "tools.*agent-toolkit\|agent-toolkit.*tools" "$compose_file" 2>/dev/null; then
      echo "✅ PASS: Docker compose mounts tools directory"
      DOCKER_FOUND=true
      break
    fi
  fi
done

if [ "$DOCKER_FOUND" = false ]; then
  echo "⚠️  INFO: Docker compose tools mounting is optional (Phase 6 feature)"
fi

# Check 5: No hardcoded tool paths
echo ""
echo "📋 Checking for hardcoded tool paths..."
HARDCODED_PATHS=$(
  grep -r "/usr/bin/ripgrep\|/usr/local/bin/semgrep" "$PROJECT_ROOT/packages/agent-toolkit/src" \
    --include="*.ts" \
    --exclude-dir=node_modules \
    2>/dev/null || true
)

if [ -n "$HARDCODED_PATHS" ]; then
  echo "⚠️  WARNING: Found hardcoded tool paths (should be configurable):"
  echo "$HARDCODED_PATHS" | head -3
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: No hardcoded tool paths"
fi

# Check 6: Fallback paths are correct
echo ""
echo "📋 Checking fallback path priority..."
FALLBACK_CHECK=$(
  grep -A 10 "toolsPath.*priority\|resolve.*tools.*path" \
    "$PROJECT_ROOT/packages/agent-toolkit/src/infra"/*.ts 2>/dev/null || true
)

if [ -z "$FALLBACK_CHECK" ]; then
  echo "⚠️  WARNING: Fallback path priority not clearly defined"
  WARNINGS=$((WARNINGS + 1))
else
  echo "✅ PASS: Fallback path logic exists"
fi

# Check 7: Tools are executable
echo ""
echo "📋 Checking tool executability..."
if [ -d "$TOOLS_DIR" ]; then
  NON_EXECUTABLE=0
  for script in "$TOOLS_DIR"/*; do
    if [ -f "$script" ] && [ ! -x "$script" ]; then
      echo "⚠️  WARNING: Non-executable tool: $(basename "$script")"
      NON_EXECUTABLE=$((NON_EXECUTABLE + 1))
    fi
  done
  
  if [ $NON_EXECUTABLE -eq 0 ]; then
    echo "✅ PASS: All tools are executable"
  else
    echo "⚠️  WARNING: $NON_EXECUTABLE tools are not executable"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Summary
echo ""
echo "============================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ brAInwav Tools Path: ALL CHECKS PASSED"
  echo "   Tools path resolution is correct ✓"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  brAInwav Tools Path: $WARNINGS WARNINGS"
  echo "   Review warnings for potential improvements"
  exit 0
else
  echo "❌ brAInwav Tools Path: $ERRORS ERRORS, $WARNINGS WARNINGS"
  echo "   Fix errors to ensure tools path resolution works"
  exit 1
fi
