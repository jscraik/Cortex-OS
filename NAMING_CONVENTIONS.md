# Cortex-OS Package Naming Conventions

## Overview

This document defines the standardized naming conventions for packages within the Cortex-OS monorepo to ensure consistency and clarity across all components.

## Package Scoping Rules

### 1. Core Packages

- **Scope**: `@cortex-os/*`
- **Purpose**: Core libraries and services that provide fundamental functionality
- **Examples**:
  - `@cortex-os/utils`
  - `@cortex-os/agents`
  - `@cortex-os/a2a`

### 2. Applications

- **Scope**: `@apps/*`
- **Purpose**: Complete applications that serve specific user needs
- **Examples**:
  - `@apps/cortex-os` (main application)
  - `@apps/marketplace` (marketplace application)

### 3. Libraries

- **Scope**: `@libs/*`
- **Purpose**: Shared libraries that can be used across multiple packages
- **Examples**:
  - `@libs/typescript/utils`
  - `@libs/python/helpers`

## Naming Standards

### General Rules

1. All packages must use kebab-case naming (lowercase with hyphens)
2. Package names should be descriptive and concise
3. Avoid abbreviations unless they are widely recognized
4. Use present tense verbs for action-oriented packages

### Specific Patterns

#### A2A (Agent-to-Agent) Packages

- Pattern: `@cortex-os/a2a-*`
- Examples: `@cortex-os/a2a-core`, `@cortex-os/a2a-contracts`

#### MCP (Model Context Protocol) Packages

- Pattern: `@cortex-os/mcp-*`
- Examples: `@cortex-os/mcp-core`, `@cortex-os/mcp-bridge`

#### Service Packages

- Pattern: `@cortex-os/*` (without prefix) for core services
- Examples: `@cortex-os/agents`, `@cortex-os/registry`

## Implementation Guidelines

### Updating Existing Packages

1. When updating package names, ensure all references are updated
2. Update import statements across the codebase
3. Update documentation and README files
4. Verify that all tests still pass

### New Package Creation

1. Follow the appropriate naming pattern based on package type
2. Use the correct scope (`@cortex-os`, `@apps`, or `@libs`)
3. Ensure the package name is unique within its scope

## Validation

- All package names should be validated as part of the CI/CD pipeline
- Use the nx project guard to enforce naming conventions
