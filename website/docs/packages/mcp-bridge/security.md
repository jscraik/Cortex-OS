---
title: Security
sidebar_label: Security
---

# Security

- Prefer HTTPS for all outbound and SSE URLs.
- Do not log sensitive payloads; sanitize before printing.
- Use environment variables or secret stores for tokens.
- Validate incoming SSE events before acting on them.
