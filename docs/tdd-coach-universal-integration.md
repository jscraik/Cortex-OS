# Universal TDD Coach Integration Guide for brAInwav Tools

This guide provides comprehensive instructions for integrating TDD Coach enforcement across all development tools and workflows in the brAInwav Cortex-OS ecosystem.

## Table of Contents

1. [Overview](#overview)
2. [Integration with Development Scripts](#integration-with-development-scripts)
3. [Integration with CLI Tools](#integration-with-cli-tools)
4. [Integration with AI Tools](#integration-with-ai-tools)
5. [Integration with Testing Frameworks](#integration-with-testing-frameworks)
6. [Integration with Build Systems](#integration-with-build-systems)
7. [Integration with Package Management](#integration-with-package-management)
8. [Integration with Security Tools](#integration-with-security-tools)
9. [Integration with Monitoring Tools](#integration-with-monitoring-tools)
10. [Best Practices](#best-practices)

## Overview

TDD Coach provides comprehensive Test-Driven Development enforcement for all tools in the brAInwav ecosystem. This guide shows how to integrate TDD Coach with:

- Development scripts (`scripts/` directory)
- CLI tools (`tools/` directory)
- AI coding assistants (GitHub Copilot, Claude Code, etc.)
- Testing frameworks (Vitest, Jest, Pytest, etc.)
- Build systems (Nx, Turbo, etc.)
- Package management (pnpm)
- Security tools (Semgrep, etc.)
- Monitoring tools (memory management, etc.)

## Integration with Development Scripts

### 1. Existing Script Integration

Modify existing scripts in `scripts/` to include TDD validation:

```bash
# Example: scripts/dev-setup.sh
#!/bin/bash


# Add TDD Coach validation after setup
echo "🧪 Validating TDD setup..."
cd packages/tdd-coach && pnpm build && cd ../..
make tdd-status

echo "✅ Development environment ready with TDD enforcement"
```

### 2. Memory Management Scripts

Integrate TDD Coach with memory management scripts:

```bash
# Example: scripts/memory-guard.sh (add to existing script)

# Add TDD validation for memory-related code changes
if [ -n "$CHANGED_FILES" ]; then
    echo "🔍 Validating memory-related changes with TDD Coach..."
    make tdd-validate FILES="$CHANGED_FILES"
fi
```

### 3. Health Check Scripts

Enhance health check scripts with TDD validation:

```bash
# Example: Add to scripts/health-check.sh
echo "🧪 Running TDD Coach health check..."
make tdd-status
if [ $? -ne 0 ]; then
    echo "❌ TDD Coach health check failed"
    exit 1
fi
echo "✅ TDD Coach is healthy"
```

## Integration with CLI Tools

### 1. Cortex CLI Integration

Add TDD validation to the Cortex CLI (`apps/cortex-cli`) — Deprecated: cortex-cli has been removed; use the Rust-based `codex` CLI (apps/cortex-code).

```typescript
// Example (historical): apps/cortex-cli/src/commands/validate.ts
import { Command } from 'commander';
import { execSync } from 'child_process';

const validateCommand = new Command('validate')
  .description('Validate code with TDD Coach')
  .option('--files <files...>', 'Files to validate')
  .action((options) => {
    try {
      const cmd = options.files
        ? `make tdd-validate FILES="${options.files.join(' ')}"`
        : 'make tdd-status';

      execSync(cmd, { stdio: 'inherit' });
      console.log('✅ TDD validation passed');
    } catch (error) {
      console.error('❌ TDD validation failed');
      process.exit(1);
    }
  });

export default validateCommand;
```

### 2. Custom CLI Tools

Integrate TDD Coach into custom CLI tools in `tools/`:

```javascript
// Example: tools/mcp_server.js
const { execSync } = require('child_process');

// Add TDD validation before starting MCP server
function validateTddCompliance() {
  try {
    execSync('make tdd-status', { stdio: 'inherit' });
    console.log('✅ TDD compliance verified');
    return true;
  } catch (error) {
    console.error('❌ TDD compliance check failed');
    return false;
  }
}

// In server startup
if (process.env.ENFORCE_TDD === 'true') {
  if (!validateTddCompliance()) {
    console.error('TDD enforcement failed, exiting...');
    process.exit(1);
  }
}

// ... rest of server code
```

## Integration with AI Tools

### 1. GitHub Copilot Integration

Create a wrapper for GitHub Copilot that enforces TDD:

```bash
#!/bin/bash
# tools/copilot-tdd-wrapper.sh

# Run Copilot command
gh copilot "$@"

# Validate generated code with TDD Coach
if [ "$1" = "suggest" ] || [ "$1" = "explain" ]; then
    echo "🔍 Validating Copilot suggestions with TDD Coach..."
    # Extract changed files and validate them
    CHANGED_FILES=$(git diff --name-only)
    if [ -n "$CHANGED_FILES" ]; then
        make tdd-validate FILES="$CHANGED_FILES"
    fi
fi
```

### 2. Claude Code Integration

Create a pre-execution hook for Claude Code:

```bash
# .claude/hooks/pre-tool-use
#!/bin/bash

# Check if this is a code modification tool
if [[ "$1" =~ ^(Write|Edit|MultiEdit|TodoWrite)$ ]]; then
    echo "🤖 AI tool detected: $1"
    echo "🔍 Validating with TDD Coach before execution..."

    # Run TDD Coach status check
    make tdd-status

    # Store current state for comparison after execution
    echo "$(date)" > /tmp/tdd_pre_execution
fi
```

### 3. Post-execution Validation

Create a post-execution hook to validate AI-generated code:

```bash
# .claude/hooks/post-tool-use
#!/bin/bash

# Check if we have a pre-execution timestamp
if [ -f /tmp/tdd_pre_execution ]; then
    echo "🔍 Validating AI-generated code with TDD Coach..."

    # Find files changed since pre-execution
    CHANGED_FILES=$(git diff --name-only --since="$(cat /tmp/tdd_pre_execution)")

    if [ -n "$CHANGED_FILES" ]; then
        make tdd-validate FILES="$CHANGED_FILES"
        if [ $? -ne 0 ]; then
            echo "❌ TDD validation failed for AI-generated code"
            # Optionally revert changes or require manual approval
        else
            echo "✅ AI-generated code passes TDD validation"
        fi
    fi

    # Clean up
    rm /tmp/tdd_pre_execution
fi
```

## Integration with Testing Frameworks

### 1. Vitest Integration

Enhance Vitest configuration with TDD Coach integration:

```typescript
// vitest.config.ts (enhanced)
import { defineConfig } from 'vitest/config';
import { execSync } from 'child_process';

export default defineConfig({
  test: {
    // ... existing configuration ...

    // Add TDD Coach validation before running tests
    setupFiles: ['./tests/tdd-setup.ts'],

    // Hook into test lifecycle
    hookTimeout: 30000,

    // Report TDD status after tests
    reporters: [
      'default',
      // Custom reporter that also reports TDD status
      {
        onFinished: () => {
          try {
            execSync('make tdd-status', { stdio: 'inherit' });
          } catch (error) {
            console.warn('TDD status check warning:', error);
          }
        },
      },
    ],
  },
});
```

Create the TDD setup file:

```typescript
// tests/tdd-setup.ts
import { execSync } from 'child_process';

// Validate TDD compliance before running tests
try {
  execSync('cd packages/tdd-coach && node dist/cli/tdd-coach.js status', {
    stdio: 'inherit',
  });
  console.log('✅ TDD compliance verified before tests');
} catch (error) {
  console.warn('⚠️ TDD compliance check warning:', error);
}
```

### 2. Pytest Integration

Create a Pytest plugin for TDD Coach integration:

```python
# tools/python/tdd_coach_plugin.py
import pytest
import subprocess
import os

def pytest_configure(config):
    """Validate TDD compliance before running tests"""
    try:
        result = subprocess.run(
            ['make', 'tdd-status'],
            cwd=os.path.join(os.path.dirname(__file__), '../..'),
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ TDD compliance verified")
        else:
            print("⚠️ TDD compliance warning:", result.stderr)
    except Exception as e:
        print("⚠️ TDD compliance check failed:", e)

def pytest_runtest_setup(item):
    """Validate individual test files with TDD Coach"""
    # Get the test file path
    test_file = item.location[0]

    try:
        subprocess.run(
            ['make', 'tdd-validate', f'FILES={test_file}'],
            cwd=os.path.join(os.path.dirname(__file__), '../..'),
            check=True
        )
    except subprocess.CalledProcessError:
        pytest.skip(f"TDD validation failed for {test_file}")
```

Update `pyproject.toml` to use the plugin:

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "-p tools.python.tdd_coach_plugin"
```

## Integration with Build Systems

### 1. Nx Integration

Add TDD validation to Nx build targets:

```json
// nx.json (enhanced)
{
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build", "tdd-validate"],
      "inputs": ["production", "^production"]
    }
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "tdd-validate"]
      }
    }
  }
}
```

Create an Nx plugin for TDD Coach:

```typescript
// tools/nx-plugins/tdd-coach-plugin.ts
import { workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';

export function validateTdd(projectName: string) {
  try {
    console.log(`🔍 Validating ${projectName} with TDD Coach...`);
    execSync('make tdd-status', {
      cwd: workspaceRoot,
      stdio: 'inherit',
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 2. Turbo Integration

Add TDD validation to Turbo pipeline:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build", "tdd-validate"],
      "outputs": ["dist/**", ".next/**"]
    },
    "tdd-validate": {
      "dependsOn": ["^tdd-validate"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["tdd-validate"],
      "outputs": []
    }
  }
}
```

## Integration with Package Management

### 1. pnpm Integration

Add TDD validation to pnpm lifecycle scripts:

```json
// package.json (root)
{
  "scripts": {
    "preinstall": "make tdd-setup",
    "postinstall": "make tdd-status",
    "prebuild": "make tdd-validate",
    "pretest": "make tdd-status",
    "prepublishOnly": "make tdd-validate FILES=\"$(git diff --name-only HEAD~1)\""
  }
}
```

### 2. Workspace Validation

Create a script to validate all packages in the workspace:

```bash
#!/bin/bash
# scripts/validate-workspace-tdd.sh

echo "🔍 Validating TDD compliance across all workspace packages..."

# Get all workspace packages
PACKAGES=$(pnpm list -r --depth -1 --parseable | grep -v node_modules)

for PACKAGE in $PACKAGES; do
    echo "Checking $PACKAGE..."

    # Check if package has test files
    if ls $PACKAGE/**/*.test.* 1> /dev/null 2>&1 || ls $PACKAGE/**/*_test.* 1> /dev/null 2>&1; then
        echo "  🧪 Package has tests, validating with TDD Coach..."

        # Run TDD validation on package
        cd $PACKAGE
        if [ -f "package.json" ]; then
            # Build TDD Coach if needed
            cd ../packages/tdd-coach && pnpm build && cd ../../$PACKAGE

            # Validate package
            node ../packages/tdd-coach/dist/cli/tdd-coach.js validate --files $(find . -name "*.test.*" -o -name "*_test.*")
        fi
        cd ../
    else
        echo "  ℹ️  Package has no test files, skipping TDD validation"
    fi
done

echo "✅ Workspace TDD validation complete"
```

## Integration with Security Tools

### 1. Semgrep Integration

Add TDD validation to Semgrep workflows:

```yaml
# .github/workflows/security-scan.yml (enhanced)
name: Security Scan with TDD Validation

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          npm install -g pnpm
          pnpm install

      - name: Setup TDD Coach
        run: make tdd-setup

      - name: Validate TDD compliance
        run: make tdd-status

      - name: Run Semgrep security scan
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-10
            p/llm-top-10
          auditOn: push

      - name: Report TDD status
        run: |
          echo "TDD Status:"
          make tdd-status
```

### 2. Pre-commit Security Hooks

Enhance pre-commit hooks with TDD validation:

```bash
# .husky/pre-commit (enhanced)
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔒 Running security and TDD validation..."

# Run security checks
echo "🔍 Running security checks..."
pnpm security:scan --quiet

# Run TDD Coach validation
echo "🧪 Running TDD validation..."
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -n "$STAGED_FILES" ]; then
    make tdd-validate FILES="$STAGED_FILES"
    if [ $? -ne 0 ]; then
        echo "❌ TDD validation failed. Please follow TDD practices."
        exit 1
    fi
fi

echo "✅ Security and TDD validation passed"
```

## Integration with Monitoring Tools

### 1. Memory Management Integration

Enhance memory monitoring with TDD validation:

```bash
# scripts/memory-monitor.sh (enhanced)
#!/bin/bash

# ... existing memory monitoring code ...

# Add TDD validation to memory monitoring
function validate_tdd_during_monitoring() {
    echo "🔍 Validating TDD compliance during memory monitoring..."

    # Check TDD status without blocking
    make tdd-status > /tmp/tdd_status.log 2>&1
    if [ $? -ne 0 ]; then
        echo "⚠️ TDD compliance issue detected"
        # Log the issue but don't block memory monitoring
        cat /tmp/tdd_status.log
    else
        echo "✅ TDD compliance verified"
    fi

    rm /tmp/tdd_status.log
}

# Call TDD validation periodically
if [ $((SECONDS % 300)) -eq 0 ]; then  # Every 5 minutes
    validate_tdd_during_monitoring
fi

# ... rest of memory monitoring code
```

### 2. Performance Monitoring

Integrate TDD Coach with performance monitoring:

```bash
# scripts/performance-monitor.sh
#!/bin/bash

echo "🚀 Starting performance monitoring with TDD validation..."

# Validate TDD compliance at start
make tdd-status

# Monitor performance metrics
while true; do
    # Collect performance data
    CPU_USAGE=$(top -l 1 -n 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    MEMORY_USAGE=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')

    # Log performance with TDD status
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$TIMESTAMP] CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE} pages, TDD Status: $(make tdd-status 2>&1 | grep "TDD State" | cut -d: -f2)"

    sleep 60
done
```

## Best Practices

### 1. Layered Enforcement

Implement TDD enforcement at multiple layers:

1. **Development Layer**: Real-time feedback with `make tdd-watch`
2. **Commit Layer**: Pre-commit hooks with automatic validation
3. **Build Layer**: Build system integration with dependency validation
4. **CI/CD Layer**: Pipeline enforcement with quality gates
5. **Deployment Layer**: Pre-deployment validation

### 2. Configuration Management

Create environment-specific TDD configurations:

```typescript
// packages/tdd-coach/src/config/environments.ts
export const environments = {
  development: {
    universalMode: true,
    defaultInterventionLevel: 'coaching',
    adaptiveLearning: true,
  },
  ci: {
    universalMode: false,
    defaultInterventionLevel: 'blocking',
    adaptiveLearning: false,
  },
  production: {
    universalMode: false,
    defaultInterventionLevel: 'warning',
    adaptiveLearning: false,
  },
};
```

### 3. Team Adoption Strategy

1. **Start with Education**: Train team members on TDD principles
2. **Gradual Rollout**: Begin with development tools, then expand
3. **Feedback Loop**: Collect feedback and adjust enforcement levels
4. **Metrics Tracking**: Monitor TDD adoption and code quality improvements
5. **Continuous Improvement**: Regularly update integration points

### 4. Troubleshooting Common Issues

1. **Performance Impact**: Use caching and selective validation
2. **False Positives**: Configure exception patterns for legacy code
3. **Tool Conflicts**: Ensure compatibility with existing development tools
4. **Adoption Resistance**: Start with coaching level, gradually increase enforcement

## Conclusion

By following this guide, you can ensure that TDD Coach is integrated across all tools and workflows in your brAInwav development ecosystem. This comprehensive integration will help maintain consistent TDD practices whether developers are using CLI tools, AI assistants, testing frameworks, or any other part of your development stack.

Remember to start with the most critical integration points and gradually expand coverage across all tools. Monitor adoption and adjust enforcement levels based on team feedback and project requirements.
