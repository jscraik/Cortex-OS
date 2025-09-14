---
title: Security
sidebar_label: Security
---

# Security

- Use HTTPS termination in front of the gateway to encrypt traffic.
- Restrict access to the `/metrics` endpoint in production.
- Audit logs include request metadata; ensure the log file is write-only and rotated.
- Tokens or API keys required by providers must be supplied via environment variables and not logged.
