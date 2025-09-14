---
title: Security
sidebar_label: Security
---

# Security

- Store tokens using secret managers; avoid committing them.
- All requests use HTTPS. Verify certificates when overriding `GITHUB_API_URL`.
- Webhook verification relies on HMAC SHA-256 and shared secrets.
