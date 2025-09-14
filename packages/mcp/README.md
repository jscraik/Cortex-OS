# MCP (Model Context Protocol) Packages

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Coverage Status](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](coverage)

## Overview

The MCP packages provide a complete implementation of the Model Context Protocol, enabling standardized communication between AI models and tools. These packages are designed for production use with strict memory management and comprehensive test coverage.

## Packages

### [@cortex-os/mcp-core](file:///Users/jamiecraik/.Cortex-OS/packages/mcp-core)

Minimal building blocks for the Model Context Protocol with TypeScript implementation.

### [@cortex-os/mcp-registry](file:///Users/jamiecraik/.Cortex-OS/packages/mcp-registry)

File-system backed registry for managing MCP server configurations.

### [@cortex-os/mcp-bridge](file:///Users/jamiecraik/.Cortex-OS/packages/mcp-bridge)

Stdio ↔ HTTP/SSE bridge for MCP transports with rate limiting.

### [mcp](file:///Users/jamiecraik/.Cortex-OS/packages/mcp)

Complete Python implementation of the Model Context Protocol.

## Memory Management

To prevent memory issues during development and testing:

1. Use the MCP-aware memory manager:

   ```bash
   ./scripts/memory-manager-mcp.sh --gentle
   ```

2. Run tests with memory constraints:

   ```bash
   ./scripts/run-mcp-tests.sh all
   ```

3. For coverage reports:

   ```bash
   ./scripts/run-mcp-tests.sh all true
   ```

## Docker Deployment

Deploy MCP services using the dedicated Docker Compose configuration:

```bash
docker-compose -f docker/docker-compose.mcp.yml up
```

## Test Coverage

All MCP packages maintain 90%+ test coverage:

- `mcp-core`: 94%+ coverage
- `mcp-registry`: 94%+ coverage  
- `mcp-bridge`: 94%+ coverage
- `mcp`: 90%+ coverage

## Development Guidelines

1. Always run tests with memory constraints
2. Use the TDD approach (Red → Green → Refactor)
3. Maintain 90%+ test coverage
4. Follow the contract-driven modular architecture principles
5. Ensure cross-package compatibility

## Quality Gates

All changes must pass:

- Unit tests with 90%+ coverage
- Integration tests
- Security scanning
- Code quality checks
- Memory usage validation

## License

Apache 2.0
