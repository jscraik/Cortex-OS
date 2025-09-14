---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Use separate namespaces for distinct agents or data domains.
- Enable PII redaction and encryption for sensitive namespaces.
- Prefer MLX embeddings for local privacy; fall back to remote providers only when necessary.
- Monitor storage growth and set TTLs to avoid unbounded retention.
- Write integration tests when adding new providers.
