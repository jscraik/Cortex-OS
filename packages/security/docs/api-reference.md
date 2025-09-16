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

## Security MCP Tools

### `security_access_control`

Evaluates a subject, resource, and action tuple using Cortex's zero-trust
policies. Returns a structured decision with risk scoring.

**Input (JSON Schema excerpt)**

| Field | Type | Notes |
| --- | --- | --- |
| `subject.id` | `string` | Required principal identifier |
| `subject.roles` | `string[]` | Include security roles such as `security-admin` |
| `resource.id` | `string` | Required target identifier |
| `resource.sensitivity` | `"public" \| "internal" \| "confidential" \| "restricted"` | Defaults to `internal` |
| `action` | `string` | Operation being evaluated |
| `context.environment` | `"development" \| "staging" \| "production"` | Optional runtime context |

**Response payload**

```json
{
  "allowed": true,
  "effect": "allow",
  "riskScore": 80,
  "decisions": [
    {
      "effect": "allow",
      "action": "delete",
      "resourceId": "resource-123",
      "reasons": ["Subject has privileged role security-admin"],
      "score": 80
    }
  ]
}
```

### `security_policy_validation`

Parses and validates JSON, Rego, or Cedar policies. Flags wildcard or
unconditional allow rules and returns a SHA-256 policy hash for auditing.

```typescript
const response = await securityPolicyValidationTool.handler({
  policy: JSON.stringify({ version: '2024-01-01', rules: [...] }),
  format: 'json'
});
```

### `security_audit`

Aggregates audit events and produces evidence-friendly summaries.

- Filters by severity, action, and time range.
- Returns `summary.denied`, `summary.highSeverity`, and optional evidence
  when `includeEvidence` is `true`.

### `security_encryption`

Wraps AES-256-GCM encryption/decryption with automatic IV generation and
integrity protection.

```typescript
const encrypted = await securityEncryptionTool.handler({
  operation: 'encrypt',
  data: 'defense-in-depth',
  secret: 'strong-shared-secret'
});
```

### `security_threat_detection`

Scores security telemetry events and emits anomalies when scores exceed
configurable thresholds.

Response fields include:

- `scores`: per-event score between 0-100
- `suspiciousEvents`: events with scores ≥ `thresholds.anomalyScore`
- `aggregate.max` and `aggregate.mean` for observability
