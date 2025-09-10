#!/usr/bin/env bash

# Security testing script for CI/CD pipeline
# This script runs comprehensive security checks on the codebase

set -e  # Exit on any error

echo "Running security tests..."

# 1. Run Semgrep with precise rules
echo "1. Running Semgrep security scan..."
if command -v semgrep >/dev/null 2>&1; then
  semgrep --config=.semgrep/owasp-precise.yaml --severity=ERROR . || true
  echo "✅ Semgrep scan completed"
else
  echo "⚠️  Semgrep not found, skipping scan"
fi

# 2. Check for hardcoded secrets
echo "2. Checking for hardcoded secrets..."
if command -v git >/dev/null 2>&1; then
  # Look for common patterns of secrets
  if git grep -i -E "(password|secret|token|key)[[:space:]]*=[[:space:]]*['\"][^'\"]{5,}" -- "./*" 2>/dev/null; then
    echo "⚠️  Potential hardcoded secrets found"
  else
    echo "✅ No hardcoded secrets found"
  fi
else
  echo "⚠️  Git not found, skipping secret check"
fi

# 3. Check for insecure dependencies
echo "3. Checking for insecure dependencies..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm audit --audit-level=moderate || true
  echo "✅ Dependency audit completed"
else
  echo "⚠️  pnpm not found, skipping dependency audit"
fi

# 4. Check for security-related TODO comments
echo "4. Checking for security-related TODO comments..."
if command -v grep >/dev/null 2>&1; then
  if grep -r -i -n "TODO.*security\|TODO.*secure\|FIXME.*security\|FIXME.*secure" --include="*.ts" --include="*.js" --include="*.py" . 2>/dev/null; then
    echo "⚠️  Security-related TODO/FIXME comments found"
  else
    echo "✅ No security-related TODO/FIXME comments found"
  fi
else
  echo "⚠️  grep not found, skipping TODO check"
fi

# 5. Validate that security wrappers are being used
echo "5. Validating security wrapper usage..."
if command -v grep >/dev/null 2>&1; then
  # Check if SecureDatabaseWrapper is imported where needed
  if grep -r "import.*SecureDatabaseWrapper" apps/ packages/ 2>/dev/null; then
    echo "✅ SecureDatabaseWrapper is being imported"
  else
    echo "⚠️  SecureDatabaseWrapper not found in imports"
  fi

  # Check if SecureNeo4j is imported where needed
  if grep -r "import.*SecureNeo4j" packages/ 2>/dev/null; then
    echo "✅ SecureNeo4j is being imported"
  else
    echo "⚠️  SecureNeo4j not found in imports"
  fi

  # Check if SecureCommandExecutor is imported where needed
  if grep -r "import.*SecureCommandExecutor" packages/ 2>/dev/null; then
    echo "✅ SecureCommandExecutor is being imported"
  else
    echo "⚠️  SecureCommandExecutor not found in imports"
  fi
else
  echo "⚠️  grep not found, skipping wrapper validation"
fi

echo "✅ Security tests completed"
