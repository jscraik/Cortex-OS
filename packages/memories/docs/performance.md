# Performance & Benchmarking

- Use `MEMORIES_VECTOR_DIM` to match your embedding model's dimension.
- Batch inserts via `batchSize` in `MemoryStore` for higher throughput.
- Profile with Node's `--prof` flag or Chrome DevTools.
- Measure search latency by enabling `enableProgressTracking` and logging durations.
