---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

## Measure ingestion throughput
```bash
node benchmarks/ingest.js
```
Records docs/sec for batch sizes.

## Profile retrieval latency
Use Node's `--cpu-prof` flag while calling `pipeline.retrieve` and analyze with Chrome DevTools.

## Optimization Tips
- Increase `batchSize` if the embedder supports it.
- Use a persistent vector store for large datasets.
