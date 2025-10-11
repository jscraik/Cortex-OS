import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ConnectorServiceMap, ConnectorsManifest } from '@cortex-os/asbr-schemas';
import { signConnectorPayload, type ConnectorServiceMapPayload } from '../../src/connectors/index.js';

export interface TestManifestContext {
        path: string;
        manifest: ConnectorsManifest;
        cleanup(): Promise<void>;
}

const DEFAULT_MANIFEST: ConnectorsManifest = {
        id: 'test-manifest',
        manifestVersion: '1.0.0',
        generatedAt: '2024-01-01T00:00:00Z',
        ttlSeconds: 300,
        connectors: [
                {
                        id: 'docs',
                        name: 'Docs Connector',
                        displayName: 'Docs Connector',
                        version: '1.0.0',
                        scopes: ['docs:read'],
                        quotas: { requestsPerMinute: 60 },
                        timeouts: { request: 3000 },
                        status: 'enabled',
                        enabled: true,
                        ttlSeconds: 180,
                        endpoint: 'https://example.invalid/v1/mcp/docs',
                        auth: { type: 'none' },
                        metadata: { brand: 'brAInwav' },
                },
        ],
};

export async function createTestConnectorsManifest(
        manifestOverride?: Partial<ConnectorsManifest>,
): Promise<TestManifestContext> {
        const manifest = mergeManifest(manifestOverride);
        const dir = await mkdtemp(join(tmpdir(), 'asbr-connectors-'));
        const path = join(dir, 'connectors.manifest.json');

        await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');

        return {
                path,
                manifest,
                cleanup: async () => {
                        await rm(dir, { recursive: true, force: true }).catch((err) => {
                                console.error(`Failed to clean up test directory ${dir}:`, err);
                        });
                },
        };
}

export function verifyConnectorServiceMapSignature(
        payload: ConnectorServiceMap,
        key: string,
): boolean {
        const { signature, ...rest } = payload;
        const base = rest as ConnectorServiceMapPayload;
        const expected = signConnectorPayload(base, key);
        return signature === expected;
}

function mergeManifest(override?: Partial<ConnectorsManifest>): ConnectorsManifest {
        if (!override) {
                return structuredClone(DEFAULT_MANIFEST);
        }

        const merged = structuredClone(DEFAULT_MANIFEST);
        Object.assign(merged, override);

        if (override.connectors) {
                merged.connectors = structuredClone(override.connectors);
        }

        return merged;
}
