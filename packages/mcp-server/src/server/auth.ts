/**
 * Authentication Module
 *
 * HTTP authentication configuration and setup extracted
 * from the main index file for better modularity.
 */

import type { Logger } from 'pino';
import { loadAuthConfig } from '../config/auth.js';
import { createHttpAuthenticator, type HttpAuthContext } from '../security/http-auth.js';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import { parseNumberEnv } from '../utils/config.js';

/**
 * Create and configure HTTP authenticator
 */
export function createAuthenticator(logger: Logger) {
	const configuredInterval = parseNumberEnv(process.env.MCP_AUTH_LOG_INTERVAL, 0);
	const authLogIntervalEnv = configuredInterval > 0 ? configuredInterval : undefined;
	const authConfig = loadAuthConfig();

	const authorizationUrl = authConfig.auth0
		? `https://${authConfig.auth0.domain}/.well-known/openid-configuration`
		: undefined;
	const resourceMetadataUrl = authConfig.auth0
		? new URL('/.well-known/oauth-protected-resource', authConfig.auth0.resource).toString()
		: undefined;

	const authenticator = createHttpAuthenticator({
		brandPrefix: BRAND.prefix,
		connectLogMessage: BRAND.connectLog,
		logger,
		logInterval: authLogIntervalEnv,
		authConfig,
		realm: BRAND.prefix,
		authorizationUrl,
		resourceMetadataUrl,
	});

	authenticator.logAcceptedHeaders();

	if (resourceMetadataUrl) {
		logger.info(
			createBrandedLog('auth_oauth_metadata_ready', { resource: resourceMetadataUrl }),
			'OAuth protected resource metadata configured',
		);
	}

	return {
		authenticator,
		config: authConfig,
		authorizationUrl,
		resourceMetadataUrl,
	};
}

/**
 * Export type for use in server setup
 */
export type AuthenticatorBundle = ReturnType<typeof createAuthenticator>;
export type { HttpAuthContext };
