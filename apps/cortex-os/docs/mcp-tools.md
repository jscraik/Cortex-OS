# Cortex-OS MCP Tools

## Overview

This document describes the Model Context Protocol (MCP) tools exposed by the `cortex-os` application. Tools are grouped into three domains:

1. System Management (`system.*`)
2. Service Orchestration (`orchestration.*`)
3. Configuration Management (`config.*`)

Each tool defines validated input and output schemas (Zod) and returns either a successful output or a standard error object:

```json
{
  "error": {
    "code": "validation_failed|not_found|forbidden|rate_limited|internal_error",
    "message": "Human readable description",
    "details": { "optional": "structured context" }
  }
}
```

## Tool Catalog

### system.status

Returns service status and optionally resource metrics.

- Secure: No
- Input Schema:

```ts
{ include?: ('services'|'resources'|'uptime'|'version')[] }
```

- Output Schema (selected fields based on `include`):

```ts
{ services?: { name: string; status: 'running'|'stopped'|'degraded'; version?: string }[]; resources?: { cpu?: number; memoryMB?: number; load?: number }; uptimeSec?: number; version?: string }
```

### system.restart_service

Restart a managed service (stub implementation currently).

- Secure: Yes (requires `CORTEX_MCP_ALLOW_MUTATIONS=true`)
- Input:

```ts
{ service: string; mode?: 'graceful'|'force'; timeoutMs?: number }
```

- Output:

```ts
{ service: string; previousStatus: string; newStatus: string; durationMs: number; mode: 'graceful'|'force' }
```

### system.resources

Sample quick resource metrics.

- Input: `{ sampleWindowSec?: number }`
- Output:

```ts
{ cpu: number; memory: { usedMB: number; totalMB: number }; loadAvg: [number,number,number] }
```

### orchestration.run_workflow

Initiate a workflow execution.

- Input:

```ts
{ workflow: string; input?: Record<string,unknown>; traceId?: string; async?: boolean }
```

- Output (async=true queued):

```ts
{ workflow: string; runId: string; status: 'queued'|'running'|'completed'|'failed'; startedAt: string; finishedAt?: string; result?: unknown; error?: Error }
```

### orchestration.get_workflow_status

Retrieve status for a run id.

- Input: `{ runId: string }`
- Output: Same shape as `run_workflow` result object.

### orchestration.list_workflows

List available workflows (cached 10s).

- Input: `{ limit?: number }`
- Output:

```ts
{ workflows: { id: string; name: string; description?: string; version?: string }[] }
```

### config.get

Get a configuration value checking runtime overrides then env.

- Input: `{ key: string }`
- Output: `{ key: string; value: unknown; source?: 'env'|'file'|'runtime'|'default' }`

### config.set

Set a runtime configuration value (secure).

- Input: `{ key: string; value: unknown; scope?: 'runtime' }`
- Output: `{ key: string; previous?: unknown; value: unknown; scope: 'runtime' }`

### config.list

List configuration items (cached 5s).

- Input: `{ prefix?: string; limit?: number }`
- Output: `{ items: { key: string; value: unknown; source?: string }[] }`

## Security

Secure tools require enabling the environment variable:

```bash
CORTEX_MCP_ALLOW_MUTATIONS=true
```

## Rate Limiting

Per-tool burst limit: 50 calls / 10s window (in-memory). Exceeding returns `rate_limited` error.

## Caching

Tools with `cacheTtlMs` (list workflows, list config) use an in-memory TTL cache keyed by tool + input JSON.

## Audit Events

Each invocation emits an audit object to the optional `audit` dependency:

```ts
{ tool, outcome: 'success'|'validation_error'|'error', durationMs, ts, ...meta }
```

## Error Codes

| Code | Meaning |
|------|---------|
| not_found | Unknown tool name |
| validation_failed | Input schema validation failed |
| forbidden | Security policy blocked tool |
| rate_limited | Rate limiter exceeded |
| internal_error | Unhandled failure occurred |

## Examples

Fetch system status:

```ts
await mcp.callTool('system.status', {});
```

Restart a service (requires mutations enabled):

```ts
await mcp.callTool('system.restart_service', { service: 'memories', mode: 'graceful' });
```

List configuration items with prefix:

```ts
await mcp.callTool('config.list', { prefix: 'CORTEX_' });
```

Run workflow synchronously:

```ts
await mcp.callTool('orchestration.run_workflow', { workflow: 'wf.cleanup', async: false });
```

## Future Enhancements

- Real orchestration engine integration (state persistence)
- Pluggable rate limiter & distributed cache
- Persistent audit log via A2A event bus
- Fine-grained RBAC for secure tools
- Structured tracing for each tool execution span
