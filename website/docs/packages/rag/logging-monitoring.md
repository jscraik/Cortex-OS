---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

## Logging
Set `RAG_LOG_LEVEL&#61;debug` to emit verbose logs. The package uses `console` by default; plug in a logger by overriding methods on `RAGPipeline`.

## Metrics
Expose custom metrics by timing `ingest` and `retrieve` operations and forwarding durations to your monitoring system (e.g., Prometheus).

## Traceability
Tag documents with identifiers in metadata to correlate logs with original sources.
