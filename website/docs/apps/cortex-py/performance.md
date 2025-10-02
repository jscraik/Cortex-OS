---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

Use the CLI’s verbose flag to measure load times:
```bash
python -m apps.cortex-py.src.mlx.embedding_generator "test" --verbose
```
For repeatable benchmarks, warm caches and run on consistent hardware. Capture embedding latency and throughput for different models.
