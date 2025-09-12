# Logging & Monitoring

Enable debug logs via `DEBUG=@cortex-os/security:*`.

Integrate with OpenTelemetry by exporting spans from security events:

```typescript
import { trace } from '@opentelemetry/api';
const span = trace.getActiveSpan();
span?.addEvent('security.audit', { action: 'login' });
```
