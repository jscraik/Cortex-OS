# Performance & Benchmarking

Validation is CPU bound. For high throughput:

- Reuse parsed schemas instead of recreating them.
- Prefer `safeParse` to avoid exceptions.
- Benchmark with `node --prof` or [Vitest benchmarks](https://vitest.dev/guide/benchmark.html).
