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
        id: '01J0XKQ4R6V7Z9P3S5T7W9YBCE',
        schema_version: '1.1.0',
        generated_at: '2025-01-01T00:00:00Z',
        connectors: [
                {
                        id: 'docs',
                        name: 'Docs Connector',
                        displayName: 'Docs Connector',
                        version: '1.0.0',
                        status: 'enabled',
                        enabled: true,
                        ttlSeconds: 180,
                        endpoint: 'https://example.invalid/v1/mcp/docs',
                        auth: { type: 'none' },
                        metadata: { brand: 'brAInwav' },
                        description: 'Example connector used in tests.',
                        endpoint: 'https://example.invalid/docs',
                        authentication: {
                                headers: [
                                        {
                                                name: 'Authorization',
                                                value: 'Bearer ${DOCS_TOKEN}',
                                        },
                                ],
                        },
                        headers: {
                                'X-Docs-Connector': 'docs',
                        },
                        scopes: ['docs:read'],
                        quotas: {
                                per_minute: 60,
                                per_hour: 600,
                        },
                        ttl_seconds: 180,
                        metadata: { owner: 'documentation', category: 'docs' },
                        tags: ['docs'],
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
