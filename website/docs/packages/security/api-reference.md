---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

## `SpiffeClient`

Fetches SVIDs from SPIRE.

```typescript
const client &#61; new SpiffeClient({ socketPath, trustDomain });
await client.fetchWorkloadIdentity();
```

## `WorkloadIdentity`

Holds SPIFFE ID and certificates.

```typescript
identity.spiffeId; // string
identity.certChain; // Buffer
```

## `MTLSManager`

Creates TLS contexts and rotates certificates.

```typescript
const mtls &#61; new MTLSManager(identity);
const tlsOptions &#61; await mtls.createServerOptions();
```

## `SecurityEventEmitter`

Emits CloudEvents after contract validation.

```typescript
const emitter &#61; new SecurityEventEmitter({ registry, policyRouter });
await emitter.emit(event);
```
