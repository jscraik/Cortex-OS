---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Basic Event Audit

```typescript
import {
  SpiffeClient,
  MTLSManager,
  SecurityEventEmitter,
} from '@cortex-os/security';

const client &#61; new SpiffeClient({ socketPath: '/tmp/spire-agent/public/api.sock', trustDomain: 'cortex-os.local' });
const identity &#61; await client.fetchWorkloadIdentity();
const mtls &#61; new MTLSManager(identity);
const emitter &#61; new SecurityEventEmitter({ registry, policyRouter });
await emitter.emit({ type: 'security.audit', data: { action: 'login' } });
```
