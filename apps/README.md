# Cortex-OS Applications

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

This directory contains the main applications and user-facing components of the Cortex-OS ecosystem.

## Directory Structure

- `/apps/api/` - REST API server for Cortex-OS services
- `/apps/cortex-cli/` - Command-line interface for Cortex-OS operations
- `/apps/cortex-code/` - Visual Studio Code extension for Cortex-OS integration
- `/apps/cortex-code-backup/` - Backup of the VS Code extension
- `/apps/cortex-code-broken/` - Deprecated/broken VS Code extension version
- `/apps/cortex-codex/` - Code analysis and documentation generation tool
- `/apps/cortex-marketplace/` - Frontend for the Cortex-OS marketplace
- `/apps/cortex-marketplace-api/` - API backend for the marketplace
- `/apps/cortex-os/` - **Main ASBR Runtime** - Coordinates feature packages and provides CLI/HTTP/UI interfaces
- `/apps/cortex-py/` - Python bindings and utilities for Cortex-OS
- `/apps/cortex-webui/` - Web-based user interface for Cortex-OS

## Application Overview

### Core Applications

#### ASBR Runtime (`cortex-os`)

The main application that coordinates feature packages and provides the primary interfaces for Cortex-OS. This is the central orchestrator that mounts feature packages via dependency injection.

#### CLI (`cortex-cli`)

Command-line interface providing direct access to Cortex-OS functionality, including agent management, memory operations, and system administration.

#### Web UI (`cortex-webui`)

Modern web-based interface for interacting with Cortex-OS, featuring real-time monitoring, agent configuration, and system management capabilities.

### Development Tools

#### VS Code Extension (`cortex-code`)

Integration with Visual Studio Code providing IDE features like intelligent code completion, agent integration, and development workflow automation.

#### Codex (`cortex-codex`)

Advanced code analysis and documentation generation tool that leverages Cortex-OS agents for understanding and documenting codebases.

### Integration & APIs

#### REST API (`api`)

RESTful API server exposing Cortex-OS functionality to external applications and services.

#### Marketplace (`cortex-marketplace` & `cortex-marketplace-api`)

Platform for discovering, sharing, and managing Cortex-OS agents, tools, and extensions.

#### Python Bindings (`cortex-py`)

Python libraries and utilities for integrating Cortex-OS with Python-based workflows and applications.

## Architecture Principles

- **Domain Separation**: Applications communicate via A2A events, service interfaces, or MCP tools
- **No Direct Cross-Feature Imports**: Use defined contracts and message passing
- **Dependency Injection**: ASBR runtime manages feature mounting and service wiring
- **Contract-Based Communication**: All inter-application communication uses Zod/JSON schemas

## Getting Started

Each application directory contains its own README with specific setup and usage instructions. For general development workflow:

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build all applications
pnpm build

# Run tests
pnpm test
```

## Related Documentation

- [ASBR Architecture](/apps/cortex-os/README.md)
- [Feature Package Guidelines](/.github/copilot-instructions.md)
- [Agent Development](/../AGENTS.md)
- [Integration Patterns](/packages/README.md)
