import { describe, expect, it, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAuthHealthHandler } from '../server/auth-health.js';
import { recordManifestTool, resetManifestTools } from '../server/manifest-registry.js';

const noopLogger = {
	debug: () => undefined,
	info: () => undefined,
	warn: () => undefined,
	error: () => undefined,
};

function createMockResponse() {
	let statusCode = 0;
	const headers: Record<string, string> = {};
	let body = '';
	return {
		res: {
			writeHead(code: number, hdrs: Record<string, string>) {
				statusCode = code;
				Object.assign(headers, hdrs);
				return this;
			},
			end(payload?: string) {
				body = payload ?? '';
				return this;
			},
		} as unknown as ServerResponse,
		get status() {
			return statusCode;
		},
		get headers() {
			return headers;
		},
		get body() {
			return body;
		},
	};
}

describe('auth-health manifest handler', () => {
	beforeEach(() => {
		resetManifestTools();
	});

	it('derives endpoint from forwarded headers and lists recorded tools', async () => {
		recordManifestTool({ name: 'code.patch', requiresOAuth: true, scopes: ['code.write'] });
		recordManifestTool({ name: 'codebase.search', requiresOAuth: false, scopes: [] });
		const handler = createAuthHealthHandler(
			{
				authenticator: {} as any,
				config: {
					mode: 'oauth2',
					auth0: {
						domain: 'brainwav.uk.auth0.com',
						issuer: 'https://brainwav.uk.auth0.com/',
						audience: 'https://cortex-mcp.brainwav.io/mcp',
						resource: 'https://cortex-mcp.brainwav.io/mcp',
						requiredScopes: ['search.read', 'docs.write'],
						jwksUri: 'https://brainwav.uk.auth0.com/.well-known/jwks.json',
						authorizationEndpoint: 'https://brainwav.uk.auth0.com/authorize',
						tokenEndpoint: 'https://brainwav.uk.auth0.com/oauth/token',
						requirePkce: true,
						metadataTtlSeconds: 300,
					},
					enforceScopes: true,
				},
				authorizationUrl: undefined,
				resourceMetadataUrl: undefined,
			},
			noopLogger,
		);
		const response = createMockResponse();
		const request = {
			method: 'GET',
			url: '/.well-known/mcp.json',
			headers: {
				forwarded: 'proto=https;host=cortex-mcp.brainwav.io',
				'x-forwarded-proto': 'https',
				'x-forwarded-host': 'cortex-mcp.brainwav.io',
			},
		} as unknown as IncomingMessage;
		await handler(request, response.res);
		expect(response.status).toBe(200);
		const manifest = JSON.parse(response.body);
		expect(manifest.servers[0].endpoint).toBe('https://cortex-mcp.brainwav.io/mcp');
		const tools = Object.fromEntries(manifest.tools.map((tool: any) => [tool.name, tool]));
		expect(tools['code.patch'].auth).toBe('oauth');
		expect(tools['code.patch'].scopes).toEqual(['code.write']);
		expect(tools['codebase.search'].auth).toBe('oauth');
	});

	it('falls back to default tool list when none recorded', async () => {
		const handler = createAuthHealthHandler(
			{
				authenticator: {} as any,
				config: {
					mode: 'api-key',
					auth0: undefined,
					enforceScopes: false,
				},
				authorizationUrl: undefined,
				resourceMetadataUrl: undefined,
			},
			noopLogger,
		);
		const response = createMockResponse();
		await handler(
			{
				method: 'GET',
				url: '/.well-known/mcp.json',
				headers: { host: 'localhost:3024' },
			} as unknown as IncomingMessage,
			response.res,
		);
		expect(response.status).toBe(200);
		const manifest = JSON.parse(response.body);
		expect(manifest.servers[0].endpoint).toBe('http://localhost:3024/mcp');
		const toolNames = manifest.tools.map((tool: any) => tool.name);
		expect(toolNames).toContain('code.patch');
		const codePatch = manifest.tools.find((tool: any) => tool.name === 'code.patch');
		expect(codePatch.auth).toBe('bearer');
	});
});

