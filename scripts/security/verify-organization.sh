#!/bin/bash

# Final verification script to confirm proper file organization
# This script verifies that all security-related files are properly organized

echo "🔍 Running final verification of file organization..."

# Counter for tracking results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a check
run_check() {
  local description="$1"
  local check_command="$2"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -e "${BLUE}[CHECK]${NC} $description"

  if eval "$check_command" >/dev/null 2>&1; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    echo -e "  ${GREEN}✅ PASSED${NC}"
  else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    echo -e "  ${RED}❌ FAILED${NC}"
  fi
}

# Check that security documentation is properly organized
run_check "Security documentation is in docs/security/" "test -d docs/security && test \$(find docs/security -name '*.md' | wc -l) -gt 10"

# Check that security scripts are properly organized
run_check "Security scripts are in scripts/security/" "test -d scripts/security && test \$(find scripts/security -name '*.json' | wc -l) -gt 2"

# Check that security tests are properly organized
run_check "Security tests are in tests/security/" "test -d tests/security"

# Check that no security files are at root level
run_check "No security documentation at root level" "! ls -la *.md 2>/dev/null | grep -q -E '(SECURITY|FINAL|COMPREHENSIVE|PHASE)'"

# Check that no security scripts are at root level
run_check "No security scripts at root level" "! find . -maxdepth 1 -name '*security*' -type f 2>/dev/null | grep -q 'security'"

# Check that no security tests are at root level
run_check "No security tests at root level" "! find . -maxdepth 1 -name '*test*' -type f 2>/dev/null | grep -q -E '(security|secure)'"

# Check that security-related directories exist in proper locations
run_check "Security-related directories exist in proper locations" "test -d docs/security && test -d scripts/security && test -d tests/security"

# Display final results
echo ""
echo -e "${BLUE}📊 Final Organization Verification Results${NC}"
echo ""
echo "Total checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed checks: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed checks: $FAILED_CHECKS${NC}"

# Overall status
if [ $FAILED_CHECKS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All organization verification checks passed!${NC}"
  echo "✅ Security files are properly organized in their respective directories."
  echo "✅ No security files are misplaced at the root level."
  echo "✅ File organization follows proper project structure conventions."
  exit 0
else
  echo ""
  echo -e "${RED}💥 Organization verification failed!${NC}"
  echo "❌ Some organization checks failed."
  echo "❌ Please review the errors and reorganize files properly."
  exit 1
fi
