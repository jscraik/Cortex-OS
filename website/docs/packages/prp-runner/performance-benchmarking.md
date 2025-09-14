---
title: Performance Benchmarking
sidebar_label: Performance Benchmarking
---

# Performance & Benchmarking

Use Node's built-in profiler or `lighthouse` integration to measure performance.

```bash
node --prof scripts/semantic-search-demo.mjs --dir docs
```

Analyze generated logs with `node --prof-process`. Benchmark different adapters to identify bottlenecks.
