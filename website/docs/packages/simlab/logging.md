---
title: Logging
sidebar_label: Logging
---

# Logging & Monitoring

SimLab outputs structured logs to stdout. Redirect logs to files or observability tools as needed:
```bash
pnpm simlab:smoke &gt; simlab.log
```
For advanced monitoring, integrate with existing log collectors and add custom metrics based on `SimResult` summaries.
