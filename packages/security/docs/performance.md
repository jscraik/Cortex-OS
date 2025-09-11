# Performance & Benchmarking

Use Node's built-in benchmark runner to measure mTLS overhead:

```bash
node --test benchmark
```

Keep TLS handshakes under 5ms and memory usage below 50MB per service.
