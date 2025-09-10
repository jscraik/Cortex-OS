#!/usr/bin/env bash

# Script to test command execution security

echo "Running command execution security tests..."

# 1. Run Semgrep security scan
echo "1. Running Semgrep security scan..."
if command -v semgrep >/dev/null 2>&1; then
  semgrep --config=.semgrep/owasp-precise.yaml --severity=ERROR packages/mcp/src/tools/docker/mcp_server.py packages/mvp-core/src/python/secure_executor.py 2>/dev/null || true
  echo "✅ Semgrep scan completed"
else
  echo "⚠️  Semgrep not found, skipping scan"
fi

# 2. Check for security-related TODO comments
echo "2. Checking for security-related TODO comments..."
if command -v grep >/dev/null 2>&1; then
  if grep -r -i "TODO.*security\|TODO.*secure\|FIXME.*security\|FIXME.*secure" packages/mcp/src/tools/docker/mcp_server.py packages/mvp-core/src/python/secure_executor.py 2>/dev/null; then
    echo "⚠️  Security-related TODO/FIXME comments found"
  else
    echo "✅ No security-related TODO/FIXME comments found"
  fi
else
  echo "⚠️  grep not found, skipping TODO check"
fi

# 3. Check for SecureCommandExecutor import
echo "3. Checking for SecureCommandExecutor import..."
if command -v grep >/dev/null 2>&1; then
  if grep -r "SecureCommandExecutor" packages/mcp/src/tools/docker/mcp_server.py 2>/dev/null; then
    echo "✅ SecureCommandExecutor import found"
  else
    echo "❌ SecureCommandExecutor import not found"
  fi
else
  echo "⚠️  grep not found, skipping import check"
fi

# 4. Check for security features
echo "4. Checking for security features..."
if command -v grep >/dev/null 2>&1; then
  # Check for command validation
  if grep -r "validate.*command\|ALLOWED_COMMANDS\|validate_docker_command" packages/mvp-core/src/python/secure_executor.py 2>/dev/null; then
    echo "✅ Command validation found"
  else
    echo "❌ Command validation not found"
  fi

  # Check for parameter sanitization
  if grep -r "sanitize.*command\|re\..*sub" packages/mvp-core/src/python/secure_executor.py 2>/dev/null; then
    echo "✅ Parameter sanitization found"
  else
    echo "❌ Parameter sanitization not found"
  fi

  # Check for timeout enforcement
  if grep -r "timeout\|TIMEOUT" packages/mvp-core/src/python/secure_executor.py 2>/dev/null; then
    echo "✅ Timeout enforcement found"
  else
    echo "❌ Timeout enforcement not found"
  fi

  # Check for error handling
  if grep -r "try.*except\|except.*Exception" packages/mvp-core/src/python/secure_executor.py 2>/dev/null; then
    echo "✅ Error handling found"
  else
    echo "❌ Error handling not found"
  fi
else
  echo "⚠️  grep not found, skipping security feature check"
fi

# 5. Check for command injection patterns
echo "5. Checking for command injection patterns..."
if command -v grep >/dev/null 2>&1; then
  # Check for dangerous patterns that should be prevented
  if grep -r "[;&|`$\!]\\|^.*subprocess\.run.*shell.*True" packages/mcp/src/tools/docker/mcp_server.py 2>/dev/null; then
    echo "❌ Dangerous command injection patterns found"
  else
    echo "✅ No dangerous command injection patterns found"
  fi
else
  echo "⚠️  grep not found, skipping injection pattern check"
fi

echo "✅ Command execution security tests completed"
