---
title: Logging
sidebar_label: Logging
---

# Logging & Monitoring

Enable debug logs via `DEBUG&#61;@cortex-os/security:*`.

Integrate with OpenTelemetry by exporting spans from security events:

```typescript
import { trace } from '@opentelemetry/api';
const span &#61; trace.getActiveSpan();
span?.addEvent('security.audit', { action: 'login' });
```
