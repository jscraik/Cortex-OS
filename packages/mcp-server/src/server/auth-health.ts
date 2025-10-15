import type { IncomingMessage, ServerResponse } from 'node:http';
import { BRAND, createBrandedLog, createHealthResponse } from '../utils/brand.js';
import type { AuthenticatorBundle } from './auth.js';
import type { Logger } from 'pino';

const MCP_MANIFEST_PATH = '/.well-known/mcp.json';
const OAUTH_METADATA_PATH = '/.well-known/oauth-protected-resource';
const HEALTH_PATH = '/health/auth';
const DEFAULT_TIMEOUT_MS = 3_000;

type CustomHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export function createAuthHealthHandler(
	auth: AuthenticatorBundle,
	logger: Logger,
): CustomHandler {
	return async (req, res) => {
		const rawUrl = req.url;
		if (!rawUrl || req.method !== 'GET') {
			return false;
		}

		const host = req.headers.host ?? 'localhost';
		const url = new URL(rawUrl, `http://${host}`);

		if (url.pathname === MCP_MANIFEST_PATH) {
			const manifest = createManifestPayload();
			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store, max-age=0',
				'X-Brainwav-Brand': BRAND.prefix,
				'X-Brainwav-Component': 'cortex-mcp',
			});
			res.end(JSON.stringify(manifest, null, 2));
			logger.debug(createBrandedLog('http_manifest_served', { path: MCP_MANIFEST_PATH }), 'Served MCP manifest');
			return true;
		}

		if (url.pathname === OAUTH_METADATA_PATH) {
			if (!auth.config.auth0) {
				res.writeHead(404, {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store, max-age=0',
				});
				res.end(JSON.stringify({ error: 'OAuth configuration not available' }));
				return true;
			}

			const metadata = createProtectedResourceMetadata(auth);
			res.writeHead(200, {
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${auth.config.auth0.metadataTtlSeconds}`,
				'X-Brainwav-Brand': BRAND.prefix,
				'X-Brainwav-Component': 'cortex-mcp',
			});
			res.end(JSON.stringify(metadata, null, 2));
			logger.debug(
				createBrandedLog('http_oauth_metadata_served', { path: OAUTH_METADATA_PATH }),
				'Served OAuth protected resource metadata',
			);
			return true;
		}

		if (url.pathname !== HEALTH_PATH) {
			return false;
		}

		const headers = {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store, max-age=0',
			'X-Brainwav-Brand': BRAND.prefix,
			'X-Brainwav-Component': 'cortex-mcp',
		};

		if (!auth.config.auth0) {
			const payload = {
				...createHealthResponse('healthy', { endpoint: HEALTH_PATH }),
				checks: {
					oauth: {
						status: 'disabled',
						message: 'OAuth2 not configured',
					},
				},
			};
			res.writeHead(200, headers).end(JSON.stringify(payload));
			return true;
		}

		const checkContext = {
			jwks: {
				status: 'pass' as 'pass' | 'fail',
				endpoint: auth.config.auth0.jwksUri,
				latencyMs: 0,
				error: undefined as string | undefined,
				keyCount: 0,
			},
		};

		let statusCode = 200;
		const response = createHealthResponse('healthy', {
			endpoint: HEALTH_PATH,
			resource: auth.config.auth0.resource,
			issuer: auth.config.auth0.issuer,
		});

		const started = Date.now();
		try {
			const controller = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
			const fetchResponse = await fetch(auth.config.auth0.jwksUri, {
				method: 'GET',
				headers: { Accept: 'application/json' },
				signal: controller,
			});

			checkContext.jwks.latencyMs = Date.now() - started;

			if (!fetchResponse.ok) {
				throw new Error(`JWKS request failed with status ${fetchResponse.status}`);
			}

			const payload = await fetchResponse.json();
			const keys = Array.isArray(payload?.keys) ? payload.keys : [];
			checkContext.jwks.keyCount = keys.length;
			if (keys.length === 0) {
				throw new Error('JWKS payload contained no keys');
			}
		} catch (error) {
			checkContext.jwks.status = 'fail';
			checkContext.jwks.error =
				error instanceof Error ? error.message : String(error);
			statusCode = 503;
			response.status = 'unhealthy';
			logger.error(
				createBrandedLog('auth_health_jwks_error', {
					error: checkContext.jwks.error,
					endpoint: auth.config.auth0.jwksUri,
				}),
				'Failed to validate JWKS endpoint',
			);
		}

		const payload = {
			...response,
			component: 'cortex-mcp',
			checks: checkContext,
			metadata: {
				requirePkce: auth.config.auth0.requirePkce,
				tokenFormats: ['jwt'],
				authorizationEndpoint: auth.config.auth0.authorizationEndpoint,
				tokenEndpoint: auth.config.auth0.tokenEndpoint,
			},
		};

		res.writeHead(statusCode, headers).end(JSON.stringify(payload));
		return true;
	};
}

export type { CustomHandler };

function createManifestPayload() {
	return {
		name: 'brainwav-cortex-memory',
		version: '3.19.1',
		brand: BRAND.prefix,
		component: 'cortex-mcp',
		capabilities: {
			tools: true,
			resources: true,
			prompts: true,
		},
		transport: {
			sse: true,
			stdio: true,
		},
	};
}

function createProtectedResourceMetadata(auth: AuthenticatorBundle) {
	const scopes = auth.config.auth0?.requiredScopes ?? [];
	return {
		resource: auth.config.auth0?.resource,
		authorization_servers: [auth.config.auth0?.issuer].filter(Boolean),
		jwks_uri: auth.config.auth0?.jwksUri,
		scopes_supported: Array.from(new Set(scopes)).sort(),
		token_formats_supported: ['jwt'],
		require_pkce: auth.config.auth0?.requirePkce ?? true,
		metadata_ttl_seconds: auth.config.auth0?.metadataTtlSeconds ?? 300,
		branding: {
			provider: BRAND.prefix,
			component: 'cortex-mcp',
		},
	};
}
