# Cortex-OS Architecture

This section contains comprehensive documentation about the Cortex-OS system architecture, design decisions, and integration patterns.

## 📋 Architecture Documents

### Core Architecture
- **System Overview** (`architecture.mmd`) - Visual architecture diagram
- **System Image** (`architecture.png`) - Architecture diagram image
- **Agent Toolkit Integration** (`agent-toolkit-integration.md`) - Integration guide for agent toolkit
- **Agent Toolkit Resolution** (`agent-toolkit-resolution.md`) - Resolution strategies and patterns
- **Agent Toolkit Review** (`agent-toolkit-review.md`) - Comprehensive review and analysis

### Integration Patterns
- **Archon Integration** (`archon-integration.md`) - Archon system integration details

## 🏗️ Key Architectural Components

### ASBR Runtime
The **Autonomous Software Behavior Reasoning (ASBR)** runtime provides:
- Event-driven agent orchestration
- MCP (Model Context Protocol) integrations
- Strict governance and quality boundaries
- Multi-agent collaboration capabilities

### Communication Patterns
1. **A2A Events** - Agent-to-Agent JSON-RPC 2.0 communication
2. **Service Interfaces** - DI-based contracts via ASBR coordination
3. **MCP Tools** - External integrations and side effects

### Design Principles
- **Event-Driven**: All communication via A2A events
- **Loose Coupling**: No direct cross-package imports
- **Contract-Based**: Well-defined interfaces with Zod validation
- **Governance-First**: Policies enforced via `.cortex/` directory
- **Security-First**: OWASP compliance and capability boundaries

## 🔍 Architecture Navigation

For implementation details, see:
- [Getting Started Guide](../guides/getting-started/)
- [Integration Documentation](../integrations/)
- [Security Implementation](../security/)

For development patterns, see:
- [Coding Standards](../reference/standards/CODING_STANDARDS.md)
- [Build Configuration](../reference/standards/BUILD_CONFIGURATION_STANDARDS.md)