import { setTimeout as wait } from 'node:timers/promises';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { createServer } from '../src/server/mcp-server.js';
import type { ServerConfig } from '../src/utils/config.js';
import { startTransport } from '../src/server/transport.js';

const PORT = 30555;
const HOST = '127.0.0.1';
const DOMAIN = 'unit-tests.auth0.com';
const ISSUER = `https://${DOMAIN}/`;
const AUDIENCE = 'https://api.cortex-os.dev/mcp';
const JWKS_URL = `${ISSUER}.well-known/jwks.json`;
const RESOURCE_URL = `http://${HOST}:${PORT}/mcp`;
const REQUIRED_SCOPES = ['search.read', 'docs.write'];

let privateKey: CryptoKey;
let fetchMock: ReturnType<typeof vi.fn>;
let originalFetch: typeof fetch;

async function createToken(scopes: string[], overrides: Record<string, unknown> = {}) {
	const now = Math.floor(Date.now() / 1000);
	return new SignJWT({
		sub: 'auth0|tester',
		azp: 'chatgpt-client',
		permissions: scopes,
		...overrides,
	})
		.setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
		.setIssuer(ISSUER)
		.setAudience(AUDIENCE)
		.setIssuedAt(now)
		.setExpirationTime(now + 300)
		.sign(privateKey);
}

function createConfig(): ServerConfig {
        return {
                port: PORT,
                host: HOST,
                httpEndpoint: '/mcp',
                sseEndpoint: '/sse',
                metricsEnabled: false,
                metricsHost: '127.0.0.1',
                metricsPort: 9464,
                metricsPath: '/metrics',
                piecesEnabled: false,
                codebaseSearchEnabled: true,
                logLevel: 'error',
                ollamaHost: 'http://127.0.0.1:11434',
                ollamaEnabled: false,
		promptsEnabled: true,
		resourcesEnabled: true,
	};
}

async function setupServer() {
	const logger = pino({ level: 'error' });
	const config = createConfig();
	const runtime = createServer(logger, config);
	const transport = await startTransport(runtime.server, logger, config, runtime.auth);
	await wait(50);
	return { runtime, transport };
}

describe('HTTP OAuth authentication', () => {
	beforeAll(async () => {
		const pair = await generateKeyPair('RS256');
		privateKey = pair.privateKey;
		const jwk = await exportJWK(pair.publicKey);
		fetchMock = vi.fn(async (input) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
			if (url === JWKS_URL) {
				return new Response(
					JSON.stringify({ keys: [{ ...jwk, kid: 'test-kid', use: 'sig', alg: 'RS256' }] }),
					{ status: 200, headers: { 'Content-Type': 'application/json' } },
				);
			}
			return new Response('not found', { status: 404 });
		});
		originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	beforeEach(() => {
		process.env.AUTH_MODE = 'oauth2';
		process.env.AUTH0_DOMAIN = DOMAIN;
		process.env.AUTH0_AUDIENCE = AUDIENCE;
		process.env.MCP_RESOURCE_URL = RESOURCE_URL;
		process.env.REQUIRED_SCOPES = REQUIRED_SCOPES.join(' ');
		process.env.MCP_TRANSPORT = 'http';
	});

	afterEach(async () => {
		delete process.env.AUTH_MODE;
		delete process.env.AUTH0_DOMAIN;
		delete process.env.AUTH0_AUDIENCE;
		delete process.env.MCP_RESOURCE_URL;
		delete process.env.REQUIRED_SCOPES;
		delete process.env.MCP_TRANSPORT;
	});

	it('responds with WWW-Authenticate when missing bearer token', async () => {
	const { transport } = await setupServer();
	try {
		const response = await fetch(`http://${HOST}:${PORT}/mcp`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(401);
		const header = response.headers.get('www-authenticate');
		expect(header).toMatch(/Bearer realm="MCP"/);
		expect(header).toContain('authorization_uri');
		expect(header).toContain('resource_metadata');
	} finally {
		await transport.stop();
	}
	});

	it('rejects bearer tokens with missing scopes', async () => {
	const { transport } = await setupServer();
	try {
		const token = await createToken(['search.read']);
		const response = await fetch(`http://${HOST}:${PORT}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(401);
		const header = response.headers.get('www-authenticate') ?? '';
		expect(header).toContain('error="insufficient_scope"');
		expect(header).toContain('docs.write');
	} finally {
		await transport.stop();
	}
	});

	it('accepts valid bearer token', async () => {
	const { transport } = await setupServer();
	try {
		const token = await createToken(['search.read', 'docs.write']);
		const response = await fetch(`http://${HOST}:${PORT}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 1 }),
		});
		expect(response.status).toBe(200);
	} finally {
		await transport.stop();
	}
	});

	it('rejects tokens with wrong audience', async () => {
	const { transport } = await setupServer();
	try {
		const token = await createToken(['search.read', 'docs.write'], { aud: 'https://wrong.example' });
		const response = await fetch(`http://${HOST}:${PORT}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(401);
	} finally {
		await transport.stop();
	}
	});

	it('rejects tokens with wrong issuer', async () => {
	const { transport } = await setupServer();
	try {
		const token = await createToken(['search.read', 'docs.write'], { iss: 'https://attacker.example/' });
		const response = await fetch(`http://${HOST}:${PORT}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(401);
	} finally {
		await transport.stop();
	}
	});
});
