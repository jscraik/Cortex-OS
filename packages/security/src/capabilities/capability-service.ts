/**
 * @file Capability Issuer Service
 * @description Service for issuing and managing short-lived capability tokens
 */

import { randomBytes } from 'node:crypto';
import type { Logger } from 'pino';
import { createSecurityBus } from '../a2a.js';
import { CapabilityTokenIssuer } from '../capabilities/capability-token.js';
import type { BudgetProfile, CapabilityDescriptor } from '../types.js';

const DEFAULT_BRANDING = 'brAInwav Capability Issuer';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const MAX_CAPABILITIES_PER_AGENT = 10;

export interface CapabilityRequest {
	/** Agent requesting capabilities */
	agent_id: string;
	/** Tenant context */
	tenant: string;
	/** Requested actions */
	actions: string[];
	/** Resource prefixes */
	resource_prefixes: string[];
	/** Maximum cost per capability */
	max_cost_per_capability?: number;
	/** Budget profile name */
	budget_profile?: string;
	/** TTL in seconds */
	ttl_seconds?: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

export interface CapabilityGrant {
	/** Granted capability tokens */
	tokens: string[];
	/** Parsed capability descriptors */
	capabilities: CapabilityDescriptor[];
	/** Expiration timestamp */
	expires_at: string;
	/** Grant ID for tracking */
	grant_id: string;
	/** brAInwav branding */
	branding: string;
}

export interface CapabilityIssuerConfig {
	/** Secret for signing capability tokens */
	capability_secret: string;
	/** Default TTL for capabilities */
	default_ttl_seconds?: number;
	/** Maximum TTL allowed */
	max_ttl_seconds?: number;
	/** Budget profiles */
	budget_profiles?: Record<string, BudgetProfile>;
	/** Agent-specific limits */
	agent_limits?: Record<string, { max_capabilities: number; max_cost: number }>;
}

export class CapabilityIssuerService {
	private readonly issuer: CapabilityTokenIssuer;
	private readonly logger: Logger;
	private readonly securityBus;
	private readonly grantTracker = new Map<string, CapabilityGrant>();

	constructor(
		private readonly config: CapabilityIssuerConfig,
		logger: Logger,
	) {
		this.logger = logger.child({
			component: 'capability-issuer',
			branding: DEFAULT_BRANDING,
		});

		this.issuer = new CapabilityTokenIssuer(config.capability_secret);

		const { bus } = createSecurityBus();
		this.securityBus = bus;
	}

	/**
	 * Issue capability tokens for an agent
	 */
	async issueCapabilities(request: CapabilityRequest): Promise<CapabilityGrant> {
		try {
			// Validate request
			this.validateCapabilityRequest(request);

			// Check agent limits
			await this.enforceAgentLimits(request.agent_id, request.actions.length);

			// Generate capability tokens
			const tokens: string[] = [];
			const capabilities: CapabilityDescriptor[] = [];
			const grant_id = `grant-${Date.now()}-${randomBytes(4).toString('hex')}`;

			const ttl = Math.min(
				request.ttl_seconds ?? this.config.default_ttl_seconds ?? DEFAULT_TTL_SECONDS,
				this.config.max_ttl_seconds ?? 3600, // 1 hour max
			);

			// Issue one token per action-resource combination
			for (const action of request.actions) {
				for (const resourcePrefix of request.resource_prefixes) {
					const tokenResult = this.issuer.issue({
						tenant: request.tenant,
						action,
						resourcePrefix,
						maxCost: request.max_cost_per_capability,
						budgetProfile: request.budget_profile,
						ttlSeconds: ttl,
						metadata: {
							...request.metadata,
							grant_id,
							agent_id: request.agent_id,
						},
					});

					tokens.push(tokenResult.token);
					capabilities.push({
						tenant: tokenResult.claims.tenant,
						action: tokenResult.claims.action,
						resourcePrefix: tokenResult.claims.resourcePrefix,
						maxCost: tokenResult.claims.maxCost,
						budgetProfile: tokenResult.claims.budgetProfile,
						claims: tokenResult.claims,
					});
				}
			}

			const grant: CapabilityGrant = {
				tokens,
				capabilities,
				expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
				grant_id,
				branding: DEFAULT_BRANDING,
			};

			// Track the grant
			this.grantTracker.set(grant_id, grant);

			// Emit capability issued event
			await this.emitCapabilityEvent('capability.issued', {
				grant_id,
				agent_id: request.agent_id,
				tenant: request.tenant,
				capabilities_count: capabilities.length,
				expires_at: grant.expires_at,
			});

			this.logger.info(
				{
					grant_id,
					agent_id: request.agent_id,
					tenant: request.tenant,
					capabilities_count: capabilities.length,
					ttl_seconds: ttl,
					branding: DEFAULT_BRANDING,
				},
				'Capability tokens issued',
			);

			return grant;
		} catch (error) {
			this.logger.error(
				{
					agent_id: request.agent_id,
					tenant: request.tenant,
					error: error instanceof Error ? error.message : 'unknown error',
					branding: DEFAULT_BRANDING,
				},
				'Failed to issue capability tokens',
			);

			throw error;
		}
	}

	/**
	 * Revoke capability grant
	 */
	async revokeCapabilities(grant_id: string, reason?: string): Promise<void> {
		const grant = this.grantTracker.get(grant_id);
		if (!grant) {
			throw new Error(`brAInwav grant not found: ${grant_id}`);
		}

		// Remove from tracking
		this.grantTracker.delete(grant_id);

		// Emit revocation event
		await this.emitCapabilityEvent('capability.revoked', {
			grant_id,
			reason: reason || 'Manual revocation',
			revoked_at: new Date().toISOString(),
		});

		this.logger.info(
			{
				grant_id,
				reason,
				branding: DEFAULT_BRANDING,
			},
			'Capability grant revoked',
		);
	}

	/**
	 * List active grants for an agent
	 */
	getActiveGrants(agent_id: string): CapabilityGrant[] {
		const now = new Date();
		const activeGrants: CapabilityGrant[] = [];

		for (const [grant_id, grant] of this.grantTracker.entries()) {
			if (new Date(grant.expires_at) < now) {
				// Clean up expired grant
				this.grantTracker.delete(grant_id);
				continue;
			}

			// Check if grant belongs to agent
			const hasAgentCapability = grant.capabilities.some(
				(cap) => cap.claims?.metadata?.agent_id === agent_id,
			);

			if (hasAgentCapability) {
				activeGrants.push(grant);
			}
		}

		return activeGrants;
	}

	/**
	 * Get capability usage statistics
	 */
	getCapabilityStats(): {
		active_grants: number;
		total_capabilities: number;
		grants_by_tenant: Record<string, number>;
		grants_by_agent: Record<string, number>;
	} {
		const now = new Date();
		let total_capabilities = 0;
		const grants_by_tenant: Record<string, number> = {};
		const grants_by_agent: Record<string, number> = {};

		// Clean up expired grants and collect stats
		for (const [grant_id, grant] of this.grantTracker.entries()) {
			if (new Date(grant.expires_at) < now) {
				this.grantTracker.delete(grant_id);
				continue;
			}

			total_capabilities += grant.capabilities.length;

			// Count by tenant
			const tenant = grant.capabilities[0]?.tenant || 'unknown';
			grants_by_tenant[tenant] = (grants_by_tenant[tenant] || 0) + 1;

			// Count by agent
			const agent_id = (grant.capabilities[0]?.claims?.metadata?.agent_id as string) || 'unknown';
			grants_by_agent[agent_id] = (grants_by_agent[agent_id] || 0) + 1;
		}

		return {
			active_grants: this.grantTracker.size,
			total_capabilities,
			grants_by_tenant,
			grants_by_agent,
		};
	}

	private validateCapabilityRequest(request: CapabilityRequest): void {
		if (!request.agent_id) {
			throw new Error('brAInwav agent_id is required');
		}

		if (!request.tenant) {
			throw new Error('brAInwav tenant is required');
		}

		if (!request.actions?.length) {
			throw new Error('brAInwav at least one action is required');
		}

		if (!request.resource_prefixes?.length) {
			throw new Error('brAInwav at least one resource prefix is required');
		}

		if (request.actions.length > MAX_CAPABILITIES_PER_AGENT) {
			throw new Error(`brAInwav too many actions requested (max: ${MAX_CAPABILITIES_PER_AGENT})`);
		}

		// Validate action format
		for (const action of request.actions) {
			if (!/^[a-zA-Z0-9:._-]+$/.exec(action)) {
				throw new Error(`brAInwav invalid action format: ${action}`);
			}
		}

		// Validate resource prefixes
		for (const prefix of request.resource_prefixes) {
			if (!/^[a-zA-Z0-9/:._-]+$/.exec(prefix)) {
				throw new Error(`brAInwav invalid resource prefix format: ${prefix}`);
			}
		}
	}

	private async enforceAgentLimits(
		agent_id: string,
		requested_capabilities: number,
	): Promise<void> {
		const limits = this.config.agent_limits?.[agent_id];
		if (!limits) {
			return; // No specific limits for this agent
		}

		const activeGrants = this.getActiveGrants(agent_id);
		const currentCapabilities = activeGrants.reduce(
			(sum, grant) => sum + grant.capabilities.length,
			0,
		);

		if (currentCapabilities + requested_capabilities > limits.max_capabilities) {
			throw new Error(
				`brAInwav capability limit exceeded for agent ${agent_id}: ` +
					`${currentCapabilities + requested_capabilities} > ${limits.max_capabilities}`,
			);
		}
	}

	private async emitCapabilityEvent(
		eventType: string,
		eventData: Record<string, unknown>,
	): Promise<void> {
		try {
			await this.securityBus.emit(eventType, {
				...eventData,
				timestamp: new Date().toISOString(),
				branding: DEFAULT_BRANDING,
			});
		} catch (error) {
			this.logger.warn(
				{
					eventType,
					error: error instanceof Error ? error.message : 'unknown event error',
					branding: DEFAULT_BRANDING,
				},
				'Failed to emit capability event',
			);
		}
	}
}
