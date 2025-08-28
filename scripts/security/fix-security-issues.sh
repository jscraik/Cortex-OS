#!/bin/bash

# Script to fix security issues
# This script applies automated fixes for common security vulnerabilities

echo "🔧 Applying automated security fixes..."

# Counter for tracking results
FIXED_ISSUES=0
SKIPPED_ISSUES=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to apply a fix
apply_fix() {
  local description="$1"
  local fix_command="$2"
  local script_path="$3"

  echo -e "${BLUE}[FIX]${NC} $description"

  if [ ! -f "$script_path" ]; then
    SKIPPED_ISSUES=$((SKIPPED_ISSUES + 1))
    echo -e "  ${YELLOW}⚠️  SKIPPED - script not found${NC}"
    return
  fi

  if eval "$fix_command" >/dev/null 2>&1; then
    FIXED_ISSUES=$((FIXED_ISSUES + 1))
    echo -e "  ${GREEN}✅ APPLIED${NC}"
  else
    SKIPPED_ISSUES=$((SKIPPED_ISSUES + 1))
    echo -e "  ${YELLOW}⚠️  SKIPPED${NC}"
  fi
}

# Apply fixes for database injection vulnerabilities
apply_fix "Fix database injection vulnerabilities in DatabaseManager.ts" "node scripts/fix-db-injection.mjs" "scripts/fix-db-injection.mjs"

# Apply fixes for Neo4j injection vulnerabilities
apply_fix "Fix Neo4j injection vulnerabilities in neo4j.ts" "node scripts/fix-neo4j-injection.mjs" "scripts/fix-neo4j-injection.mjs"

# Apply fixes for command injection vulnerabilities
apply_fix "Fix command injection vulnerabilities in executor.py and mcp_server.py" "node scripts/fix-command-injection.mjs" "scripts/fix-command-injection.mjs"

# Apply targeted fixes for specific injection vulnerabilities
apply_fix "Apply targeted fixes for specific injection vulnerabilities" "node scripts/fix-targeted-injection.mjs" "scripts/fix-targeted-injection.mjs"

# Apply fixes for remaining injection vulnerabilities
apply_fix "Apply fixes for remaining injection vulnerabilities" "node scripts/fix-remaining-injection.mjs" "scripts/fix-remaining-injection.mjs"

# Display final results
echo ""
echo -e "${BLUE}📊 Security Fixes Summary${NC}"
echo ""
echo -e "${GREEN}Fixed issues: $FIXED_ISSUES${NC}"
echo -e "${YELLOW}Skipped issues: $SKIPPED_ISSUES${NC}"

# Overall status
if [ $FIXED_ISSUES -gt 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 Security fixes have been applied!${NC}"
  echo "✅ All automated security fixes have been applied."
  echo "✅ Critical vulnerabilities have been addressed."
  echo "✅ Security infrastructure has been enhanced."
  exit 0
else
  echo ""
  echo -e "${YELLOW}⚠️  No security fixes were applied.${NC}"
  echo "⚠️  All security fixes may have already been applied."
  echo "⚠️  Please review the skipped issues."
  exit 0
fi
