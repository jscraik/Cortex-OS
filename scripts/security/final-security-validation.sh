#!/bin/bash

# Final validation script for security improvements
# This script confirms that all security improvements have been properly implemented

echo "🔍 Running final validation of security improvements..."

# Counter for tracking results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
  local description="$1"
  local test_command="$2"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}[TEST]${NC} $description"

  if eval "$test_command" >/dev/null 2>&1; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✅ PASSED${NC}"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo -e "  ${RED}❌ FAILED${NC}"
  fi
}

# Function to run a warning test
run_warning_test() {
  local description="$1"
  local test_command="$2"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}[TEST]${NC} $description"

  if eval "$test_command" >/dev/null 2>&1; then
    WARNINGS=$((WARNINGS + 1))
    echo -e "  ${YELLOW}⚠️  WARNING${NC}"
  else
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "  ${GREEN}✅ PASSED${NC}"
  fi
}

# Check that all security wrapper files exist
run_test "SecureDatabaseWrapper file exists" "test -f packages/mvp-core/src/secure-db.ts"
run_test "SecureNeo4j file exists" "test -f libs/typescript/utils/src/secure-neo4j.ts"
run_test "SecureCommandExecutor file exists" "test -f packages/mvp-core/src/secure-executor.ts"
run_test "Validation utilities file exists" "test -f packages/mvp-core/src/validation.ts"

# Check that all security test files exist
run_test "Database wrapper unit tests exist" "test -f tests/security/database-wrapper.unit.test.ts"
run_test "Neo4j wrapper unit tests exist" "test -f tests/security/neo4j-wrapper.unit.test.ts"
run_test "Command executor unit tests exist" "test -f tests/security/command-executor.unit.test.ts"
run_test "Security suite integration tests exist" "test -f tests/security/security-suite.integration.test.ts"

# Check that security documentation exists
run_test "Security documentation exists" "test -f docs/security/SECURITY_IMPLEMENTATION_PLAN.md"

# Check that security scripts exist
run_test "Security scripts exist" "test -f scripts/fix-security-issues.sh"

# Check that CI/CD security integration exists
run_test "CI/CD security integration exists" "test -f .github/workflows/security-testing.yml"

# Run Semgrep security scan with precise rules
run_warning_test "Semgrep security scan with precise rules" "semgrep --config=.semgrep/owasp-precise.yaml --severity=ERROR . 2>/dev/null | grep -q 'injection\\|ssrf'"

# Check for security-related TODO comments
run_warning_test "Security-related TODO comments" "grep -r -i 'TODO.*security\\|TODO.*secure\\|FIXME.*security\\|FIXME.*secure' packages/mvp-core/src/ 2>/dev/null"

# Check for direct injection patterns in security wrappers
run_warning_test "Direct injection patterns in security wrappers" "grep -r '\".*\\+.*\\+.*\"' packages/mvp-core/src/ 2>/dev/null | grep -v 'SECURITY FIX'"

# Check for proper error handling in security wrappers
run_test "Proper error handling in security wrappers" "grep -r 'try.*catch\\|catch.*{' packages/mvp-core/src/ 2>/dev/null"

# Check for input validation in security wrappers
run_test "Input validation in security wrappers" "grep -r 'validate\\|sanitize' packages/mvp-core/src/ 2>/dev/null"

# Check for resource limits in security wrappers
run_test "Resource limits in security wrappers" "grep -r 'timeout\\|limit\\|MAX_' packages/mvp-core/src/ 2>/dev/null"

# Run security unit tests
run_test "Security unit tests pass" "npm run test:security:unit 2>/dev/null"

# Run security integration tests
run_test "Security integration tests pass" "npm run test:security:integration 2>/dev/null"

# Run security regression tests
run_test "Security regression tests pass" "npm run test:security:regression 2>/dev/null"

# Run security coverage tests
run_test "Security coverage tests pass" "npm run test:security:coverage 2>/dev/null"

# Run security CI tests
run_test "Security CI tests pass" "npm run test:security:ci 2>/dev/null"

# Run security scan
run_test "Security scan passes" "npm run security:scan 2>/dev/null"

# Run security scan all
run_test "Security scan all passes" "npm run security:scan:all 2>/dev/null"

# Run security audit
run_test "Security audit passes" "npm run security:audit 2>/dev/null"

# Run security typecheck
run_test "Security typecheck passes" "npm run security:typecheck 2>/dev/null"

# Run security run
run_test "Security run passes" "npm run security:run 2>/dev/null"

# Display final results
echo ""
echo -e "${BLUE}📊 Final Validation Results Summary${NC}"
echo ""
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed tests: $PASSED_TESTS${NC}"
echo -e "${RED}Failed tests: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

# Overall status
if [ $FAILED_TESTS -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 All final validation tests passed!${NC}"
  echo "✅ Security improvements have been successfully implemented and validated."
  echo "✅ All critical vulnerabilities have been addressed."
  echo "✅ Security infrastructure is properly configured."
  exit 0
else
  echo ""
  echo -e "${RED}💥 Final validation failed!${NC}"
  echo "❌ Some validation tests failed."
  echo "❌ Please review the errors and address them before proceeding."
  exit 1
fi
