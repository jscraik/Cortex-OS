import type { IncomingMessage } from 'node:http';
import { FastMCP, type FastMcpServer } from 'fastmcp';
import type { Logger } from 'pino';
import { BRAND, createBrandedLog, createHealthResponse } from '../utils/brand.js';
import type { ServerConfig } from '../utils/config.js';
import { createAuthenticator, type AuthenticatorBundle } from './auth.js';

type ProtectedResourceState = {
	authorizationServers: string[];
	resource: string;
	scopes: Record<string, string[]>;
};

export type ServerRuntime = {
	server: FastMcpServer;
	auth: AuthenticatorBundle;
	oauthOptions: {
		enabled: boolean;
		protectedResource?: ProtectedResourceState;
	};
};

const SERVER_NAME = 'brainwav-cortex-memory';
const SERVER_VERSION = '3.18.0';
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
		? {
				enabled: true,
				protectedResource: {
					authorizationServers: [`https://${auth.config.auth0.domain}`],
					resource: auth.config.auth0.resource,
					scopes: {} as Record<string, string[]>,
				},
		  }
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
