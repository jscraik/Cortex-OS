# Performance & Benchmarking

- Reuse the `GithubClient` to benefit from connection pooling.
- Parallelize independent requests with `futures::join`.
- Use conditional requests with ETags to reduce payload size.
