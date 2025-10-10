#!/usr/bin/env bash
# brAInwav Memory Architecture Enforcement Script
# Ensures no direct database access, only through memory-core
# Phase 7.1: Memory-Core Enforcement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧠 brAInwav Memory Architecture Enforcement"
echo "==========================================="
echo ""

ERRORS=0

# Check 1: No direct Qdrant imports outside memory-core
echo "📋 Checking for unauthorized Qdrant imports..."
QDRANT_VIOLATIONS=$(
  grep -r "from '@qdrant/js-client-rest'" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=memory-core \
    2>/dev/null || true
)

if [ -n "$QDRANT_VIOLATIONS" ]; then
  echo "❌ FAIL: Found direct Qdrant imports outside memory-core:"
  echo "$QDRANT_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No unauthorized Qdrant imports"
fi

# Check 2: No direct database connections outside memory-core
echo ""
echo "📋 Checking for unauthorized database connections..."
DB_VIOLATIONS=$(
  grep -r "new QdrantClient\|createClient.*qdrant" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=memory-core \
    2>/dev/null || true
)

if [ -n "$DB_VIOLATIONS" ]; then
  echo "❌ FAIL: Found direct database connections outside memory-core:"
  echo "$DB_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No unauthorized database connections"
fi

# Check 3: No imports from packages/memories (removed)
echo ""
echo "📋 Checking for imports from removed packages/memories..."
MEMORIES_VIOLATIONS=$(
  grep -r "from '@cortex-os/memories'" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    2>/dev/null || true
)

if [ -n "$MEMORIES_VIOLATIONS" ]; then
  echo "❌ FAIL: Found imports from removed packages/memories:"
  echo "$MEMORIES_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No imports from removed packages/memories"
fi

# Check 4: No RAG adapter imports (migrated to memory-core)
echo ""
echo "📋 Checking for imports from old RAG adapters..."
RAG_VIOLATIONS=$(
  grep -r "from.*rag.*adapters\|import.*RagAdapter" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    --exclude-dir=memory-core \
    2>/dev/null || true
)

if [ -n "$RAG_VIOLATIONS" ]; then
  echo "❌ FAIL: Found imports from old RAG adapters:"
  echo "$RAG_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No imports from old RAG adapters"
fi

# Check 5: Verify LocalMemoryProvider is used
echo ""
echo "📋 Checking for LocalMemoryProvider usage..."
MEMORY_PROVIDER_COUNT=$(
  grep -r "LocalMemoryProvider\|createMemoryProvider" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    -c 2>/dev/null | awk -F: '{sum+=$2} END {print sum}'
)

if [ "$MEMORY_PROVIDER_COUNT" -lt 1 ]; then
  echo "⚠️  WARNING: LocalMemoryProvider usage seems low (count: $MEMORY_PROVIDER_COUNT)"
  echo "   Ensure memory-core is being used throughout the codebase"
else
  echo "✅ PASS: LocalMemoryProvider detected ($MEMORY_PROVIDER_COUNT references)"
fi

# Check 6: No in-memory adapters (removed)
echo ""
echo "📋 Checking for removed in-memory adapters..."
INMEMORY_VIOLATIONS=$(
  grep -r "InMemoryMemoryAdapter\|ResilientMemoryAdapter" "$PROJECT_ROOT/packages" \
    --include="*.ts" \
    --include="*.tsx" \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    2>/dev/null || true
)

if [ -n "$INMEMORY_VIOLATIONS" ]; then
  echo "❌ FAIL: Found references to removed in-memory adapters:"
  echo "$INMEMORY_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No references to removed adapters"
fi

# Check 7: Runtime changes must include memory log updates with LocalMemoryEntryId
echo ""
echo "📋 Checking memory decision log coverage..."

determine_base_commit() {
  if [ -n "${NX_BASE:-}" ]; then
    echo "$NX_BASE"
    return
  fi

  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    echo "origin/main"
    return
  fi

  if git rev-parse --verify main >/dev/null 2>&1; then
    echo "main"
    return
  fi

  git rev-parse HEAD^ 2>/dev/null || echo ""
}

BASE_COMMIT="$(determine_base_commit)"

# Additional fallbacks for CI contexts where the base ref is unavailable or matches HEAD
if [ -z "$BASE_COMMIT" ] && [ -n "${GITHUB_EVENT_BEFORE:-}" ]; then
  if git rev-parse --verify "${GITHUB_EVENT_BEFORE}" >/dev/null 2>&1; then
    BASE_COMMIT="${GITHUB_EVENT_BEFORE}"
  fi
fi

if [ -n "$BASE_COMMIT" ]; then
  BASE_HASH="$(git rev-parse "$BASE_COMMIT" 2>/dev/null || true)"
  HEAD_HASH="$(git rev-parse HEAD 2>/dev/null || true)"

  if [ -n "$BASE_HASH" ] && [ -n "$HEAD_HASH" ] && [ "$BASE_HASH" = "$HEAD_HASH" ]; then
    PREVIOUS_HEAD="$(git rev-parse "${HEAD_HASH}^" 2>/dev/null || true)"
    if [ -n "$PREVIOUS_HEAD" ]; then
      BASE_COMMIT="$PREVIOUS_HEAD"
    else
      BASE_COMMIT=""
    fi
  elif [ -z "$BASE_HASH" ]; then
    BASE_COMMIT=""
  fi
fi

if [ -z "$BASE_COMMIT" ]; then
  echo "⚠️  INFO: Unable to determine base commit; skipping memory decision log check"
else
  CHANGED_FILES=$(git diff --name-only "$BASE_COMMIT"...HEAD || true)

  RUNTIME_CHANGED=$(echo "$CHANGED_FILES" | grep -E '^(apps|packages|services|servers|libs)/.+\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|cs|swift|kt|kts|sql)$' || true)

  if [ -n "$RUNTIME_CHANGED" ]; then
    if ! echo "$CHANGED_FILES" | grep -qx ".github/instructions/memories.instructions.md"; then
      echo "❌ FAIL: Runtime code changed without updating .github/instructions/memories.instructions.md"
      ERRORS=$((ERRORS + 1))
    else
      LOG_DIFF=$(git diff "$BASE_COMMIT"...HEAD -- .github/instructions/memories.instructions.md || true)
      if ! echo "$LOG_DIFF" | grep -E '^\+.*LocalMemoryEntryId:\s*\S' >/dev/null; then
        echo "❌ FAIL: Memory log update is missing a LocalMemoryEntryId reference"
        ERRORS=$((ERRORS + 1))
      elif echo "$LOG_DIFF" | grep -E '^\+.*LocalMemoryEntryId:\s*(TBD|todo|pending|N/?A)' >/dev/null; then
        echo "❌ FAIL: LocalMemoryEntryId must reference the persisted entry (not TBD/todo)"
        ERRORS=$((ERRORS + 1))
      else
        echo "✅ PASS: Memory log updated with LocalMemoryEntryId"
      fi
    fi
  else
    echo "✅ PASS: No runtime code changes detected"
  fi
fi

# Summary
echo ""
echo "==========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ brAInwav Memory Architecture: ALL CHECKS PASSED"
  echo "   Memory-core is the single source of truth ✓"
  exit 0
else
  echo "❌ brAInwav Memory Architecture: $ERRORS VIOLATIONS FOUND"
  echo "   Fix violations to maintain architectural integrity"
  exit 1
fi
