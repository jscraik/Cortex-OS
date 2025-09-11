# Introduction

`@cortex-os/mcp-core` supplies shared primitives for clients and servers implementing the Model Context Protocol (MCP).
It focuses on reliable tool invocation over HTTP or stdio and schema-validated configuration.

## Problems It Solves

- Normalizes server configuration using `ServerInfo` schema.
- Provides a small client abstraction for tool calls.
- Ensures runtime validation with Zod to reduce integration errors.
