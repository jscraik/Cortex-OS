---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Keep the API server bound to `127.0.0.1` unless a reverse proxy handles TLS.
- Rotate tokens regularly and revoke unused ones.
- Store configuration under version control when possible but exclude secrets.
- Use the diff generator to validate artifact changes before applying them.
