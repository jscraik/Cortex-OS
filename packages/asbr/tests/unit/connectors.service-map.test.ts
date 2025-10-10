import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	createConnectorsServiceMap,
	getConnectorsServiceMap,
} from '../../src/connectors/serviceMap.js';
import type { ConnectorsManifest } from '../../src/types/connectors.js';

const FIXED_TIME = new Date('2025-10-10T12:00:00.000Z');
const FIXED_ULID = '01J9Z6Q8300000000000000000';
const SIGNATURE_KEY = 'test-signature-key';

const manifest: ConnectorsManifest = {
	brand: 'brAInwav',
	version: '2025.10.10',
	ttlSeconds: 300,
	connectors: [
		{
			id: 'memory-hybrid',
			displayName: 'Memory Hybrid Search',
			version: '2025-10-10',
			endpoint: 'https://example.local/memory',
			auth: {
				type: 'apiKey',
				headerName: 'X-API-Key',
			},
			scopes: ['memory.read', 'memory.search'],
			quotas: {
				perMinute: 60,
				perHour: 600,
			},
			enabled: true,
			metadata: {
				brand: 'brAInwav',
				description: 'Hybrid semantic + keyword retrieval',
			},
		},
		{
			id: 'tasks',
			displayName: 'Task Lifecycle',
			version: '2025-10-10',
			endpoint: 'https://example.local/tasks',
			auth: {
				type: 'bearer',
				headerName: 'Authorization',
			},
			scopes: ['tasks.read', 'tasks.write'],
			quotas: {
				perMinute: 30,
				perHour: 200,
			},
			enabled: false,
			metadata: {
				brand: 'brAInwav',
			},
		},
	],
};

describe('createConnectorsServiceMap', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('produces a deterministically signed payload', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);

		const map = await createConnectorsServiceMap(manifest, {
			signatureKey: SIGNATURE_KEY,
			now: () => FIXED_TIME,
			generateUlid: () => FIXED_ULID,
		});

		expect(map.brand).toBe('brAInwav');
		expect(map.id).toBe(FIXED_ULID);
		expect(map.generatedAt).toBe(FIXED_TIME.toISOString());
		expect(map.ttlSeconds).toBe(300);
		expect(map.connectors).toHaveLength(2);

		const unsignedPayload = {
			id: map.id,
			brand: map.brand,
			generatedAt: map.generatedAt,
			ttlSeconds: map.ttlSeconds,
			connectors: map.connectors.map(({ signature: _ignored, ...connector }) => connector),
			metadata: map.metadata,
		};

		const expectedSignature = createHmac('sha256', SIGNATURE_KEY)
			.update(JSON.stringify(unsignedPayload))
			.digest('hex');

		expect(map.signature).toBe(expectedSignature);
		expect(map).toMatchInlineSnapshot(`
		{
		  "brand": "brAInwav",
		  "connectors": [
		    {
		      "availability": {
		        "status": "unknown",
		      },
		      "enabled": true,
		      "endpoint": "https://example.local/memory",
		      "expiresAt": "2025-10-10T12:05:00.000Z",
		      "id": "memory-hybrid",
		      "metadata": {
		        "brand": "brAInwav",
		        "description": "Hybrid semantic + keyword retrieval",
		      },
		      "quotas": {
		        "perHour": 600,
		        "perMinute": 60,
		      },
		      "scopes": [
		        "memory.read",
		        "memory.search",
		      ],
		      "status": "online",
		      "tags": [],
		      "timeouts": undefined,
		      "ttlSeconds": 300,
		      "version": "2025-10-10",
		    },
		    {
		      "availability": {
		        "failureReason": "Connector disabled in manifest",
		        "status": "offline",
		      },
		      "enabled": false,
		      "endpoint": "https://example.local/tasks",
		      "expiresAt": "2025-10-10T12:05:00.000Z",
		      "id": "tasks",
		      "metadata": {
		        "brand": "brAInwav",
		      },
		      "quotas": {
		        "perHour": 200,
		        "perMinute": 30,
		      },
		      "scopes": [
		        "tasks.read",
		        "tasks.write",
		      ],
		      "status": "offline",
		      "tags": [],
		      "timeouts": undefined,
		      "ttlSeconds": 300,
		      "version": "2025-10-10",
		    },
		  ],
		  "generatedAt": "2025-10-10T12:00:00.000Z",
		  "id": "01J9Z6Q8300000000000000000",
		  "metadata": undefined,
		  "signature": "1cc8134811809e7be3fd7218de5d373ceeee17a2ab0fd6deb90c5d7c5738e66b",
		  "ttlSeconds": 300,
		}
	`);
	});

	it('marks disabled connectors as offline with branded messaging', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);

		const result = await createConnectorsServiceMap(manifest, {
			signatureKey: SIGNATURE_KEY,
			now: () => FIXED_TIME,
			generateUlid: () => FIXED_ULID,
		});
		const disabled = result.connectors.find((conn) => conn.id === 'tasks');

		expect(disabled?.status).toBe('offline');
		expect(disabled?.availability?.failureReason).toContain('Connector disabled in manifest');
		expect(disabled?.availability?.status).toBe('offline');
	});
});

describe('getConnectorsServiceMap', () => {
	const originalEnv = { ...process.env };
	let tempDir: string;

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.useRealTimers();
		if (tempDir) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it('throws a branded error when manifest file is missing', async () => {
		process.env.CONNECTORS_MANIFEST_PATH = resolve('/tmp/not-found.json');
		process.env.CONNECTORS_SIGNATURE_KEY = SIGNATURE_KEY;
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);

		await expect(getConnectorsServiceMap()).rejects.toThrow(/brAInwav/i);
	});

	it('loads manifest from disk and honours overrides', async () => {
		tempDir = mkdtempSync(join(tmpdir(), 'connectors-manifest-'));
		const manifestPath = join(tempDir, 'manifest.json');
		writeFileSync(manifestPath, JSON.stringify(manifest), 'utf-8');

		process.env.CONNECTORS_MANIFEST_PATH = manifestPath;
		process.env.CONNECTORS_SIGNATURE_KEY = SIGNATURE_KEY;

		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);

		const map = await getConnectorsServiceMap({
			now: () => FIXED_TIME,
			generateUlid: () => FIXED_ULID,
		});

		expect(map.connectors).toHaveLength(2);
		expect(map.signature).toBeDefined();
		expect(map.brand).toBe('brAInwav');
	});
});
