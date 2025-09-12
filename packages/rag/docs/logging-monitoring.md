# Logging & Monitoring

## Logging
Set `RAG_LOG_LEVEL=debug` to emit verbose logs. The package uses `console` by default; plug in a logger by overriding methods on `RAGPipeline`.

## Metrics
Expose custom metrics by timing `ingest` and `retrieve` operations and forwarding durations to your monitoring system (e.g., Prometheus).

## Traceability
Tag documents with identifiers in metadata to correlate logs with original sources.
