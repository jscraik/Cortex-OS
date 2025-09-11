# API Reference

## `SpiffeClient`

Fetches SVIDs from SPIRE.

```typescript
const client = new SpiffeClient({ socketPath, trustDomain });
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
const mtls = new MTLSManager(identity);
const tlsOptions = await mtls.createServerOptions();
```

## `SecurityEventEmitter`

Emits CloudEvents after contract validation.

```typescript
const emitter = new SecurityEventEmitter({ registry, policyRouter });
await emitter.emit(event);
```
