#!/usr/bin/env bash

# Script to verify Phase 4 implementation
# This script checks that all Phase 4 files and configurations are in place

echo "🔍 Verifying Phase 4 Implementation..."

# Counter for tracking results
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Function to run a check
run_check() {
  local description="$1"
  local check_command="$2"
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "  🔎 $description... "
  
  if eval "$check_command" >/dev/null 2>&1; then
    echo "✅ PASSED"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo "❌ FAILED"
  fi
}

# Check test files
run_check "Security unit test files exist" "test -f tests/security/database-wrapper.unit.test.ts && test -f tests/security/neo4j-wrapper.unit.test.ts && test -f tests/security/command-executor.unit.test.ts"
run_check "Security integration test file exists" "test -f tests/security/security-wrappers.integration.test.ts"
run_check "Security regression test file exists" "test -f tests/security/security-regression.test.ts"

# Check CI/CD pipeline
run_check "Security CI/CD pipeline exists" "test -f .github/workflows/security-testing.yml"

# Check scripts
run_check "Security test runner script exists" "test -f scripts/run-security-tests.mjs"
run_check "Security test runner is executable" "test -x scripts/run-security-tests.mjs"

# Check documentation
run_check "Phase 4 progress summary exists" "test -f docs/security/PHASE4_PROGRESS_SUMMARY.md"

# Check package.json for security scripts
run_check "Package.json contains security test scripts" "grep -q '"test:security:unit"' package.json || grep -q '"test:security:integration"' package.json || grep -q '"test:security:regression"' package.json"

# Summary
echo ""
echo "📊 Verification Summary:"
echo "  Total checks: $TOTAL_CHECKS"
echo "  Passed checks: $PASSED_CHECKS"
echo "  Failed checks: $((TOTAL_CHECKS - PASSED_CHECKS))"

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
  echo "🎉 All Phase 4 implementation checks passed!"
  exit 0
else
  echo "⚠️  Some checks failed. Please review the implementation."
  exit 1
fi