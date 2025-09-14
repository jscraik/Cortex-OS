---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Use short-lived certificates (`CERT_TTL` ≤ 1h).
- Rotate workload identities on deployment.
- Validate all CloudEvents against trusted schemas.
- Restrict SPIRE socket permissions to the service user.
- Monitor security telemetry for anomalous activity.
