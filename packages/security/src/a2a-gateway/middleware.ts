/**
 * @file A2A Gateway Express Middleware
 * @description HTTP middleware for zero-trust A2A authorization
 */

import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { A2AGateway } from './gateway.js';
import type { A2AContext, A2AGatewayConfig, RequestEnvelope } from './types.js';

const DEFAULT_BRANDING = 'brAInwav A2A Middleware';

export interface A2AMiddlewareOptions {
	/** Gateway configuration */
	config: A2AGatewayConfig;
	/** Logger instance */
	logger: Logger;
	/** Custom envelope extractor */
	extractEnvelope?: (req: Request) => RequestEnvelope | null;
	/** Custom context builder */
	buildContext?: (req: Request) => Partial<A2AContext>;
	/** Skip authorization for certain paths */
	skipPaths?: string[];
}

export interface AuthenticatedRequest extends Request {
	/** A2A authorization context */
	a2a?: {
		envelope: RequestEnvelope;
		decision_id: string;
		agent_id: string;
		tenant: string;
		capabilities: string[];
	};
}

export class A2AGatewayMiddleware {
	private readonly gateway: A2AGateway;
	private readonly logger: Logger;
	private readonly extractEnvelope: (req: Request) => RequestEnvelope | null;
	private readonly buildContext: (req: Request) => Partial<A2AContext>;
	private readonly skipPaths: Set<string>;

	constructor(options: A2AMiddlewareOptions) {
		this.gateway = new A2AGateway(options.config, options.logger);
		this.logger = options.logger.child({
			component: 'a2a-middleware',
			branding: DEFAULT_BRANDING,
		});

		this.extractEnvelope = options.extractEnvelope || this.defaultExtractEnvelope;
		this.buildContext = options.buildContext || this.defaultBuildContext;
		this.skipPaths = new Set(options.skipPaths || ['/health', '/ready', '/live']);
	}

	/**
	 * Express middleware function
	 */
	middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			// Skip authorization for configured paths
			if (this.skipPaths.has(req.path)) {
				return next();
			}

			// Extract request envelope
			const envelope = this.extractEnvelope(req);
			if (!envelope) {
				this.logger.warn(
					{
						path: req.path,
						method: req.method,
						branding: DEFAULT_BRANDING,
					},
					'No A2A envelope found in request',
				);

				res.status(401).json({
					error: 'Unauthorized',
					message: 'brAInwav A2A envelope required',
					branding: DEFAULT_BRANDING,
				});
				return;
			}

			// Build authorization context
			const context = this.buildContext(req);

			// Perform authorization
			const decision = await this.gateway.authorize(envelope, context);

			if (!decision.allow) {
				this.logger.warn(
					{
						agent_id: envelope.agent_id,
						action: envelope.action,
						resource: envelope.resource,
						reason: decision.reason,
						branding: DEFAULT_BRANDING,
					},
					'A2A request denied',
				);

				res.status(403).json({
					error: 'Forbidden',
					message: decision.reason || 'brAInwav access denied',
					violations: decision.violations,
					warnings: decision.warnings,
					branding: DEFAULT_BRANDING,
				});
				return;
			}

			// Attach A2A context to request
			(req as AuthenticatedRequest).a2a = {
				envelope,
				decision_id: this.extractDecisionId(decision),
				agent_id: envelope.agent_id,
				tenant: envelope.context.tenant,
				capabilities: envelope.capabilities,
			};

			// Add brAInwav headers to response
			res.set({
				'X-brAInwav-A2A-Decision': decision.allow ? 'allow' : 'deny',
				'X-brAInwav-A2A-Agent': envelope.agent_id,
				'X-brAInwav-A2A-Tenant': envelope.context.tenant,
				'X-brAInwav-Branding': DEFAULT_BRANDING,
			});

			this.logger.debug(
				{
					agent_id: envelope.agent_id,
					action: envelope.action,
					resource: envelope.resource,
					decision_id: this.extractDecisionId(decision),
					branding: DEFAULT_BRANDING,
				},
				'A2A request authorized',
			);

			return next();
		} catch (error) {
			this.logger.error(
				{
					error: error instanceof Error ? error.message : 'unknown middleware error',
					path: req.path,
					method: req.method,
					branding: DEFAULT_BRANDING,
				},
				'A2A middleware error',
			);

			res.status(500).json({
				error: 'Internal Server Error',
				message: 'brAInwav A2A authorization failed',
				branding: DEFAULT_BRANDING,
			});
		}
	};

	/**
	 * Default envelope extractor - expects envelope in request body
	 */
	private defaultExtractEnvelope(req: Request): RequestEnvelope | null {
		// Try request body first
		if (req.body && this.isValidEnvelope(req.body)) {
			return req.body as RequestEnvelope;
		}

		// Try X-brAInwav-A2A-Envelope header
		const envelopeHeader = req.headers['x-brainwav-a2a-envelope'];
		if (typeof envelopeHeader === 'string') {
			try {
				const parsed = JSON.parse(Buffer.from(envelopeHeader, 'base64').toString('utf8'));
				if (this.isValidEnvelope(parsed)) {
					return parsed as RequestEnvelope;
				}
			} catch {
				// Invalid JSON in header, fall through
			}
		}

		return null;
	}

	/**
	 * Default context builder - extracts metadata from HTTP request
	 */
	private defaultBuildContext(req: Request): Partial<A2AContext> {
		return {
			authn: {
				valid: true,
				method: 'envelope',
			},
			metadata: {
				source_ip: this.getClientIP(req),
				user_agent: req.headers['user-agent'],
				correlation_id: req.headers['x-correlation-id'] as string,
			},
		};
	}

	private isValidEnvelope(obj: unknown): boolean {
		if (!obj || typeof obj !== 'object') return false;

		const envelope = obj as Record<string, unknown>;
		return !!(
			envelope.req_id &&
			envelope.agent_id &&
			envelope.action &&
			envelope.resource &&
			envelope.context &&
			envelope.capabilities &&
			envelope.sig
		);
	}

	private getClientIP(req: Request): string {
		return (
			(req.headers['x-forwarded-for'] as string) ||
			(req.headers['x-real-ip'] as string) ||
			req.socket.remoteAddress ||
			'unknown'
		)
			.split(',')[0]
			.trim();
	}

	private extractDecisionId(decision: { decided_at: string }): string {
		// Extract decision ID from timestamp or generate one
		return `decision-${new Date(decision.decided_at).getTime()}`;
	}
}

/**
 * Factory function to create A2A middleware
 */
export function createA2AMiddleware(options: A2AMiddlewareOptions) {
	const middleware = new A2AGatewayMiddleware(options);
	return middleware.middleware;
}
