/**
 * @file marketplace-security.test.ts
 * @description Focused tests for security validation edge cases & infra helpers.
 */

import { describe, expect, it } from 'vitest';
import { getRegistryCacheFilePath, validateMarketplaceUrl } from './infra/marketplace-utils.js';
import { MarketplaceClient, MarketplaceConfigSchema } from './marketplace-client.js';

// Minimal server manifest shape for tests (casting to any for confined test scope)
function manifest(partial: Record<string, any>): any {
    return {
        id: 's',
        name: 'Server',
        transports: {},
        ...partial,
    };
}

const baseConfig = MarketplaceConfigSchema.parse({
    registries: { default: 'https://registry.cortex-os.dev/v1/registry.json' },
    cacheDir: '/tmp/cortex-test-cache',
    cacheTtl: 300000,
    security: {
        requireSignatures: true,
        allowedRiskLevels: ['low', 'medium'],
        trustedPublishers: ['TrustedCo'],
    },
});

describe('infra utilities', () => {
    it('validateMarketplaceUrl allows allowed domains', () => {
        expect(validateMarketplaceUrl('https://registry.cortex-os.dev/v1/registry.json')).toBe(true);
    });

    it('validateMarketplaceUrl rejects disallowed domain', () => {
        expect(validateMarketplaceUrl('https://evil.example.com/registry.json')).toBe(false);
    });

    it('getRegistryCacheFilePath produces stable file', () => {
        const p1 = getRegistryCacheFilePath('/tmp/cache', 'https://registry.cortex-os.dev/v1/registry.json');
        const p2 = getRegistryCacheFilePath('/tmp/cache', 'https://registry.cortex-os.dev/v1/registry.json');
        expect(p1).toBe(p2);
        expect(p1).toMatch(/registry-/);
    });
});

describe('validateServerSecurity edge cases', () => {
    const client = new MarketplaceClient(baseConfig);
    const anyClient = client as any; // Access private for targeted unit assertions

    it('rejects disallowed risk level', () => {
        const srv = manifest({ security: { riskLevel: 'high', verifiedPublisher: true, sigstoreBundle: 'x' } });
        const res = anyClient.validateServerSecurity(srv);
        expect(res.allowed).toBe(false);
        expect(res.reason).toBe('risk');
    });

    it('rejects missing signature when required', () => {
        const srv = manifest({ security: { riskLevel: 'low', verifiedPublisher: true } });
        const res = anyClient.validateServerSecurity(srv);
        expect(res.allowed).toBe(false);
        expect(res.reason).toBe('signature');
    });

    it('rejects untrusted publisher', () => {
        const srv = manifest({ owner: 'UnknownCorp', security: { riskLevel: 'low', sigstoreBundle: 'x', verifiedPublisher: true } });
        const res = anyClient.validateServerSecurity(srv);
        expect(res.allowed).toBe(false);
        expect(res.reason).toBe('publisher');
    });

    it('accepts valid server', () => {
        const srv = manifest({ owner: 'TrustedCo', security: { riskLevel: 'medium', sigstoreBundle: 'x', verifiedPublisher: true } });
        const res = anyClient.validateServerSecurity(srv);
        expect(res.allowed).toBe(true);
    });
});
