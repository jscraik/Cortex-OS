---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

Use custom logging by listening to kernel events:

```ts
kernel.on('state', (s) =&gt; console.log('state', s));
```

Integrate with observability tools by forwarding events to your logging backend.
