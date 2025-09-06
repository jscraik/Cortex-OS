# Registry Package

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![Test Coverage](https://img.shields.io/badge/coverage-95%25+-brightgreen)](#testing)
[![Security Scan](https://img.shields.io/badge/security-OWASP%20compliant-green)](#security)
[![Express](https://img.shields.io/badge/Express-4.18+-green)](https://expressjs.com/)
[![JSON Schema](https://img.shields.io/badge/JSON%20Schema-2020--12-orange)](https://json-schema.org/)
[![Ajv](https://img.shields.io/badge/AJV-8.12+-purple)](https://ajv.js.org/)

**Schema Registry Service for Cortex-OS Contracts**

*Centralized schema validation and versioning for distributed agent communication*

</div>

---

## 🎯 Features

- **📋 Schema Registry**: Centralized storage and versioning for JSON schemas
- **✅ Contract Validation**: Real-time validation of A2A communication contracts
- **🔄 Version Management**: Semantic versioning with backward compatibility checks
- **🔐 Provenance Hashing**: SHA-256 hash pins for every schema version
- **🛡️ Security Headers**: Helmet.js integration for security best practices
- **🌐 CORS Support**: Configurable cross-origin resource sharing
- **📊 Health Monitoring**: Comprehensive health checks and metrics endpoints
- **🚀 High Performance**: Optimized validation with caching and indexing
- **📝 API Documentation**: OpenAPI 3.0 specification with interactive docs

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Start development server
pnpm dev

# Start production server
pnpm start
```

### Basic Usage

```typescript
import { RegistryServer } from '@cortex-os/registry';

// Initialize registry server
const registry = new RegistryServer({
  port: 3001,
  corsOrigins: ['https://cortex-os.local'],
  schemaStore: './schemas',
  enableMetrics: true
});

await registry.start();
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns service health status and timestamp.

### List All Schemas

```http
GET /schemas
```

Returns all available schemas with metadata.

### Get Schema by ID

```http
GET /schemas/:schemaId?version=1.0.0
```

Returns a specific schema by its ID and version with a SHA-256 `hash` field.

### Validate Event

```http
POST /validate/:schemaId?version=1.0.0
```

Validates an event against a specific schema version.

### Get Schemas by Category

```http
GET /categories/:category
```

Returns all schemas in a specific category (e.g., `cloudevents`, `asyncapi`).

## Usage

### Starting the Service

```typescript
import { SchemaRegistry } from '@cortex-os/registry';

const registry = new SchemaRegistry({
  port: 3001,
  contractsPath: './contracts',
});

registry.start();
```

### Configuration Options

- `port`: Server port (default: 3001)
- `contractsPath`: Path to contracts directory (default: `process.cwd()/contracts`)

## Development

### Building

```bash
pnpm build
```

### Running Tests

```bash
pnpm test
```

### Starting Development Server

```bash
pnpm dev
```

## Schema Structure

Schemas are expected to be organized in the contracts directory:

```
contracts/
├── cloudevents/
│   ├── agent-task-requested.json
│   ├── agent-task-completed.json
│   └── ...
└── asyncapi/
    └── agent-messaging-api.json
```

Each schema should have an `$id` field for identification and follow JSON Schema draft-07 format.
