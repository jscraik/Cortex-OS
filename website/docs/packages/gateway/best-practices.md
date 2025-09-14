---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Run behind a reverse proxy such as Nginx for TLS termination and rate limiting.
- Validate all incoming payloads using the provided Zod schemas.
- Enable Prometheus metrics in production to monitor latency and error rates.
- Use environment variables rather than hardcoding credentials.
