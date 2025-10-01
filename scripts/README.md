# Cortex-OS Scripts Directory

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains utility scripts, templates, fixes, tests, and other development tools for the Cortex-OS project.

## 🏗️ Directory Organization (Updated October 2025)

The scripts directory has been reorganized for better maintainability and discoverability:

### Core Categories

- **`/scripts/core/`** - Essential development scripts (dev-setup, health-check)
- **`/scripts/memory/`** - Memory management, monitoring, and safety tools
- **`/scripts/testing/`** - Test execution, validation, and TDD tools
- **`/scripts/ai-ml/`** - AI/ML model tools and integration scripts
- **`/scripts/deployment/`** - Build and deployment automation
- **`/scripts/system/`** - System utilities and process management
- **`/scripts/development/`** - Development workflow and pattern enforcement
- **`/scripts/performance/`** - Performance monitoring and optimization tools

### Existing Specialized Directories

- **`/scripts/security/`** - Security scanning and validation (30+ scripts)
- **`/scripts/code-quality/`** - Code quality and linting tools (16+ scripts)
- **`/scripts/mcp/`** - Model Context Protocol tools
- **`/scripts/maintenance/`** - System maintenance scripts
- **`/scripts/github-apps/`** - GitHub applications management
- **`/scripts/mlx/`** - MLX-specific tools (under ai-ml/)
- **`/scripts/compliance/`** - Licensing and governance
- **`/scripts/templates/`** - Template files for code generation
- **`/scripts/updates/`** - Component update scripts
- **`/scripts/utils/`** - General utility scripts
- **`/scripts/legacy/`** - Deprecated or outdated scripts

## 🚀 Quick Start

### Essential Commands

```bash
# Development environment setup
./scripts/core/dev-setup.sh

# System health check
./scripts/core/health-check.sh

# Memory management
./scripts/memory/memory-guard.sh

# Run tests safely
./scripts/testing/test-safe.sh

# Security scanning
./scripts/security/security-scan.sh

# Code quality checks
./scripts/code-quality/run-all-checks.sh
```

## 📋 Script Categories

### Core Scripts (`/scripts/core/`)

- **`dev-setup.sh`** - Primary development environment setup
- **`enforce-node-version.sh`** - Ensures correct Node.js version
- **`health-check.sh`** - System health verification

### Memory Management (`/scripts/memory/`)

- **`memory-guard.sh`** - Active memory monitoring and protection
- **`memory-monitor.sh`** - Passive memory usage tracking
- **`memory-manager-mcp.sh`** - MCP-based memory management
- **`emergency-memory-cleanup.sh`** - Emergency memory cleanup procedures
- **`memory-regression-guard.mjs`** - Prevents memory regressions
- **`aggregate-memory-peaks.mjs`** - Analyzes memory usage patterns

### Testing (`/scripts/testing/`)

- **`test-safe.sh`** - Memory-safe test execution
- **`run-mcp-tests.sh`** - MCP-specific test suite
- **`test-tdd-coach.sh`** - TDD coaching and validation
- **`verify-tdd-integration.sh`** - TDD integration verification
- **`comprehensive-cli-test.sh`** - Full CLI testing suite

### AI/ML Tools (`/scripts/ai-ml/`)

- **`ai-test-generator.mjs`** - Automated test generation
- **`validate-ai-setup.sh`** - AI environment validation
- **`scan-ai-models.sh`** - AI model scanning and validation
- **`optimize-ai-cache.sh`** - AI cache optimization
- **`mlx/`** - MLX-specific tools and utilities

### System Utilities (`/scripts/system/`)

- **`free-ports.sh`** - Port management and cleanup
- **`emergency-pnpm-kill.sh`** - Emergency pnpm process termination
- **`codemap.py`** - Visual codebase mapping tool
- **`enforce-node-version.sh`** - Node.js version enforcement

### Development Workflow (`/scripts/development/`)

- **`tdd-enforcer.sh`** - Enforces TDD practices
- **`pattern-guard.sh`** - Pattern compliance checking
- **`release-gate.sh`** - Release gate validation
- **`comprehensive-demo.sh`** - Full system demonstration

### Performance (`/scripts/performance/`)

- **`perf-check.mjs`** - Performance baseline checking
- **`perf-autotune.mjs`** - Automatic performance tuning
- **`memory-baseline-auto.mjs`** - Automated memory baselining

## 🔧 Usage Guidelines

### Running Scripts

```bash
# Make scripts executable
chmod +x scripts/category/script.sh

# Run bash scripts
./scripts/category/script.sh [options]

# Run Node.js scripts
node scripts/category/script.mjs [options]

# Run Python scripts
python3 scripts/category/script.py [options]
```

### Environment Variables

Most scripts support these environment variables:

- **`CORTEX_OS_HOME`** - Cortex-OS installation directory (auto-detected)
- **`DEBUG`** - Enable debug output (`DEBUG=1`)
- **`VERBOSE`** - Enable verbose logging (`VERBOSE=1`)

### Best Practices

1. **Script Organization**:
   - Scripts are categorized by function and domain
   - Use descriptive filenames that indicate purpose
   - Include proper shebang lines for executable scripts

2. **Script Documentation**:
   - Each script includes a header comment explaining its purpose
   - Required arguments and environment variables are documented
   - Usage examples provided where appropriate

3. **Error Handling**:
   - Scripts include proper error handling and logging
   - Exit codes follow standard conventions (0=success, non-zero=error)
   - Failed operations are logged with context

4. **Portability**:
   - Scripts work across macOS and Linux
   - Paths are relative to script location or use `$CORTEX_OS_HOME`
   - Dependencies are minimal and well-documented

## 🔄 Migration Notes

The following scripts were moved during reorganization (October 2025):

- Memory-related scripts → `/scripts/memory/`
- Testing scripts → `/scripts/testing/`
- AI/ML scripts → `/scripts/ai-ml/`
- System utilities → `/scripts/system/`
- Development workflow tools → `/scripts/development/`
- Performance tools → `/scripts/performance/`
- Outdated scripts → `/scripts/legacy/`

If you have scripts referencing the old paths, please update them accordingly.

## 🤝 Contributing

When adding new scripts:

1. Choose the appropriate category directory
2. Follow the existing naming conventions
3. Include proper documentation and error handling
4. Test scripts across different environments
5. Update this README if adding a new category

## 📞 Support

For script-related issues:
- Check the script's help text (`script.sh --help`)
- Review the script header for usage information
- Create an issue in the Cortex-OS repository
- Join the `#scripts` channel in our Discord
