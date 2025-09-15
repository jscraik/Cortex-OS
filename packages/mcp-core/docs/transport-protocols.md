# MCP Transport Protocols

Model Context Protocol (MCP) messages share a common envelope regardless of the transport that
carries them. Tool invocations MUST comply with the JSON schemas defined in
`packages/mcp-core/src/tool-schemas.ts`:

- **Tool requests** use the `toolRequestSchema` definition (JSON-RPC 2.0 request with `method:
  "tools/call"`).
- **Tool responses** MUST match `toolResponseSchema` with a non-empty `result.content` array and
  optional structured metadata.
- **Tool error responses** MUST match `toolErrorSchema`, returning JSON-RPC error envelopes with
  integer error codes and human-readable messages.

The sections below describe transport-specific concerns and lifecycle phases.

## stdio Transport

The stdio transport targets child processes that read/write UTF-8 encoded JSON lines over their
standard streams.

### Lifecycle

1. The host process spawns the MCP server binary with the configured command and arguments.
2. Environment variables defined in `ServerInfo.env` are merged into the child environment.
3. The host writes serialized JSON-RPC requests followed by a `\n` delimiter to the child's stdin.
4. The child emits JSON-RPC responses on stdout, also newline delimited. stderr is reserved for
   diagnostics and MUST NOT contain protocol frames.
5. Either side can terminate the session by closing its corresponding stream handles.

### Framing & Flow Control

- Frames MUST be individual JSON objects; chunked/partial writes are disallowed.
- Hosts SHOULD buffer writes to avoid interleaving frames when multiple requests are in flight.
- Readers MUST trim trailing whitespace and ignore blank lines before JSON parsing.

### Error Handling

- If JSON parsing fails, hosts SHOULD emit a `toolErrorSchema` compliant response and optionally log
  the offending payload for auditability.
- Broken pipes or unexpected EOF MUST transition the client into a terminal "closed" state and
  reject any outstanding requests with a `ClientClosedError` equivalent.

## HTTP Transport

The HTTP transport wraps each tool invocation in an HTTP POST request.

### Request

- Method: `POST`
- Headers:
  - `Content-Type: application/json`
  - Optional custom headers defined in `ServerInfo.headers`
- Body: JSON payload conforming to `toolRequestSchema`

### Response

- Status `200` MUST carry a JSON body that validates against `toolResponseSchema`.
- Status `4xx` or `5xx` SHOULD carry a `toolErrorSchema` payload. When not possible, clients wrap the
  HTTP error code inside a synthetic MCP error response.
- Servers SHOULD respond within the configured timeout window to avoid client-side aborts.

### Connection Management

- HTTP/1.1 keep-alive is RECOMMENDED for sequential tool calls to reduce latency.
- Servers MUST reject unsupported methods with `405 Method Not Allowed`.
- TLS SHOULD be enabled for networked deployments; clients inherit trust settings from the runtime
  environment.

## Server-Sent Events (SSE) Transport

SSE enables unidirectional streaming responses from server to client while reusing HTTP semantics.

### Handshake

1. Client issues a `POST` tool invocation identical to the HTTP transport.
2. Server responds with status `200` and header `Content-Type: text/event-stream`.
3. The response body emits a sequence of SSE events until the tool call completes.

### Event Semantics

- `event: result` frames MUST contain data fields that parse into partial
  `toolResponseSchema.result` fragments. Each chunk SHOULD include `content` updates for incremental
  rendering.
- A final `event: complete` MUST deliver a terminal payload that validates against
  `toolResponseSchema`.
- `event: error` MUST contain a payload matching `toolErrorSchema` and closes the stream.
- Keep-alive comments (`: heartbeat`) SHOULD be sent at regular intervals (<30s) to keep proxies
  from timing out the connection.

### Client Responsibilities

- Reassemble streamed fragments into a full `toolResponseSchema` payload before returning control to
  callers.
- Abort the `fetch` request when local timeouts expire and translate the condition into a
  `toolErrorSchema` error.

## WebSocket (WS) Transport

The WebSocket transport provides bidirectional streaming suitable for concurrent tool invocations.

### Connection Flow

1. Client opens a WebSocket connection to the configured endpoint.
2. Upon `open`, the client marks the transport as ready and begins accepting tool invocations.
3. Each request is framed as a JSON object containing `id`, `name`, and optional `arguments` and sent
   via `socket.send`.
4. The server responds with JSON objects that validate against either `toolResponseSchema` or
   `toolErrorSchema`, echoing the original `id`.

### Ordering & Concurrency

- Clients MUST maintain a monotonic request ID counter to correlate responses.
- Outstanding requests are tracked until a corresponding response or close frame arrives.
- Servers MAY send unsolicited `ping` or `notification` frames; clients SHOULD ignore unknown
  messages and continue processing.

### Error Semantics

- Connection drops MUST reject all pending promises with a terminal error.
- Protocol-level errors are encoded using `toolErrorSchema` payloads.
- Servers SHOULD send close frames with appropriate close codes (e.g., `1011` for internal errors).

## Protocol Compliance Checklists

### Shared Requirements

- [ ] JSON payloads validate against `toolRequestSchema`, `toolResponseSchema`, or
      `toolErrorSchema` as appropriate.
- [ ] All responses echo the originating JSON-RPC `id`.
- [ ] `toolErrorSchema.error.message` provides actionable feedback.
- [ ] Timeouts and retries respect the host's `requestTimeoutMs` configuration.
- [ ] Sensitive data is redacted before logging protocol frames.

### stdio Checklist

- [ ] Child process inherits required environment variables.
- [ ] Frames are newline-delimited UTF-8 JSON objects.
- [ ] stderr output is isolated from protocol streams.
- [ ] Transport shuts down cleanly on EOF or process exit.

### HTTP Checklist

- [ ] Requests use `POST` with `Content-Type: application/json`.
- [ ] Non-200 responses translate into MCP error payloads.
- [ ] HTTP client honours keep-alive and timeout settings.
- [ ] TLS certificates are validated for remote endpoints.

### SSE Checklist

- [ ] Responses set `Content-Type: text/event-stream` and disable HTTP buffering.
- [ ] Streamed events include terminal `result` or `error` markers.
- [ ] Heartbeat comments are emitted periodically for long-lived operations.
- [ ] Client concatenates streamed fragments into a single MCP result.

### WebSocket Checklist

- [ ] Client rejects tool calls if the socket is not open.
- [ ] Each outbound frame includes an incrementing numeric ID.
- [ ] Responses are matched to requests and removed from the pending map.
- [ ] Close frames and errors propagate to callers as MCP error payloads.
