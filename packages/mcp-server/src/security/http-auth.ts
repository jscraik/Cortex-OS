import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { recordAuthOutcome } from '@cortex-os/mcp-bridge/runtime/telemetry/metrics';
import { withSpan } from '@cortex-os/mcp-bridge/runtime/telemetry/tracing';
import type { Span } from '@opentelemetry/api';
import type { Logger } from 'pino';

export type HttpAuthContext = {
	authenticated: true;
	issuedAt: string;
	subject: 'api-key' | 'stdio';
	subjectId: string;
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

export const createHttpAuthenticator = ({
	brandPrefix,
	connectLogMessage,
	logger,
	logInterval,
}: CreateHttpAuthenticatorOptions) => {
	let missingApiKeyLogged = false;
	const metrics: AuthMetrics = {
		attempts: 0,
		successes: 0,
		failures: 0,
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

				const configuredKey = process.env.MCP_API_KEY?.trim();

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

				if (!request.headers) {
					return recordFailure(
						span,
						'warn',
						'Rejected HTTP request: headers not available for authentication',
						'Unauthorized: Missing request headers',
					);
				}

				const providedKey = extractApiKeyFromRequest(request);

				if (!providedKey) {
					return recordFailure(
						span,
						'warn',
						'Rejected HTTP request: missing MCP API key',
						'Unauthorized: Missing MCP API key',
					);
				}

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
