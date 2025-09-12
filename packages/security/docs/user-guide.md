# User Guide

## Fetch an Identity

```typescript
const identity = await client.fetchWorkloadIdentity();
```

## Establish mTLS

```typescript
const mtls = new MTLSManager(identity);
const options = await mtls.createServerOptions();
```

## Emit a Security Event

```typescript
await emitter.emit({ type: 'security.audit', data: { action: 'login' } });
```

_No keyboard shortcuts are required; the package exposes a programmatic API only._
