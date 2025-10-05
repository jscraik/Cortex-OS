# Sigstore Trust Root Integration

This document explains how to use the Sigstore trust root integration in the `@cortex-os/proof-artifacts` package.

## Overview

The package now includes real Sigstore trust root integration, allowing you to verify Sigstore attestations against the official Sigstore public good infrastructure. This replaces the previous placeholder-only approach with proper TUF metadata and `trusted_root.json` handling.

## Features

- **Automatic trust root fetching**: Downloads the official Sigstore trust bundle from the TUF repository
- **Local caching**: Caches trust bundles locally with configurable TTL to avoid repeated network requests
- **Real verification**: Uses actual Sigstore trust roots for cryptographic verification
- **Fallback support**: Gracefully handles network failures and provides testing options
- **brAInwav branding**: All log outputs include brAInwav branding for observability

## Quick Start

### Default Usage (Recommended)

The simplest way to use real trust roots is to call verification without any options:

```typescript
import { verifyCosignAttestations } from '@cortex-os/proof-artifacts';

// Uses real Sigstore trust roots automatically
const attestations = await verifyCosignAttestations(envelope);
```

This will:

1. Fetch the latest Sigstore trust bundle from `https://tuf-repo-cdn.sigstore.dev/targets/trusted_root.json`
2. Cache it locally in `~/.cortex-os/sigstore-trust/`
3. Use it for verification

### Manual Trust Material Management

For more control, you can use the `TrustRootManager` directly:

```typescript
import { TrustRootManager, verifyCosignAttestations } from '@cortex-os/proof-artifacts';

const trustManager = new TrustRootManager({
  cacheDir: '/custom/cache/path',
  cacheTtlHours: 48, // Cache for 48 hours
  trustBundleUrl: 'https://custom.sigstore.instance/trusted_root.json'
});

const trustMaterial = await trustManager.getTrustMaterial();
const attestations = await verifyCosignAttestations(envelope, { trustMaterial });
```

### Testing and Development

For testing scenarios where you don't want real verification:

```typescript
// Skip verification entirely
const attestations = await verifyCosignAttestations(envelope, { 
  skipVerification: true 
});

// Use custom trust material
const attestations = await verifyCosignAttestations(envelope, {
  trustMaterial: mockTrustMaterial
});

// Disable automatic trust root fetching
const attestations = await verifyCosignAttestations(envelope, {
  useRealTrustRoots: false
});
```

## Configuration Options

### TrustRootManagerOptions

```typescript
interface TrustRootManagerOptions {
  /** Cache directory for trust bundles. Defaults to ~/.cortex-os/sigstore-trust */
  cacheDir?: string;
  
  /** Trust bundle URL. Defaults to official Sigstore public good instance */
  trustBundleUrl?: string;
  
  /** Cache TTL in hours. Defaults to 24 hours */
  cacheTtlHours?: number;
  
  /** Fetch timeout in milliseconds. Defaults to 30 seconds */
  fetchTimeoutMs?: number;
}
```

### VerifyCosignOptions

```typescript
interface VerifyCosignOptions {
  /** Custom Verifier instance */
  verifier?: Verifier;
  
  /** Pre-built TrustMaterial */
  trustMaterial?: TrustMaterial;
  
  /** Raw trust root JSON */
  trustRootJSON?: Record<string, unknown>;
  
  /** Whether to use real Sigstore trust roots. Defaults to true. */
  useRealTrustRoots?: boolean;
  
  /** Skip verification entirely (for testing). Defaults to false. */
  skipVerification?: boolean;
}
```

## Cache Management

The trust root cache is managed automatically, but you can control it manually:

```typescript
import { defaultTrustRootManager } from '@cortex-os/proof-artifacts';

// Force refresh the cache
await defaultTrustRootManager.refreshTrustRoot();

// Clear the cache
await defaultTrustRootManager.clearCache();

// Get cached trust root without network request
const trustRoot = await defaultTrustRootManager.getTrustedRoot();
```

## Error Handling

The trust root manager handles various error conditions gracefully:

- **Network timeouts**: Configurable timeout with clear error messages
- **HTTP errors**: Proper error handling for 4xx/5xx responses  
- **Invalid trust bundles**: Validates trust root structure before use
- **Cache corruption**: Falls back to fresh fetch if cache is invalid

All errors include brAInwav branding in their messages for consistent observability.

## Build and Test Environment Setup

For CI/CD and test environments, consider:

1. **Pre-warming cache**: Download trust roots during build to avoid runtime network dependencies
2. **Offline testing**: Use `skipVerification: true` or mock trust materials for unit tests
3. **Custom trust bundles**: Point to internal Sigstore instances if using private infrastructure

### Example: Pre-warming Cache

```typescript
// In your build script
import { defaultTrustRootManager } from '@cortex-os/proof-artifacts';

// Pre-fetch trust roots
await defaultTrustRootManager.refreshTrustRoot();
console.log('brAInwav: Sigstore trust roots cached for production');
```

## Migration from Placeholder Implementation

If you were previously using placeholder trust materials:

**Before:**

```typescript
const result = await verifyCosignAttestations(envelope, {
  trustMaterial: placeholderTrustMaterial
});
```

**After:**

```typescript
// Uses real trust roots automatically
const result = await verifyCosignAttestations(envelope);
```

## Integration with Cortex-OS

This trust root integration is designed to work seamlessly with:

- **CBOM verification**: Verify signed Software Bill of Materials
- **Proof artifact attestations**: Validate proof envelopes with Sigstore signatures
- **CI/CD pipelines**: Integrate with build and deployment workflows
- **Security policies**: Enforce cryptographic verification in admission controllers

## Troubleshooting

### Common Issues

1. **Network connectivity**: Ensure access to `tuf-repo-cdn.sigstore.dev`
2. **Cache permissions**: Verify write access to cache directory
3. **Trust bundle format**: Ensure custom trust bundles follow Sigstore format
4. **Version compatibility**: Use `@sigstore/verify` v3.0.0 or later

### Debug Logging

All operations include brAInwav-branded console output for observability:

```
brAInwav: Using cached Sigstore trust root
brAInwav: Fetching fresh Sigstore trust root from TUF repository  
brAInwav: Successfully verified Sigstore attestation from issuer github.com
brAInwav: Cleared Sigstore trust root cache
```

## Security Considerations

- **Trust root authenticity**: The default implementation fetches from the official Sigstore TUF repository
- **Cache security**: Trust bundles are cached in user home directory with standard file permissions
- **Network security**: Uses HTTPS for all trust root fetches with proper User-Agent headers
- **Graceful degradation**: Falls back safely when trust roots are unavailable

## Contributing

When contributing to this functionality:

1. **Maintain brAInwav branding**: All log outputs must include "brAInwav"
2. **Test real scenarios**: Include tests with actual trust root fetching
3. **Document changes**: Update this guide for any new configuration options
4. **Security review**: Consider security implications of trust root handling changes

For more information, see the main [Cortex-OS documentation](../../README.md).
