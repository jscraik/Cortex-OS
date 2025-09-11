# Best Practices

- Run the server behind TLS termination or use `--ssl` options when available.
- Store secrets in environment variables or secret managers, never in source control.
- Prefer asynchronous providers for improved throughput.
- Monitor resource usage and configure circuit breakers with `tenacity` and `pybreaker`.
