# Troubleshooting

## Neo4j Connection Fails
Ensure the database is running and `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` are correct.

## Qdrant Not Reachable
Check container ports (default 6333) and network firewalls.

## Embeddings Timeout
Increase `MEMORIES_EMBEDDER_TIMEOUT` or verify the MLX/Ollama services are responsive.

## Missing Policies
If a namespace is undefined, the default policy applies. Define policies in `readiness.yml` or code to avoid surprises.

## MCP tool returns `validation_error`
- Inspect the `error.details` array in the response payload; each entry names the invalid path.
- For `memory_store`, ensure `text` is non-empty after trimming, below the 8,192 character limit, and that no more than 32 tags are supplied.
- For `memory_update`, include at least one of `text`, `tags`, or `metadata`—an empty body triggers the error.
- For `memory_retrieve`, provide a positive integer `limit`; zero or negative values are rejected.
- Verify metadata payloads respect depth (≤4), key count (≤50), and overall size (≤8 KB) constraints.

## Metadata triggers `security_error`
- Remove keys such as `__proto__`, `constructor`, or any field starting with `__`; they are blocked to prevent prototype pollution.
- Ensure metadata objects inherit from `Object.prototype` (or `null`). Objects created via custom classes or Maps/Set instances will be rejected.
- Normalise metadata before passing it to the tool to avoid accidental symbol keys or nested functions.

## Received `internal_error` from MCP tool
- Use the `metadata.correlationId` from the response to locate the matching `console.error` entry in server logs.
- Review any custom wrappers layered on top of the packaged handlers—exceptions thrown there will surface as `internal_error`.
- Confirm that environment variables (database URLs, embedder configuration) are set; downstream connection failures bubble up as internal errors.
- Retry after remediation; if the failure is deterministic, open an issue with the captured correlation ID and stack trace.

## Retrieval or stats responses look like placeholders
Current handlers return stub data so teams can validate contracts ahead of full persistence wiring.
- Wrap the exported `handler` function in your own handler and call the real `MemoryService` implementation to produce authoritative results.
- Keep the response envelope (success/error structure and metadata) intact so downstream clients continue to parse results correctly.
- Once storage integration lands, remove temporary wrappers to avoid duplicate writes or conflicting telemetry.
