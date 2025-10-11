import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
	ConnectorServiceMap,
	ConnectorServiceMapPayload,
	ConnectorsManifest,
} from '@cortex-os/asbr-schemas';
import { signConnectorPayload } from '../../src/connectors/index.js';

export interface TestManifestContext {
	path: string;
	manifest: ConnectorsManifest;
	cleanup(): Promise<void>;
}

const DEFAULT_MANIFEST: ConnectorsManifest = {
	id: '01J9Z6Q8300000000000000000',
	brand: 'brAInwav',
	manifestVersion: '1.0.0',
	schemaVersion: '1.0.0',
	generatedAt: '2025-01-01T00:00:00Z',
	ttlSeconds: 600,
	connectors: [
		{
			id: 'docs',
			name: 'Docs Connector',
			displayName: 'Docs Connector',
			version: '1.0.0',
			description: 'Example connector used in tests.',
			endpoint: 'https://example.invalid/docs',
			auth: { type: 'bearer', headerName: 'Authorization' },
			authentication: {
				headers: [
					{
						name: 'Authorization',
						value: 'Bearer ${DOCS_TOKEN}',
					},
				],
			},
			scopes: ['docs:read'],
			quotas: {
				perMinute: 60,
				perHour: 600,
			},
			ttlSeconds: 180,
			metadata: { owner: 'documentation', category: 'docs' },
			tags: ['docs'],
		},
	],
};

export async function createTestConnectorsManifest(
	override?: Partial<ConnectorsManifest>,
): Promise<TestManifestContext> {
	const manifest = mergeManifest(override);
	const dir = await mkdtemp(join(tmpdir(), 'asbr-connectors-'));
	const path = join(dir, 'connectors.manifest.json');

	await writeFile(path, JSON.stringify(manifest, null, 2), 'utf-8');

	return {
		path,
		manifest,
		cleanup: async () => {
			await rm(dir, { recursive: true, force: true }).catch((error) => {
				console.error(`Failed to clean up test directory ${dir}:`, error);
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
