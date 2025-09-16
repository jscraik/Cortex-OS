# a2a-services MCP Tools

This document describes the Model Context Protocol (MCP) tools exposed by the `a2a-services` package.
These tools enable service registry, discovery, and management operations for cross-service communication within Cortex-OS.

## Overview

Tools are grouped into three logical categories:

1. Service Registry – creation and retrieval of service versions
2. Service Discovery – locating healthy service endpoints by name or capability
3. Service Management – operational controls (enable/disable, quota, cache purge, metrics)

All tools validate inputs with Zod schemas and return structured text content. Errors follow a standard envelope:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human friendly message", "details": { /* optional */ } } }
```

## Tools

### register_service

Register (or update) a service version.

Input:

```ts
{
  name: string,
  version?: string (default 0.1.0),
  endpoint: string (URL),
  healthCheck?: string (URL),
  metadata?: { description?, capabilities?: string[], tags?: string[], owner?: string },
  replaceExisting?: boolean (default false)
}
```

### get_service

Get a specific service version or the latest.

Input:

```ts
{ name: string, version?: string, includeDisabled?: boolean }
```

### list_services

List services with filtering.

Input:

```ts
{ capability?: string, tag?: string, includeDisabled?: boolean, limit?: number }
```

### discover_service

Discover latest version via name or capability.

Input:

```ts
{ name?: string, capability?: string, healthyOnly?: boolean }
```

### manage_service

Administrative actions.

Input:

```ts
{
  name: string,
  version?: string,
  action: 'enable' | 'disable' | 'set_quota' | 'purge_cache',
  quota?: { limit: number, windowSeconds: number }
}
```

### get_service_metrics

Retrieve counters and quota settings.

Input:

```ts
{ name: string, version?: string }
```

## Error Codes

| Code | Meaning |
| ---- | ------- |
| VALIDATION_ERROR | Input failed schema validation |
| ALREADY_EXISTS | Service version already registered (and replace not specified) |
| NOT_FOUND | Service or version not found |
| DISABLED | Service version is disabled and hidden |
| UNSUPPORTED_ACTION | Action is not recognized |
| RATE_LIMIT | Per-tool rate limit exceeded |
| UNHEALTHY | Health check failed |

## Security & Governance

Current implementation includes placeholders for access control.
Integrate with the security package to enforce scopes or roles.
A simple in-memory rate limiter (60 ops/min per tool) is included; replace with a Redis backed limiter for production.

## Observability

Each service version tracks basic counters (calls/errors). Extend by emitting events to the observability or metrics packages.

## Future Enhancements

1. Persistent backing store (Redis/Postgres)
2. Distributed cache invalidation
3. Capability indexing & advanced queries
4. Health status caching + async background probes
5. Integration with security/audit logging events

## Testing

Unit tests cover:

* Registration & duplicate protection
* Retrieval and listing
* Discovery paths
* Management actions (enable/disable/quota)
* Metrics retrieval

Add integration tests once wired through the global MCP server runtime.
Unit tests cover:

* Registration & duplicate protection
* Retrieval and listing
* Discovery paths
* Management actions (enable/disable/quota)
* Metrics retrieval

Add integration tests once wired through the global MCP server runtime.
