/**
 * Authentication Module
 *
 * HTTP authentication configuration and setup extracted
 * from the main index file for better modularity.
 */

import type { Logger } from 'pino';
import { createHttpAuthenticator, type HttpAuthContext } from '../security/http-auth.js';
import { BRAND, createBrandedLog } from '../utils/brand.js';
import { parseNumberEnv } from '../utils/config.js';

const EXPERIMENTAL_RESOURCE_PATH = '/.well-known/oauth-protected-resource';

/**
 * Create and configure HTTP authenticator
 */
export function createAuthenticator(logger: Logger) {
	const configuredInterval = parseNumberEnv(process.env.MCP_AUTH_LOG_INTERVAL, 0);
	const authLogIntervalEnv = configuredInterval > 0 ? configuredInterval : undefined;

	const httpAuthenticator = createHttpAuthenticator({
		brandPrefix: BRAND.prefix,
		connectLogMessage: BRAND.connectLog,
		logger,
		logInterval: authLogIntervalEnv,
	});

	httpAuthenticator.logAcceptedHeaders();

	const experimentalEnabled = process.env.MCP_AUTH_EXPERIMENTAL === 'true';
	if (experimentalEnabled) {
		logger.info(
			createBrandedLog('auth_experimental_enabled', { resource: EXPERIMENTAL_RESOURCE_PATH }),
			'Experimental OAuth protected resource metadata enabled',
		);
		Object.assign(httpAuthenticator, { experimentalResource: EXPERIMENTAL_RESOURCE_PATH });
	} else {
		Object.assign(httpAuthenticator, { experimentalResource: null });
	}

	return httpAuthenticator;
}

/**
 * Export type for use in server setup
 */
export type { HttpAuthContext };
