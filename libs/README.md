# Cortex-OS Libraries

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains shared libraries, contracts, types, and utilities used across the Cortex-OS ecosystem.

## Directory Structure

- `/libs/typescript/` - TypeScript-specific libraries and shared modules
  - `/libs/typescript/contracts/` - Contract definitions and validation schemas
  - `/libs/typescript/types/` - Shared type definitions and interfaces
  - `/libs/typescript/utils/` - Common utility functions and helpers

## Purpose

The libraries directory serves as the foundation for inter-module communication and shared functionality:

- **Contracts**: Define communication interfaces between packages using Zod schemas
- **Types**: Provide consistent type definitions across the codebase
- **Utils**: Offer reusable utility functions that don't belong to specific domains

## Architecture Principles

- **Contract-First Design**: All inter-package communication uses defined contracts
- **Type Safety**: Strong TypeScript typing for all shared interfaces
- **Domain Independence**: Libraries remain domain-agnostic and reusable
- **Schema Validation**: Input/output validation using Zod schemas

## Usage

Libraries are imported by applications and packages to ensure consistent:

- Data structures and interfaces
- Validation logic and schemas
- Utility functions and helpers
- Communication contracts

## Key Components

### Contracts (`/libs/typescript/contracts/`)

JSON Schema and Zod-based contracts that define:

- Agent communication interfaces
- A2A message formats
- Service API contracts
- Data validation rules

### Types (`/libs/typescript/types/`)

Shared TypeScript types including:

- Common data structures
- Interface definitions
- Enum declarations
- Union types

### Utils (`/libs/typescript/utils/`)

Utility functions for:

- Data transformation
- Validation helpers
- Common algorithms
- Helper functions

## Integration

These libraries are referenced throughout the codebase via:

```typescript
import { ContractSchema } from '@cortex-os/contracts';
import { CommonTypes } from '@cortex-os/types';
import { UtilityFunction } from '@cortex-os/utils';
```

## Development Guidelines

- Keep libraries domain-agnostic
- Maintain strong typing
- Use Zod for validation schemas
- Follow consistent naming conventions
- Document all public interfaces

## Related Documentation

- [Package Architecture](/packages/README.md)
- [ASBR Integration](/.github/copilot-instructions.md)
- [Agent Contracts](/../AGENTS.md)
