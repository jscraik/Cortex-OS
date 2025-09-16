# MCP Tool Examples (A2A)

This folder contains minimal runnable examples demonstrating how to invoke the
A2A MCP tools directly inside a Node.js environment (simulating an MCP host).

> These scripts call the tool handlers directly; a real MCP host would translate protocol requests to these handlers.

## Scripts

| Script | Description |
| ------ | ----------- |
| `queue-message.ts` | Queue a task/message and print the immediate result. |
| `event-stream-subscribe.ts` | Request a snapshot of task lifecycle events. |
| `outbox-sync.ts` | Invoke outbox synchronization action (placeholder metrics). |
| `composite-sequence.ts` | Sequential demo: queue -> subscribe -> outbox sync. |

## Running

```bash
pnpm ts-node packages/a2a/examples/mcp/queue-message.ts
pnpm ts-node packages/a2a/examples/mcp/event-stream-subscribe.ts
pnpm ts-node packages/a2a/examples/mcp/outbox-sync.ts
pnpm ts-node packages/a2a/examples/mcp/composite-sequence.ts
```

Set `A2A_MCP_SPANS=1` to log lightweight span diagnostics.

```bash
A2A_MCP_SPANS=1 pnpm ts-node packages/a2a/examples/mcp/queue-message.ts
```

## Composite Usage Pattern

The script `composite-sequence.ts` demonstrates chaining tools to simulate a lifecycle:

1. `a2a_queue_message` queues a task.
2. `a2a_event_stream_subscribe` fetches a snapshot of current task states (future: streaming).
3. `a2a_outbox_sync` runs a maintenance action (`dlqStats`).

Run it:

```bash
pnpm ts-node packages/a2a/examples/mcp/composite-sequence.ts
```

With spans:

```bash
A2A_MCP_SPANS=1 pnpm ts-node packages/a2a/examples/mcp/composite-sequence.ts
```
