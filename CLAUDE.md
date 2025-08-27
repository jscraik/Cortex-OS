# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Cortex-OS is an **Autonomous Software Behavior Reasoning (ASBR) Runtime** - a governed monorepo implementing AI agent capabilities with strict architectural boundaries and comprehensive testing. The system follows event-driven architecture with A2A (Agent-to-Agent) communication patterns and MCP (Model Context Protocol) integrations.

## Architecture

### ASBR Runtime Structure
- **Location**: `apps/cortex-os/`
- **Role**: Main application runtime that orchestrates feature packages
- **Entry**: `apps/cortex-os/src/index.ts` → `runtime.ts`

### Feature Packages (Domain Logic)
- **Location**: `packages/`
- **Key Packages**:
  - `a2a/` - Agent-to-Agent JSON-RPC 2.0 communication
  - `mcp/` - Model Context Protocol integration and plugin system
  - `orchestration/` - Multi-agent workflow coordination
  - `memories/` - Long-term state management with Neo4j/Qdrant
  - `rag/` - Retrieval-Augmented Generation with embeddings
  - `agents/` - Agent implementations and enhanced behaviors
  - `asbr/` - Core ASBR reasoning logic
  - `simlab-mono/` - Simulation environment for testing

### Communication Patterns
1. **A2A Event Bus** - Async pub/sub messaging via JSON-RPC 2.0
2. **Service Interfaces** - DI-based contracts via ASBR coordination  
3. **MCP Tools** - External integrations and side effects

**Critical**: Direct imports between feature packages are **forbidden** by ESLint rules. Use A2A events or service interfaces.

## Development Commands

### Core Development
```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build all packages
pnpm build
turbo run build

# Build with quality gates
pnpm build:with-gates
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Coverage with thresholds (90% required)
pnpm test:coverage:threshold

# Integration tests
pnpm test:integration

# Security tests
pnpm test:security
pnpm test:security:all

# Launch readiness tests
pnpm test:launch

# MCP-specific tests
pnpm test:gitmcp

# Accessibility tests
pnpm test:accessibility
pnpm test:a11y
```

### Testing Individual Packages
```bash
# Test specific package
turbo run test --filter=@cortex-os/a2a
turbo run test --filter=@cortex-os/mcp

# Single test file
vitest run packages/a2a/tests/specific-test.test.ts
```

### Code Quality
```bash
# Lint and fix
pnpm lint

# Format code
pnpm format

# Security scanning
pnpm security:scan
pnpm security:scan:all

# Structure validation
pnpm structure:validate
```

### MCP (Model Context Protocol)
```bash
# Start MCP server
pnpm mcp:start

# MCP development
pnpm mcp:dev

# MCP smoke tests
pnpm mcp:smoke

# Test MCP functionality
pnpm mcp:test
```

### Simulation Lab
```bash
# Run smoke tests
pnpm simlab:smoke

# Critical system tests  
pnpm simlab:critical

# Full test suite
pnpm simlab:full

# Generate reports
pnpm simlab:report
```

## Package Manager & Build System

- **Package Manager**: `pnpm@10.13.1` (required)
- **Monorepo Tool**: Turbo (configured in `turbo.json`)
- **Workspace**: Defined in `pnpm-workspace.yaml`
- **Node Version**: `>=18.0.0`

### Workspace Structure
```
packages:
  - 'apps/*'           # Applications
  - 'packages/*'       # Shared libraries  
  - 'packages/a2a/a2a-*'     # A2A sub-packages
  - 'packages/mcp/mcp-*'     # MCP sub-packages
  - 'libs/*'           # Framework libraries
  - 'libs/typescript/*' # TypeScript utilities
```

## Import Path Aliases

TypeScript path mapping is configured for clean imports:
```typescript
// A2A packages
import { EventBus } from '@cortex-os/a2a-core/bus';
import { Transport } from '@cortex-os/a2a-transport/fsq';

// MCP packages  
import { McpClient } from '@cortex-os/mcp-core/client';
import { PluginRegistry } from '@cortex-os/mcp-registry/fs-store';

// Feature packages
import { AgentOrchestrator } from '@cortex-os/orchestration/service';
import { MemoryService } from '@cortex-os/memories/service';
import { RAGPipeline } from '@cortex-os/rag/pipeline';
```

## Testing Architecture

### Test Organization
- **Root Config**: `vitest.config.ts` (orchestrates all projects)
- **Workspace Config**: `vitest.workspace.ts` 
- **Package Configs**: Each package has its own `vitest.config.ts`
- **Coverage**: 90% threshold enforced globally

### Test Types
- **Unit**: Package-specific tests in `tests/` directories
- **Integration**: `tests/integration/` - multi-package interactions
- **E2E**: End-to-end scenarios via `test:integration:e2e`
- **Security**: `tests/security/` - OWASP compliance testing
- **Accessibility**: WCAG 2.2 AA compliance testing

### Quality Gates
- **Coverage**: 90% statements/branches/functions/lines required
- **Security**: Semgrep scanning with OWASP rules
- **Type Safety**: TypeScript strict mode (relaxed in base config)
- **Import Boundaries**: ESLint enforced architectural rules

## Security Considerations

### OWASP Compliance
- LLM Top-10 validation in `packages/asbr/src/security/`
- Prompt injection guards in A2A communication
- Input sanitization and output validation
- Security regression testing

### Capabilities & Boundaries
- MCP tools run in sandboxed environments
- Network egress controls for testing (`MCP_NETWORK_EGRESS=disabled`)
- Workload identity and mTLS in production deployments
- Secret management via `packages/a2a/src/security/secure-secret-manager.ts`

## Key Architecture Principles

1. **Event-Driven**: All inter-package communication via A2A events
2. **Loose Coupling**: No direct cross-package imports enforced by linting  
3. **Contract-Based**: Well-defined interfaces with Zod validation
4. **Security-First**: OWASP compliance and capability boundaries
5. **Test-Driven**: Comprehensive coverage with quality gates
6. **Accessibility**: WCAG 2.2 AA compliance throughout

## Development Workflow

1. **Feature Development**: Work in feature packages (`packages/`)
2. **Communication**: Use A2A events for inter-package coordination
3. **Testing**: Write tests first, maintain 90% coverage
4. **Quality**: Run `pnpm lint` and `pnpm format` before commits
5. **Integration**: Test with `pnpm test:integration` 
6. **Security**: Validate with `pnpm test:security`

## Debugging & Troubleshooting

### Common Issues
- **Import Errors**: Check ESLint restricted paths rules in `eslint.config.js`
- **Test Failures**: Review coverage thresholds and missing test configs
- **Build Issues**: Verify Turbo cache with `turbo run build --force`
- **MCP Problems**: Check `pnpm mcp:doctor` and connection configs

### Logs & Monitoring
- Test results: `junit.xml` and `test-results.json` 
- Coverage reports: Generated in `coverage/` directory
- Security reports: `security-reports/` and `atlas-reports/`
- Carbon tracking: `carbon-metrics/` (if enabled)

This architecture enables scalable, maintainable AI agent systems while enforcing clear boundaries and comprehensive quality gates.