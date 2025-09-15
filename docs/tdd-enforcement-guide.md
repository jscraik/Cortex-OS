# TDD Enforcement Guide for brAInwav Development

This guide explains how to enforce Test-Driven Development (TDD) practices using the TDD Coach package in your daily development workflow at brAInwav.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Integration Methods](#integration-methods)
   - [Pre-commit Hooks](#pre-commit-hooks)
   - [IDE Integration](#ide-integration)
   - [CI/CD Pipeline](#cicd-pipeline)
   - [Command Line Usage](#command-line-usage)
4. [Makefile Integration](#makefile-integration)
5. [Universal Tool Integration](#universal-tool-integration)
6. [Best Practices](#best-practices)

## Overview

TDD Coach is a powerful tool that enforces proper Test-Driven Development practices by monitoring test results and providing contextual coaching. It ensures developers and AI assistants follow the classic TDD cycle:

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve the code while keeping tests passing

## Prerequisites

Before using TDD Coach, ensure you have:

- Node.js 20+
- pnpm 10.3.0
- Git 2.40+
- The Cortex-OS repository cloned locally

## Integration Methods

### Pre-commit Hooks

To automatically validate changes before committing:

1. Ensure the husky pre-commit hook is executable:

   ```bash
   chmod +x .husky/pre-commit
   ```

2. The hook will automatically run when you commit changes, validating staged files against TDD principles.

### IDE Integration

#### VS Code Integration

1. Use the provided tasks in `.vscode/tasks.json`:

   - `TDD Coach Validation`: Validate the current file
   - `TDD Coach Watch Mode`: Continuously monitor for TDD violations

2. Configure keybindings in `.vscode/keybindings.json`:
   ```json
   [
     {
       "key": "ctrl+shift+t",
       "command": "workbench.action.tasks.runTask",
       "args": "TDD Coach Validation"
     }
   ]
   ```

### CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/tdd-enforcement.yml` automatically validates code in pull requests and pushes to the main branch.

### Command Line Usage

#### Direct CLI Usage

```bash
# Check current TDD status
cd packages/tdd-coach
node dist/cli/tdd-coach.js status

# Validate specific files
node dist/cli/tdd-coach.js validate --files src/example.test.ts src/example.ts

# Run in watch mode
node dist/cli/tdd-coach.js validate --watch
```

#### Using the TDD Enforcer Script

```bash
# Run the enforcer script
./scripts/tdd-enforcer.sh

# Run in watch mode
./scripts/tdd-enforcer.sh --watch

# Validate specific files
./scripts/tdd-enforcer.sh "src/file1.ts src/file2.ts"
```

## Makefile Integration

The Makefile includes convenient targets for TDD enforcement:

```bash
# Set up TDD Coach (build the package)
make tdd-setup

# Check current TDD status
make tdd-status

# Validate specific files
make tdd-validate FILES="src/file1.ts src/file2.ts"

# Run in watch mode
make tdd-watch

# Run the TDD enforcer script
make tdd-enforce
```

## Universal Tool Integration

For comprehensive integration across all tools in the brAInwav ecosystem, see the [Universal TDD Coach Integration Guide](./tdd-coach-universal-integration.md) which covers:

- Integration with development scripts
- CLI tools enhancement
- AI tool hooks (GitHub Copilot, Claude Code)
- Testing framework integration
- Build system validation
- Package management lifecycle
- Security tool workflows
- Monitoring tool enhancement

This guide provides detailed instructions for enforcing TDD across the entire development stack.

## Best Practices

1. **Always run TDD Coach before committing code** to ensure compliance with TDD principles
2. **Use watch mode during development** to get real-time feedback
3. **Integrate with your IDE** for seamless validation
4. **Configure pre-commit hooks** to prevent non-compliant code from being committed
5. **Run in CI/CD pipelines** to enforce TDD across the team
6. **Customize coaching levels** based on team experience and project requirements

## Troubleshooting

### Common Issues

1. **TDD Coach not found**: Ensure you've run `make tdd-setup` to build the package
2. **Permission denied**: Make scripts executable with `chmod +x`
3. **Node.js version issues**: Ensure you're using Node.js 20+

### Getting Help

For issues with TDD Coach, check:

- Package documentation in `packages/tdd-coach/README.md`
- CLI help: `node packages/tdd-coach/dist/cli/tdd-coach.js --help`
- Integration guides in `docs/`

## Customization

You can customize TDD Coach behavior through the configuration options:

```typescript
{
  universalMode: boolean; // Enable real-time monitoring
  defaultInterventionLevel: 'silent' | 'coaching' | 'warning' | 'blocking';
  adaptiveLearning: boolean; // Adapt to developer skill level
  teamCalibration: boolean; // Use team-wide settings
  emergencyBypassEnabled: boolean; // Allow emergency overrides
}
```

For more information on customization, see the TDD Coach package documentation.
