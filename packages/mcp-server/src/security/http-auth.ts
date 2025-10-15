import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { recordAuthOutcome } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import type { Span } from '@opentelemetry/api';
import {
	buildWwwAuthenticateHeader,
	verifyAuth0Jwt,
	type Auth0JwtError,
	type Auth0JwtSuccess,
} from '@cortex-os/mcp-auth';
import type { Logger } from 'pino';
import type { AuthConfig } from '../config/auth.js';

export type HttpAuthContext = {
	authenticated: true;
	issuedAt: string;
	subject: 'api-key' | 'stdio' | 'oauth' | 'anonymous';
	subjectId: string;
	token?: Auth0JwtSuccess;
};

type AuthMetrics = {
	attempts: number;
	successes: number;
	failures: number;
	lastSuccessAt?: string;
	lastFailureAt?: string;
};

type CreateHttpAuthenticatorOptions = {
	brandPrefix: string;
	connectLogMessage: string;
	logger: Logger;
	logInterval?: number;
	authConfig: AuthConfig;
	realm?: string;
	authorizationUrl?: string;
	resourceMetadataUrl?: string;
};

const DEFAULT_METRIC_INTERVAL = 50;

const getHeaderValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0];
	}

	return typeof value === 'string' ? value : undefined;
};

const extractApiKeyFromRequest = (request: IncomingMessage): string | undefined => {
	const headerValue = getHeaderValue(request.headers?.['x-api-key']);

	if (headerValue) {
		return headerValue.trim();
	}

	const authorizationHeader = getHeaderValue(request.headers?.authorization);

	if (!authorizationHeader) {
		return undefined;
	}

	const [scheme, token] = authorizationHeader.split(/\s+/);

	if (!token) {
		return undefined;
	}

	switch (scheme.toLowerCase()) {
		case 'bearer':
			return token.trim();
		case 'basic': {
			try {
				const decoded = Buffer.from(token, 'base64').toString('utf8');
				const parts = decoded.split(':');
				const basicToken = parts.length > 1 ? parts[1] : parts[0];
				return basicToken?.trim();
			} catch {
				return undefined;
			}
		}
		default:
			return undefined;
	}
};

const extractBearerToken = (request: IncomingMessage): string | undefined => {
	const authorizationHeader = getHeaderValue(request.headers?.authorization);
	if (!authorizationHeader) {
		return undefined;
	}
	const [scheme, token] = authorizationHeader.split(/\s+/);
	if (!token || scheme.toLowerCase() !== 'bearer') {
		return undefined;
	}
	return token.trim();
};

type UnauthorizedParams = {
	realm: string;
	authorizationUrl?: string;
	resourceMetadataUrl?: string;
	scope?: string[];
};

const createUnauthorizedResponse = (
	params: UnauthorizedParams,
	error: string,
	description: string,
): Response => {
	const header = buildWwwAuthenticateHeader({
		realm: params.realm,
		authorizationUrl: params.authorizationUrl ?? '',
		resourceMetadataUrl: params.resourceMetadataUrl ?? '',
		error,
		errorDescription: description,
		scope: params.scope && params.scope.length > 0 ? params.scope : undefined,
	});
	return new Response(description, {
		status: 401,
		headers: { 'WWW-Authenticate': header },
	});
};

type BearerVerifier = (
	token: string,
	signal: AbortSignal | undefined,
) => Promise<Auth0JwtSuccess | Auth0JwtError>;

const createBearerVerifier = (config: AuthConfig): BearerVerifier | null => {
	const auth0 = config.auth0;
	if (!auth0) {
		return null;
	}
	const requiredScopes = config.enforceScopes ? auth0.requiredScopes : [];
	return async (token) => {
		return verifyAuth0Jwt(token, {
			domain: auth0.domain,
			audience: auth0.audience,
			requiredScopes,
		});
	};
};

export const createHttpAuthenticator = ({
	brandPrefix,
	connectLogMessage,
	logger,
	logInterval,
	authConfig,
	realm = 'MCP',
	authorizationUrl,
	resourceMetadataUrl,
}: CreateHttpAuthenticatorOptions) => {
	let missingApiKeyLogged = false;
	const metrics: AuthMetrics = {
		attempts: 0,
		successes: 0,
		failures: 0,
	};
	const bearerVerifier = createBearerVerifier(authConfig);
	const allowBearer = Boolean(bearerVerifier);
	const allowApiKey =
		Boolean(authConfig.apiKey) && (authConfig.mode === 'api-key' || authConfig.mode === 'optional');
	const requireBearer = authConfig.mode === 'oauth2';
	const unauthorizedParams: UnauthorizedParams = {
		realm,
		authorizationUrl,
		resourceMetadataUrl,
		scope: authConfig.auth0?.requiredScopes,
	};

	const metricInterval =
		typeof logInterval === 'number' && logInterval > 0 ? logInterval : DEFAULT_METRIC_INTERVAL;

	const maybeLogMetrics = (level: 'info' | 'warn', message: string) => {
		const totalEvents = metrics.successes + metrics.failures;
		if (totalEvents === 1 || (metricInterval > 0 && totalEvents % metricInterval === 0)) {
			logger[level]({ branding: brandPrefix, authMetrics: { ...metrics, totalEvents } }, message);
		}
	};

	const scrubBuffer = (buffer: Buffer) => {
		buffer.fill(0);
	};

	const recordFailure = (
		span: Span | undefined,
		logLevel: 'warn' | 'error',
		logMessage: string,
		userMessage: string,
		response?: Response,
	): never => {
		metrics.failures += 1;
		metrics.lastFailureAt = new Date().toISOString();
		recordAuthOutcome('failure');
		span?.setAttribute('mcp.auth.outcome', 'failure');
		logger[logLevel](
			{ branding: brandPrefix, reason: userMessage, authMetrics: { ...metrics } },
			logMessage,
		);
		maybeLogMetrics('warn', 'HTTP authentication failure telemetry sample');
		if (response) {
			throw response;
		}
		throw new Error(userMessage);
	};

	const authenticate = async (request: IncomingMessage): Promise<HttpAuthContext> => {
		return withSpan(
			'mcp.http.authenticate',
			{ 'mcp.transport': request ? 'http' : 'stdio' },
			async (span) => {
				metrics.attempts += 1;

				if (!request) {
					const issuedAt = new Date().toISOString();
					const context: HttpAuthContext = {
						authenticated: true,
						issuedAt,
						subject: 'stdio',
						subjectId: 'stdio',
					};
					metrics.successes += 1;
					metrics.lastSuccessAt = issuedAt;
					recordAuthOutcome('success');
					span.setAttribute('mcp.auth.outcome', 'success');
					logger.info(
						{ branding: brandPrefix, session: context },
						`${brandPrefix} STDIO session authenticated`,
					);
					return context;
				}

				if (!request.headers) {
					return recordFailure(
						span,
						'warn',
						'Rejected HTTP request: headers not available for authentication',
						'Unauthorized: Missing request headers',
					);
				}

				const bearerToken = extractBearerToken(request);

				if (bearerToken) {
					if (!allowBearer || !bearerVerifier) {
						const response = createUnauthorizedResponse(
							unauthorizedParams,
							'invalid_request',
							'OAuth bearer tokens are not enabled for this server',
						);
						return recordFailure(
							span,
							'warn',
							'Rejected HTTP request: bearer token received but OAuth is disabled',
							'Unauthorized: Bearer token rejected',
							response,
						);
					}

					const verification = await bearerVerifier(bearerToken, undefined);
					if (!verification.ok) {
						const errorCode =
							verification.code === 'insufficient_scope' ? 'insufficient_scope' : 'invalid_token';
						const response = createUnauthorizedResponse(
							unauthorizedParams,
							errorCode,
							verification.message,
						);
						return recordFailure(
							span,
							'warn',
							`Rejected HTTP request: ${verification.message}`,
							verification.message,
							response,
						);
					}

					const issuedAt = new Date().toISOString();
					metrics.successes += 1;
					metrics.lastSuccessAt = issuedAt;
					recordAuthOutcome('success');
					span.setAttribute('mcp.auth.outcome', 'success');
					span.setAttribute('mcp.auth.subject_id', verification.subject);
					maybeLogMetrics('info', 'HTTP authentication success telemetry sample');

					const context: HttpAuthContext = {
						authenticated: true,
						issuedAt,
						subject: 'oauth',
						subjectId: verification.subject,
						token: verification,
					};

					logger.info(
						{ branding: brandPrefix, session: context },
						`${brandPrefix} OAuth bearer token authenticated`,
					);

					return context;
				}

				const allowAnonymous =
					authConfig.mode === 'anonymous' || authConfig.mode === 'optional';
				const configuredKey = authConfig.apiKey;

				if (allowApiKey) {
					if (!configuredKey) {
						const level: 'warn' | 'error' = missingApiKeyLogged ? 'warn' : 'error';
						missingApiKeyLogged = true;
						return recordFailure(
							span,
							level,
							'MCP_API_KEY not configured; refusing HTTP request in HTTP transport mode',
							'Authentication misconfigured: MCP_API_KEY is not configured',
						);
					}

					const providedKey = extractApiKeyFromRequest(request);

					if (providedKey) {
						const expectedBuffer = Buffer.from(configuredKey, 'utf8');
						const providedBuffer = Buffer.from(providedKey, 'utf8');

						if (expectedBuffer.length !== providedBuffer.length) {
							scrubBuffer(expectedBuffer);
							scrubBuffer(providedBuffer);
							return recordFailure(
								span,
								'warn',
								'Rejected HTTP request: invalid MCP API key (length mismatch)',
								'Unauthorized: Invalid MCP API key',
							);
						}

						let isValid = false;

						try {
							isValid = timingSafeEqual(expectedBuffer, providedBuffer);
						} catch {
							isValid = false;
						}

						if (!isValid) {
							scrubBuffer(expectedBuffer);
							scrubBuffer(providedBuffer);
							return recordFailure(
								span,
								'warn',
								'Rejected HTTP request: invalid MCP API key (mismatch)',
								'Unauthorized: Invalid MCP API key',
							);
						}

						const digest = createHash('sha256').update(providedBuffer).digest('hex');
						const issuedAt = new Date().toISOString();

						scrubBuffer(expectedBuffer);
						scrubBuffer(providedBuffer);

						metrics.successes += 1;
						metrics.lastSuccessAt = issuedAt;
						recordAuthOutcome('success');
						span.setAttribute('mcp.auth.outcome', 'success');
						span.setAttribute('mcp.auth.subject_id', `sha256:${digest}`);
						maybeLogMetrics('info', 'HTTP authentication success telemetry sample');

						const context: HttpAuthContext = {
							authenticated: true,
							issuedAt,
							subject: 'api-key',
							subjectId: `sha256:${digest}`,
						};

						logger.info({ branding: brandPrefix, session: context }, connectLogMessage);

						return context;
					}

					if (!allowAnonymous) {
						return recordFailure(
							span,
							'warn',
							'Rejected HTTP request: missing MCP API key',
							'Unauthorized: Missing MCP API key',
						);
					}
				} else if (authConfig.mode === 'api-key') {
					const level: 'warn' | 'error' = missingApiKeyLogged ? 'warn' : 'error';
					missingApiKeyLogged = true;
					return recordFailure(
						span,
						level,
						'MCP_API_KEY not configured; refusing HTTP request in HTTP transport mode',
						'Authentication misconfigured: MCP_API_KEY is not configured',
					);
				}

				if (requireBearer) {
					const response = createUnauthorizedResponse(
						unauthorizedParams,
						'invalid_request',
						'Bearer token required for this server',
					);
					return recordFailure(
						span,
						'warn',
						'Rejected HTTP request: missing bearer token',
						'Unauthorized: Missing bearer token',
						response,
					);
				}

				if (!allowAnonymous) {
					return recordFailure(
						span,
						'warn',
						'Rejected HTTP request: missing authentication credentials',
						'Unauthorized: Missing credentials',
					);
				}

				const issuedAt = new Date().toISOString();

				metrics.successes += 1;
				metrics.lastSuccessAt = issuedAt;
				recordAuthOutcome('success');
				span.setAttribute('mcp.auth.outcome', 'success');
				maybeLogMetrics('info', 'HTTP authentication success telemetry sample');

				const context: HttpAuthContext = {
					authenticated: true,
					issuedAt,
					subject: 'anonymous',
					subjectId: 'anonymous',
				};

				logger.info(
					{ branding: brandPrefix, session: context },
					`${brandPrefix} HTTP request accepted without credentials`,
				);

				return context;
			},
		);
	};

	const logAcceptedHeaders = () => {
		logger.info(
			{ branding: brandPrefix },
			'Accepted authentication headers: X-API-Key, Authorization: Bearer, Authorization: Basic (password only)',
		);
	};

	return {
		authenticate,
		logAcceptedHeaders,
	};
};

export type HttpAuthenticator = ReturnType<typeof createHttpAuthenticator>;
