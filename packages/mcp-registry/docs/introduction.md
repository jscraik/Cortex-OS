# Introduction

The MCP Registry is a lightweight library that tracks Machine Control Protocol (MCP) servers.
It centralizes server metadata so clients can discover available servers without manual setup.

## Problems solved

- Provides a single source of truth for server manifests.
- Validates data structures with [Zod](https://zod.dev).
- Persists records to the filesystem for offline access.
