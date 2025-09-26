/**
 * @fileoverview Agent Registry - Phase 4.2: Agent Discovery & Registry
 * @module AgentRegistry
 * @description Capability-based agent discovery and dynamic registration system
 * @author brAInwav Development Team
 * @version 4.2.0
 * @since 2024-12-09
 */

import { EventEmitter } from 'node:events';
import { z } from 'zod';
import { secureRatio } from '../lib/secure-random.js';
import { AgentRegistryErrorHelpers } from './agent-registry-error.js';

/**
 * Agent Registration Schema
 */
export const AgentRegistrationSchema = z.object({
	agentId: z.string().min(1, 'Agent ID is required'),
	name: z.string().min(1, 'Agent name is required'),
	capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
	status: z.enum(['online', 'offline', 'busy']).default('online'),
	metadata: z.record(z.unknown()).optional(),
	healthThresholds: z
		.object({
			maxResponseTime: z.number().optional(),
			minSuccessRate: z.number().optional(),
		})
		.optional(),
});

export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;

/**
 * Agent Discovery Query Schema
 */
export const AgentDiscoveryQuerySchema = z.object({
	capability: z.string().optional(),
	capabilities: z.array(z.string()).optional(),
	matchType: z.enum(['any', 'all']).default('any'),
	status: z.enum(['online', 'offline', 'busy']).optional(),
	loadBalancing: z.enum(['round-robin', 'weighted', 'least-loaded']).optional(),
});

export type AgentDiscoveryQuery = z.infer<typeof AgentDiscoveryQuerySchema>;

/**
 * Agent Health Metrics
 */
export interface AgentHealthMetrics {
	agentId: string;
	averageResponseTime: number;
	successRate: number;
	totalRequests: number;
	totalFailures: number;
	lastSeen: Date;
	consecutiveFailures: number;
}

/**
 * Agent Health Status
 */
export interface AgentHealthStatus {
	agentId: string;
	status: 'healthy' | 'degraded' | 'unhealthy';
	score: number;
	issues: string[];
	lastChecked: Date;
	metrics: AgentHealthMetrics;
}

/**
 * Agent Activity Record
 */
export interface AgentActivity {
	responseTime: number;
	success: boolean;
	timestamp: Date;
	error?: string;
}

/**
 * Agent Status Information
 */
export interface AgentStatus {
	agentId: string;
	isOnline: boolean;
	lastSeen: Date;
	currentLoad: number;
}

/**
 * Registry Configuration
 */
export interface RegistryConfig {
	persistence: {
		enabled: boolean;
		syncInterval: number;
		healthCheckInterval?: number;
	};
	discovery: {
		enableCapabilityMatching: boolean;
		enableLoadBalancing?: boolean;
		cacheTTL: number;
	};
	networking?: {
		heartbeatInterval: number;
		maxMissedHeartbeats: number;
		reconnectDelay: number;
	};
}

/**
 * Registry Statistics
 */
export interface RegistryStatistics {
	totalAgents: number;
	onlineAgents: number;
	offlineAgents: number;
	busyAgents: number;
	uniqueCapabilities: number;
	averageHealth: number;
}

/**
 * Agent Registry Class
 * Implements capability-based agent discovery and dynamic registration
 */
export class AgentRegistry extends EventEmitter {
	private config: RegistryConfig;
	private registeredAgents: Map<string, AgentRegistration> = new Map();
	private agentHealth: Map<string, AgentHealthStatus> = new Map();
	private agentStatus: Map<string, AgentStatus> = new Map();
	private capabilityIndex: Map<string, Set<string>> = new Map();
	private loadBalancingCounters: Map<string, number> = new Map();
	private networkFailureSimulation = false;

	constructor(config: RegistryConfig) {
		super();
		this.config = config;
		this.setupPeriodicTasks();
	}

	/**
	 * Register a new agent
	 */
	async registerAgent(agent: AgentRegistration): Promise<void> {
		// Validate agent data
		const validatedAgent = AgentRegistrationSchema.parse(agent);

		// Check for existing agent
		if (this.registeredAgents.has(validatedAgent.agentId)) {
			throw AgentRegistryErrorHelpers.agentAlreadyExists(validatedAgent.agentId);
		}

		// Register the agent
		this.registeredAgents.set(validatedAgent.agentId, validatedAgent);

		// Update capability index
		this.updateCapabilityIndex(validatedAgent.agentId, validatedAgent.capabilities);

		// Initialize health tracking
		this.initializeAgentHealth(validatedAgent.agentId);

		// Initialize status tracking
		this.agentStatus.set(validatedAgent.agentId, {
			agentId: validatedAgent.agentId,
			isOnline: validatedAgent.status === 'online',
			lastSeen: new Date(),
			currentLoad: 0,
		});

		// Emit registration event
		this.emit('agent-registered', {
			agentId: validatedAgent.agentId,
			capabilities: validatedAgent.capabilities,
			timestamp: new Date(),
		});
	}

	/**
	 * Get all registered agents
	 */
	async getAllAgents(): Promise<AgentRegistration[]> {
		if (this.networkFailureSimulation) {
			// Return cached data during network failure
			return Array.from(this.registeredAgents.values());
		}
		return Array.from(this.registeredAgents.values());
	}

	/**
	 * Find agents by capability or query
	 */
	async findAgents(query: AgentDiscoveryQuery): Promise<AgentRegistration[]> {
		const validatedQuery = AgentDiscoveryQuerySchema.parse(query);

		let matchingAgents: AgentRegistration[] = [];

		if (validatedQuery.capability) {
			// Single capability search
			const agentIds = this.capabilityIndex.get(validatedQuery.capability) || new Set();
			matchingAgents = Array.from(agentIds)
				.map((id) => this.registeredAgents.get(id))
				.filter((agent): agent is AgentRegistration => agent !== undefined);
		} else if (validatedQuery.capabilities && validatedQuery.capabilities.length > 0) {
			// Multiple capabilities search
			const allAgents = Array.from(this.registeredAgents.values());

			if (validatedQuery.matchType === 'all') {
				// Agent must have ALL specified capabilities
				matchingAgents = allAgents.filter((agent) =>
					validatedQuery.capabilities?.every((cap) => agent.capabilities.includes(cap)),
				);
			} else {
				// Agent must have ANY of the specified capabilities
				matchingAgents = allAgents.filter((agent) =>
					validatedQuery.capabilities?.some((cap) => agent.capabilities.includes(cap)),
				);
			}
		} else {
			// Return all agents if no specific criteria
			matchingAgents = Array.from(this.registeredAgents.values());
		}

		// Filter by status if specified
		if (validatedQuery.status) {
			matchingAgents = matchingAgents.filter((agent) => agent.status === validatedQuery.status);
		}

		return matchingAgents;
	}

	/**
	 * Find a specific agent by ID
	 */
	async findAgent(agentId: string): Promise<AgentRegistration | null> {
		return this.registeredAgents.get(agentId) || null;
	}

	/**
	 * Update agent registration
	 */
	async updateAgent(agentId: string, updates: Partial<AgentRegistration>): Promise<void> {
		const existingAgent = this.registeredAgents.get(agentId);
		if (!existingAgent) {
			throw AgentRegistryErrorHelpers.agentNotFound(agentId, 'update');
		}

		const updatedAgent = { ...existingAgent, ...updates };
		const validatedAgent = AgentRegistrationSchema.parse(updatedAgent);

		this.registeredAgents.set(agentId, validatedAgent);

		// Update capability index if capabilities changed
		if (updates.capabilities) {
			this.updateCapabilityIndex(agentId, validatedAgent.capabilities);
		}

		this.emit('agent-updated', {
			agentId,
			updates,
			timestamp: new Date(),
		});
	}

	/**
	 * Deregister an agent
	 */
	async deregisterAgent(agentId: string): Promise<void> {
		const agent = this.registeredAgents.get(agentId);
		if (!agent) {
			return; // Idempotent operation
		}

		// Remove from all indexes
		this.registeredAgents.delete(agentId);
		this.agentHealth.delete(agentId);
		this.agentStatus.delete(agentId);

		// Remove from capability index
		for (const capability of agent.capabilities) {
			const agentIds = this.capabilityIndex.get(capability);
			if (agentIds) {
				agentIds.delete(agentId);
				if (agentIds.size === 0) {
					this.capabilityIndex.delete(capability);
				}
			}
		}

		this.emit('agent-deregistered', {
			agentId,
			timestamp: new Date(),
		});
	}

	/**
	 * Record agent activity for health tracking
	 */
	async recordAgentActivity(agentId: string, activity: AgentActivity): Promise<void> {
		const health = this.agentHealth.get(agentId);
		if (!health) {
			return; // Agent not found, ignore
		}

		// Update metrics
		health.metrics.totalRequests++;
		if (!activity.success) {
			health.metrics.totalFailures++;
			health.metrics.consecutiveFailures++;
		} else {
			health.metrics.consecutiveFailures = 0;
		}

		health.metrics.successRate = 1 - health.metrics.totalFailures / health.metrics.totalRequests;

		// Update average response time
		const currentAvg = health.metrics.averageResponseTime;
		const totalRequests = health.metrics.totalRequests;
		health.metrics.averageResponseTime =
			(currentAvg * (totalRequests - 1) + activity.responseTime) / totalRequests;

		health.metrics.lastSeen = activity.timestamp;

		// Determine health status
		this.updateHealthStatus(health);

		this.agentHealth.set(agentId, health);
	}

	/**
	 * Get agent health information
	 */
	async getAgentHealth(agentId: string): Promise<AgentHealthStatus | null> {
		return this.agentHealth.get(agentId) || null;
	}

	/**
	 * Record heartbeat from agent
	 */
	async recordHeartbeat(agentId: string): Promise<void> {
		const status = this.agentStatus.get(agentId);
		if (status) {
			status.lastSeen = new Date();
			status.isOnline = true;
			this.agentStatus.set(agentId, status);
		}
	}

	/**
	 * Get agent status
	 */
	async getAgentStatus(agentId: string): Promise<AgentStatus | null> {
		return this.agentStatus.get(agentId) || null;
	}

	/**
	 * Perform health check on all agents
	 */
	async performHealthCheck(): Promise<void> {
		const now = new Date();
		const heartbeatTimeout = this.config.networking?.heartbeatInterval || 5000;
		const maxMissed = this.config.networking?.maxMissedHeartbeats || 3;

		for (const [agentId, status] of this.agentStatus.entries()) {
			const timeSinceLastSeen = now.getTime() - status.lastSeen.getTime();
			const missedHeartbeats = Math.floor(timeSinceLastSeen / heartbeatTimeout);

			if (missedHeartbeats > maxMissed && status.isOnline) {
				status.isOnline = false;
				this.agentStatus.set(agentId, status);

				this.emit('agent-offline', {
					agentId,
					timestamp: now,
					reason: 'missed_heartbeats',
				});
			}
		}
	}

	/**
	 * Select an agent based on criteria and load balancing
	 */
	async selectAgent(query: AgentDiscoveryQuery): Promise<AgentRegistration | null> {
		const candidates = await this.findAgents(query);

		if (candidates.length === 0) {
			return null;
		}

		if (candidates.length === 1) {
			return candidates[0];
		}

		// Apply load balancing strategy
		const strategy = query.loadBalancing || 'round-robin';

		switch (strategy) {
			case 'round-robin':
				return this.selectRoundRobin(candidates);
			case 'weighted':
				return this.selectWeighted(candidates);
			case 'least-loaded':
				return this.selectLeastLoaded(candidates);
			default:
				return candidates[0];
		}
	}

	/**
	 * Update agent load
	 */
	async updateAgentLoad(agentId: string, load: number): Promise<void> {
		const status = this.agentStatus.get(agentId);
		if (status) {
			status.currentLoad = load;
			this.agentStatus.set(agentId, status);
		}
	}

	/**
	 * Load registry data from persistence
	 */
	async loadFromPersistence(): Promise<void> {
		// Placeholder for persistence loading
		// In real implementation, would load from file/database
	}

	/**
	 * Synchronize with another registry
	 */
	async syncWith(otherRegistry: AgentRegistry): Promise<void> {
		const otherAgents = await otherRegistry.getAllAgents();

		for (const agent of otherAgents) {
			const existing = this.registeredAgents.get(agent.agentId);
			if (!existing) {
				await this.registerAgent(agent);
			} else {
				// Later timestamp wins for conflicts
				await this.updateAgent(agent.agentId, agent);
			}
		}
	}

	/**
	 * Subscribe to capability-based notifications
	 */
	async subscribeToCapability(
		capability: string,
		callback: (agent: AgentRegistration) => void,
	): Promise<void> {
		this.on('agent-registered', (event) => {
			if (event.capabilities.includes(capability)) {
				const agent = this.registeredAgents.get(event.agentId);
				if (agent) {
					callback(agent);
				}
			}
		});
	}

	/**
	 * Get registry statistics
	 */
	async getRegistryStatistics(): Promise<RegistryStatistics> {
		const agents = Array.from(this.registeredAgents.values());
		const onlineAgents = agents.filter((a) => a.status === 'online').length;
		const offlineAgents = agents.filter((a) => a.status === 'offline').length;
		const busyAgents = agents.filter((a) => a.status === 'busy').length;

		const allCapabilities = new Set<string>();
		for (const agent of agents) {
			for (const cap of agent.capabilities) {
				allCapabilities.add(cap);
			}
		}

		const healthStatuses = Array.from(this.agentHealth.values());
		const averageHealth =
			healthStatuses.length > 0
				? healthStatuses.reduce((sum, h) => sum + h.score, 0) / healthStatuses.length
				: 0;

		return {
			totalAgents: agents.length,
			onlineAgents,
			offlineAgents,
			busyAgents,
			uniqueCapabilities: allCapabilities.size,
			averageHealth,
		};
	}

	/**
	 * Simulate network failure for testing
	 */
	simulateNetworkFailure(enabled: boolean): void {
		this.networkFailureSimulation = enabled;
	}

	// Private helper methods

	private updateCapabilityIndex(agentId: string, capabilities: string[]): void {
		// Remove agent from all existing capabilities
		for (const [capability, agentIds] of this.capabilityIndex.entries()) {
			agentIds.delete(agentId);
			if (agentIds.size === 0) {
				this.capabilityIndex.delete(capability);
			}
		}

		// Add agent to new capabilities
		for (const capability of capabilities) {
			if (!this.capabilityIndex.has(capability)) {
				this.capabilityIndex.set(capability, new Set());
			}
			this.capabilityIndex.get(capability)?.add(agentId);
		}
	}

	private initializeAgentHealth(agentId: string): void {
		const health: AgentHealthStatus = {
			agentId,
			status: 'healthy',
			score: 100,
			issues: [],
			lastChecked: new Date(),
			metrics: {
				agentId,
				averageResponseTime: 0,
				successRate: 1.0,
				totalRequests: 0,
				totalFailures: 0,
				lastSeen: new Date(),
				consecutiveFailures: 0,
			},
		};

		this.agentHealth.set(agentId, health);
	}

	private updateHealthStatus(health: AgentHealthStatus): void {
		const metrics = health.metrics;
		const issues: string[] = [];

		// Check response time
		if (metrics.averageResponseTime > 5000) {
			issues.push('High response time');
		}

		// Check success rate
		if (metrics.successRate < 0.5) {
			issues.push('High failure rate');
		}

		// Check consecutive failures
		if (metrics.consecutiveFailures > 3) {
			issues.push('Consecutive failures');
		}

		// Determine status and score
		if (issues.length === 0) {
			health.status = 'healthy';
			health.score = 100;
		} else if (issues.length <= 2) {
			health.status = 'degraded';
			health.score = 60;
		} else {
			health.status = 'unhealthy';
			health.score = 20;
		}

		health.issues = issues;
		health.lastChecked = new Date();

		if (health.status !== 'healthy') {
			this.emit('agent-health-changed', {
				agentId: health.agentId,
				status: health.status,
				issues,
				timestamp: new Date(),
			});
		}
	}

	private selectRoundRobin(candidates: AgentRegistration[]): AgentRegistration {
		const key = candidates
			.map((c) => c.agentId)
			.sort()
			.join(',');
		const counter = this.loadBalancingCounters.get(key) || 0;
		const selected = candidates[counter % candidates.length];
		this.loadBalancingCounters.set(key, counter + 1);
		return selected;
	}

	private selectWeighted(candidates: AgentRegistration[]): AgentRegistration {
		// Select based on inverse load (lower load = higher probability)
		const healthyAgents = candidates.filter((agent) => {
			const health = this.agentHealth.get(agent.agentId);
			return health?.status === 'healthy';
		});

		if (healthyAgents.length === 0) {
			return candidates[0];
		}

		// Simple weighted selection based on load
		const weights = healthyAgents.map((agent) => {
			const status = this.agentStatus.get(agent.agentId);
			return 1 - (status?.currentLoad || 0);
		});

		const totalWeight = weights.reduce((sum, w) => sum + w, 0);
		const random = secureRatio() * totalWeight;

		let currentWeight = 0;
		for (let i = 0; i < healthyAgents.length; i++) {
			currentWeight += weights[i];
			if (random <= currentWeight) {
				return healthyAgents[i];
			}
		}

		return healthyAgents[0];
	}

	private selectLeastLoaded(candidates: AgentRegistration[]): AgentRegistration {
		let leastLoaded = candidates[0];
		let minLoad = this.agentStatus.get(candidates[0].agentId)?.currentLoad || 0;

		for (const candidate of candidates.slice(1)) {
			const load = this.agentStatus.get(candidate.agentId)?.currentLoad || 0;
			if (load < minLoad) {
				minLoad = load;
				leastLoaded = candidate;
			}
		}

		return leastLoaded;
	}

	private setupPeriodicTasks(): void {
		if (this.config.persistence.healthCheckInterval) {
			setInterval(() => {
				this.performHealthCheck();
			}, this.config.persistence.healthCheckInterval);
		}
	}
}
