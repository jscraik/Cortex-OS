---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Treat the registry file as ephemeral; rebuild it during deployments rather than committing to VCS.
- Cache results of `readAll` if listing servers frequently.
- Validate custom server metadata with the provided schemas before calling `upsert`.
