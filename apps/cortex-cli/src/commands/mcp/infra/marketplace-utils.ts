/**
 * @file marketplace-utils.ts
 * @description Infrastructure utilities for marketplace client (URL validation & cache file helpers)
 */

import path from 'node:path';

/** Security allowlist for marketplace / registry domains */
export const ALLOWED_MARKETPLACE_DOMAINS: string[] = [
    'marketplace.cortex-os.com',
    'marketplace.cortex-os.dev',
    'registry.cortex-os.com',
    'registry.cortex-os.dev',
    'api.cortex-os.com',
    'localhost',
    '127.0.0.1',
    '::1',
];

/**
 * Validate registry / marketplace URL against protocol + allowlist to mitigate SSRF.
 */
export function validateMarketplaceUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        const hostname = parsed.hostname.toLowerCase();
        return ALLOWED_MARKETPLACE_DOMAINS.includes(hostname);
    } catch {
        return false;
    }
}

/**
 * Stable cache filename derivation for a registry URL.
 * Uses base64url to keep filenames filesystem safe & deterministic.
 */
export function getRegistryCacheFilePath(cacheDir: string, url: string): string {
    const urlHash = Buffer.from(url).toString('base64url');
    return path.join(cacheDir, `registry-${urlHash}.json`);
}
