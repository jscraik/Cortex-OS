# @cortex-os/proof-artifacts

brAInwav proof artifact envelope tooling aligned with SLSA provenance, Sigstore attestation, and Cortex-OS governance.

## Features

- **Proof envelope creation**: Generate SLSA-compliant proof artifacts
- **Sigstore integration**: Sign and verify with real Sigstore trust roots
- **Trust root management**: Automatic fetching and caching of TUF metadata
- **CLI tools**: Command-line interface for proof operations
- **TypeScript support**: Full type safety and modern ES modules

## Quick Start

### Basic Usage

```typescript
import { 
  createProofEnvelope, 
  signEnvelopeWithCosign, 
  verifyCosignAttestations 
} from '@cortex-os/proof-artifacts';

// Create a proof envelope
const envelope = createProofEnvelope({
  artifact: {
    uri: 'file://./report.md',
    mime: 'text/markdown',
    contentHash: { alg: 'sha256', hex: 'abc123...' }
  },
  actor: { agent: 'my-agent', role: 'worker' },
  context: { public: { buildId: '12345' } },
  evidence: [],
  runtime: { model: 'gpt-4' }
});

// Sign with Sigstore (requires OIDC token)
const signed = await signEnvelopeWithCosign(envelope, {
  issuer: 'https://github.com/login/oauth',
  identityToken: process.env.OIDC_TOKEN
});

// Verify with real Sigstore trust roots (automatic)
const attestations = await verifyCosignAttestations(signed);
console.log(`brAInwav: Verified ${attestations.length} attestations`);
```

### Sigstore Trust Root Integration

The package now includes **real Sigstore trust root integration**, replacing placeholder implementations with proper TUF metadata handling:

```typescript
import { 
  TrustRootManager, 
  getDefaultTrustMaterial 
} from '@cortex-os/proof-artifacts';

// Use default trust roots (recommended)
const trustMaterial = await getDefaultTrustMaterial();

// Custom trust root management
const manager = new TrustRootManager({
  cacheDir: '~/.my-app/sigstore-cache',
  cacheTtlHours: 48,
  trustBundleUrl: 'https://custom.sigstore.dev/trusted_root.json'
});

const customTrust = await manager.getTrustMaterial();
```

## CLI Usage

```bash
# Create a proof envelope
pnpm cortex-proofs create --artifact ./report.md --mime text/markdown \
  --context '{"buildId": "12345"}' --runtime '{"model": "gpt-4"}'

# Sign proof envelopes
pnpm cortex-proofs sign --issuer "OIDC@GitHub" --identity-token "$OIDC_TOKEN" *.proof.json

# Verify signatures with real trust roots
pnpm cortex-proofs verify *.proof.json
```

## Scripts

- `pnpm --filter @cortex-os/proof-artifacts build` – compile TypeScript sources.
- `pnpm --filter @cortex-os/proof-artifacts test` – run vitest suite.
- `pnpm --filter @cortex-os/proof-artifacts test:coverage` – run tests with coverage.
- `pnpm cortex-proofs create` – create proof envelopes from artifacts.
- `pnpm cortex-proofs sign` – sign proof envelopes with Sigstore.
- `pnpm cortex-proofs verify` – verify proof envelope signatures.

## Documentation

- [Sigstore Trust Root Integration](./docs/SIGSTORE_TRUST_ROOTS.md) - Detailed guide on trust root management
- [Proof Artifact Specification](docs/proofs/proof-artifact-spec-v0-2.md) - Technical specification
- [Examples](./examples/) - Usage examples and demos

## Trust Root Features

### Automatic Trust Root Fetching

By default, the package automatically fetches and caches Sigstore trust bundles from the official TUF repository:

- **Source**: `https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json`
- **Cache**: `~/.cortex-os/sigstore-trust/trusted_root_cache.json`
- **TTL**: 24 hours (configurable)
- **Validation**: Cryptographic structure validation

### Production-Ready Configuration

```typescript
// Production usage with real verification
const result = await verifyCosignAttestations(envelope);

// Development/testing with verification disabled  
const result = await verifyCosignAttestations(envelope, {
  skipVerification: true
});

// Custom trust bundle (enterprise)
const result = await verifyCosignAttestations(envelope, {
  trustMaterial: await createTrustMaterial({
    trustBundleUrl: 'https://internal.company.com/sigstore/trusted_root.json'
  })
});
```

### Cache Management

```typescript
import { defaultTrustRootManager } from '@cortex-os/proof-artifacts';

// Force refresh trust roots
await defaultTrustRootManager.refreshTrustRoot();

// Clear cache
await defaultTrustRootManager.clearCache();

// Check cache status
const trustRoot = await defaultTrustRootManager.getTrustedRoot();
console.log('brAInwav: Trust root media type:', trustRoot.mediaType);
```

## Integration with Cortex-OS

This package is designed for seamless integration with:

- **CBOM verification**: Verify signed Software Bill of Materials
- **Security policies**: Enforce cryptographic verification requirements  
- **CI/CD pipelines**: Integrate with build and deployment workflows
- **Admission controllers**: Validate container images and artifacts

All operations include brAInwav branding for consistent observability across the Cortex-OS ecosystem.

## License

(Apache-2.0 OR Commercial)
