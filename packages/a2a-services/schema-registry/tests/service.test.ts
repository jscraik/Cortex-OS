import type { Server } from 'node:http';
import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import type { Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createService } from '../src/service.js';

// SSRF protection helper for test environment
function validateTestUrl(url: string): void {
	const parsed = new URL(url);
	// Only allow localhost for tests
	if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
		throw new Error(`Test fetch blocked: hostname ${parsed.hostname} not allowed`);
	}
}

function safeFetchForTests(url: string, options?: RequestInit): Promise<Response> {
	validateTestUrl(url);
	return fetch(url, options);
}

let app: Express;
let server: Server;
let baseUrl: string;

beforeEach(() => {
	app = createService();
	server = app.listen(0);
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	baseUrl = `http://localhost:${port}`;
});

afterEach(() => {
	server.close();
});

describe('Schema Registry Service', () => {
	it('registers a schema and creates an envelope', async () => {
		const schema = {
			id: 'test-schema',
			name: 'test-schema',
			version: '1.0.0',
			schema: {
				type: 'object',
				properties: {
					foo: { type: 'string' },
				},
			},
		};

		const response = await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(schema),
		});

		expect(response.status).toBe(201);
		const { location } = (await response.json()) as { location: string };
		expect(location).toBe('/schemas/test-schema/1.0.0');

		const envelope = createEnvelope({
			type: 'test-event',
			source: 'http://example.com/test',
			data: { foo: 'bar' },
			dataschema: 'http://example.com/schemas/test-schema/1.0.0',
		});

		expect(envelope.dataschema).toBe('http://example.com/schemas/test-schema/1.0.0');
	});

	it('rejects invalid schemas', async () => {
		const invalid = { id: 'bad-schema' }; // missing required fields
		const res = await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(invalid),
		});
		expect(res.status).toBe(400);
	});

	it('prevents duplicate schema submissions', async () => {
		const schema = {
			id: 'dup',
			name: 'dup',
			version: '1.0.0',
			schema: {},
		};
		const first = await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(schema),
		});
		expect(first.status).toBe(201);
		const second = await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(schema),
		});
		expect(second.status).toBe(409);
	});

	it('returns the latest schema by semantic version', async () => {
		const v1 = { id: 'latest', name: 'latest', version: '1.9.0', schema: {} };
		const v2 = { id: 'latest', name: 'latest', version: '1.10.0', schema: {} };
		const v3 = { id: 'latest', name: 'latest', version: '2.0.0', schema: {} };
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(v1),
		});
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(v2),
		});
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(v3),
		});

		const res = await safeFetchForTests(`${baseUrl}/schemas/latest/latest`);
		expect(res.status).toBe(200);
		const schema = (await res.json()) as { version: string };
		expect(schema.version).toBe('2.0.0');
	});

	it('lists all schemas', async () => {
		const schema1 = { id: 's1', name: 's1', version: '1.0.0', schema: {} };
		const schema2 = { id: 's2', name: 's2', version: '1.0.0', schema: {} };
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(schema1),
		});
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(schema2),
		});

		const res = await safeFetchForTests(`${baseUrl}/schemas`);
		expect(res.status).toBe(200);
		const schemas = (await res.json()) as any[];
		expect(schemas.length).toBe(2);
	});

	it('lists all versions for a schema', async () => {
		const v1 = {
			id: 'versions',
			name: 'versions',
			version: '1.0.0',
			schema: {},
		};
		const v2 = {
			id: 'versions',
			name: 'versions',
			version: '2.0.0',
			schema: {},
		};
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(v1),
		});
		await safeFetchForTests(`${baseUrl}/schemas`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(v2),
		});

		const res = await safeFetchForTests(`${baseUrl}/schemas/versions`);
		expect(res.status).toBe(200);
		const schemas = (await res.json()) as any[];
		expect(schemas.length).toBe(2);
		expect(schemas.map((s) => s.version)).toEqual(['1.0.0', '2.0.0']);
	});
});
