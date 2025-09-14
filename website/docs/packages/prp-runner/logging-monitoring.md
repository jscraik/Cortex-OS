---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

PRP Runner uses the `debug` package for verbose logs. Enable it via:

```bash
DEBUG=prp-runner:* pnpm -C packages/prp-runner demo:semsearch ...
```

Integrate with external observability platforms by forwarding console output or attaching custom log handlers in your application.
