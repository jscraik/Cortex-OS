# Cortex-OS Documentation

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

Welcome to the Cortex-OS documentation hub. Cortex-OS is an **Autonomous Software Behavior Reasoning (ASBR) Runtime** that enables AI agents to collaborate through event-driven architecture and Model Context Protocol (MCP) integrations.

## 📚 Documentation Structure

### 🚀 Getting Started
- [Installation & Setup](guides/getting-started/development-setup.md)
- [Cortex CLI Upgrade Guide](guides/getting-started/README-CORTEX-CLI-UPGRADE.md)
- [OpenAI Agents SDK Sessions Primer](guides/getting-started/openai-agents-sessions.md)
- [Docker Configuration](guides/configuration/docker-setup.md)
- [TDD Enforcement Guide](guides/tdd/tdd-enforcement-guide.md)
- [Context Engineering Primer](guides/context/context-engineering-primer.md) — Selection → Compression → Provenance playbook.

### 🏗️ Architecture
- [System Architecture Overview](architecture/README.md)
- [Agent Toolkit Integration](architecture/agent-toolkit-integration.md)
- [Agent Toolkit Resolution](architecture/agent-toolkit-resolution.md)
- [Agent Toolkit Review](architecture/agent-toolkit-review.md)
- [Archon Integration](architecture/archon-integration.md)

### 🔧 Reference & Standards
- [Build Configuration Standards](reference/standards/BUILD_CONFIGURATION_STANDARDS.md)
- [Coding Standards](reference/standards/CODING_STANDARDS.md)
- [Code Quality Guidelines](reference/standards/code-quality.md)
- [Evaluation Gates](reference/standards/evals-and-gates.md)
- **TypeScript Build System**
  - [TypeScript Build Guide](typescript-build-guide.md) — Project references, incremental compilation, and best practices
  - [TypeScript Configuration Troubleshooting](troubleshooting/typescript-config.md) — Common issues and solutions

### 🛠️ CLI & Tools
- [CLI Comparison](reference/cli/cli-comparison.md)
- [CLI Tools Integration](reference/cli/cli-tools-integration.md)
- [Development Tools Reference](reference/cli/dev-tools-reference.md)
- [Cortex Code Model Picker](reference/cli/cortex-code-model-picker.md)

### 🔌 Integrations
- **MCP (Model Context Protocol)**
  - [User Guide](integrations/mcp/brainwav-cortex-mcp-user-guide.md)
  - [Security Audit](integrations/mcp/mcp.audit.md)
  - [Fix Plan](integrations/mcp/mcp.fix-plan.md)
  - [Security Score](integrations/mcp/mcp.security-score.md)

- **Python & ML**
  - [AI Models Status](integrations/python/AI_MODELS_STATUS_FINAL.md)
  - [Cortex-Py MLX Servers Plan](integrations/python/cortex-py-mlx-servers-plan.md)
  - [External SSD Model Setup](integrations/python/EXTERNALSSD_MODEL_SETUP.md)
  - [Corrected Models Guide](integrations/python/EXTERNALSSD_MODELS_CORRECTED.md)

- **Cloud Services**
  - [Cloudflare Tunnel Setup](integrations/cloud-services/CLOUDFLARE_TUNNEL.md)
  - [Port Configuration Summary](integrations/cloud-services/cloudflare-tunnel-ports-summary.md)

### 🔒 Security
- **Implementation**
  - [OAuth Implementation Summary](security/implementation/oauth-implementation-summary.md)
  - [OAuth Provider Setup](security/implementation/oauth-provider-setup.md)

### 👥 Community
- [Agent Guidelines](community/AGENTS.md)
- [Claude Instructions](community/CLAUDE.md)

### 📊 Project Management
- **Planning**
  - [AGUI Integration](project/planning/agui-integration.md)
  - [Docusaurus Migration Plan](project/planning/docusaurus-migration-plan.md)
  - [Data Sanitization](project/planning/data-sanitization.md)

## 🎯 Key Concepts

### ASBR Runtime
Cortex-OS implements an **Autonomous Software Behavior Reasoning** runtime that:
- Orchestrates AI agents through event-driven architecture
- Provides secure MCP integrations for external tooling
- Maintains strict governance and quality boundaries
- Enables multi-agent collaboration via A2A communication

### Architecture Principles
1. **Event-Driven**: All inter-package communication via A2A events
2. **Loose Coupling**: No direct cross-package imports enforced by linting
3. **Contract-Based**: Well-defined interfaces with Zod validation
4. **Governance-First**: All behavior governed by `.cortex/` policies
5. **Security-First**: OWASP compliance and capability boundaries

### Development Workflow
1. **Research**: Use semantic search to find existing patterns
2. **Planning**: Create TDD plans based on requirements
3. **Implementation**: Execute with red-green-refactor cycle
4. **Verification**: Run quality gates and validate structure

## 🔍 Quick Links

### Development Commands
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests with coverage
pnpm test:coverage

# Security scanning
pnpm security:scan

# Structure validation
pnpm structure:validate
```

### Quality Gates
- **Coverage**: 90% minimum threshold
- **Security**: Semgrep OWASP compliance
- **Structure**: Import boundary validation
- **Documentation**: Consistent markdown standards

## 📝 Contributing to Documentation

When adding documentation:
1. Choose the appropriate category directory
2. Follow the existing naming conventions
3. Include proper cross-references
4. Test internal links
5. Update this README if adding a new category

## 🤝 Getting Help

- Check existing documentation in relevant sections
- Review the architecture guide for system design
- Consult package READMEs for specific functionality
- Join our community discussions

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Maintainer**: Cortex-OS Team