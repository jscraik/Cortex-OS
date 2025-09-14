---
title: Best Practices
sidebar_label: Best Practices
---

# Best Practices

- Use HTTPS endpoints to protect payloads in transit.
- Tune `--rate` and `--queue-limit` based on downstream capacity.
- Monitor stderr logs for dropped messages when using non-blocking strategies.
- Run the bridge as a dedicated process to avoid interfering with client stdout.
