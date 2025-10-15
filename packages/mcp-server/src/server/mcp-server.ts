import type { IncomingMessage } from 'node:http';
import { FastMCP, type FastMcpServer } from 'fastmcp';
import type { Logger } from 'pino';
import { BRAND, createBrandedLog, createHealthResponse } from '../utils/brand.js';
import type { ServerConfig } from '../utils/config.js';
import { createAuthenticator, type AuthenticatorBundle } from './auth.js';

type BrandingMetadata = {
	provider: string;
	component: string;
};

type AuthorizationServerMetadata = {
	issuer: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	jwksUri: string;
	requirePkce: boolean;
	tokenFormats: string[];
	branding: BrandingMetadata;
};

type ProtectedResourceState = {
	issuer: string;
	resource: string;
	jwksUri: string;
	authorizationEndpoint: string;
	tokenEndpoint: string;
	scopes: Record<string, string[]>;
	scopesSupported: string[];
	requirePkce: boolean;
	tokenFormats: string[];
	metadataTtlSeconds: number;
	branding: BrandingMetadata;
};

export type ServerRuntime = {
	server: FastMcpServer;
	auth: AuthenticatorBundle;
	oauthOptions: {
		enabled: boolean;
		authorizationServer?: AuthorizationServerMetadata;
		protectedResource?: ProtectedResourceState;
	};
};

const SERVER_NAME = 'brainwav-cortex-memory';
const SERVER_VERSION = '3.19.1';
const DEFAULT_PING_INTERVAL = 20_000;

function resolveIncomingMessage(request: unknown): IncomingMessage | undefined {
	if (!request) {
		return undefined;
	}
	if (typeof request === 'object' && request && 'rawRequest' in request) {
		return (request as { rawRequest?: IncomingMessage }).rawRequest;
	}
	return request as IncomingMessage;
}

export function createServer(logger: Logger, config: ServerConfig): ServerRuntime {
	const auth = createAuthenticator(logger);
	const oauthOptions = auth.config.auth0
		? (() => {
				const branding: BrandingMetadata = {
					provider: BRAND.prefix,
					component: 'cortex-mcp',
				};
				const tokenFormats = ['jwt'];
				const issuer = auth.config.auth0.issuer;
				const authorizationEndpoint = auth.config.auth0.authorizationEndpoint;
				const tokenEndpoint = auth.config.auth0.tokenEndpoint;
				const jwksUri = auth.config.auth0.jwksUri;
				const initialScopesSupported = [...new Set(auth.config.auth0.requiredScopes)].sort();

				return {
					enabled: true,
					authorizationServer: {
						issuer,
						authorizationEndpoint,
						tokenEndpoint,
						jwksUri,
						requirePkce: auth.config.auth0.requirePkce,
						tokenFormats,
						branding,
					},
					protectedResource: {
						issuer,
						resource: auth.config.auth0.resource,
						authorizationServers: [issuer], // Add missing property
						jwksUri,
						authorizationEndpoint,
						tokenEndpoint,
						scopes: {} as Record<string, string[]>,
						scopesSupported: initialScopesSupported,
						requirePkce: auth.config.auth0.requirePkce,
						tokenFormats,
						metadataTtlSeconds: auth.config.auth0.metadataTtlSeconds,
						branding,
					},
				};
		  })()
		: { enabled: false };
	const server = new FastMCP({
		name: SERVER_NAME,
		version: SERVER_VERSION,
		authenticate: async (request) => {
			return auth.authenticator.authenticate(resolveIncomingMessage(request));
		},
		oauth: oauthOptions,
		health: {
			enabled: true,
			path: '/health',
			status: 200,
			message: BRAND.healthMessage,
			async handler() {
				return createHealthResponse('healthy', { transport: config.httpEndpoint });
			},
		},
		ping: {
			enabled: true,
			intervalMs: DEFAULT_PING_INTERVAL,
			logLevel: 'debug',
		},
	});

	server.on('connect', () => {
		logger.info(createBrandedLog('client_connect'), BRAND.connectLog);
	});

	server.on('disconnect', () => {
		logger.info(createBrandedLog('client_disconnect'), BRAND.disconnectLog);
	});

	return { server, auth, oauthOptions };
}
