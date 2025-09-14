---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

- Use `streamableHttp` for low-latency requests.
- Avoid spawning a new stdio process per call; reuse the client.
- Benchmark with Node's `--inspect` and `performance.now()` to measure overhead.
