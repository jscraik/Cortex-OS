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

const client = new SpiffeClient({ socketPath: '/tmp/spire-agent/public/api.sock', trustDomain: 'cortex-os.local' });
const identity = await client.fetchWorkloadIdentity();
const mtls = new MTLSManager(identity);
const emitter = new SecurityEventEmitter({ registry, policyRouter });
await emitter.emit({ type: 'security.audit', data: { action: 'login' } });

```