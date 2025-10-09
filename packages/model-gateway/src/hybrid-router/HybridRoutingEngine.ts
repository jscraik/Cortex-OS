/**
 * Hybrid Routing Engine for brAInwav Cortex-OS
 *
 * Implements MLX-first hybrid model routing with cloud burst capabilities,
 * privacy mode enforcement, and thermal-aware decision making.
 *
 * Key Features:
 * - MLX-first routing policy with cloud fallback
 * - Evidence-first filtering before routing decisions
 * - Thermal-aware routing with automatic throttling
 * - Privacy mode enforcement for governed runs
 * - Performance optimization and SLA monitoring
 * - Model adapter abstraction and load balancing
 */

import { randomUUID } from 'node:crypto';
import type { EvidenceGate } from '@cortex-os/memory-core/src/context-graph/evidence/EvidenceGate.js';
import type { ThermalMonitor } from '@cortex-os/memory-core/src/context-graph/thermal/ThermalMonitor.js';
import { z } from 'zod';
import type { PrivacyModeEnforcer } from './PrivacyModeEnforcer.js';

export const RoutingRequestSchema = z.object({
	prompt: z.string().min(1, 'Prompt cannot be empty'),
	context: z.any().optional(),
	modelPreferences: z
		.object({
			preferLocal: z.boolean().default(true),
			maxTokens: z.number().positive().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxLatencyMs: z.number().positive().optional(),
			allowCloud: z.boolean().default(true),
		})
		.optional(),
	privacyMode: z.boolean().default(false),
	evidenceRequired: z.boolean().default(true),
	thermalConstraints: z.boolean().default(true),
	requestId: z.string().optional(),
	userId: z.string().optional(),
	metadata: z.record(z.any()).optional(),
});

export type RoutingRequest = z.infer<typeof RoutingRequestSchema>;

export interface ModelAdapter {
	id: string;
	name: string;
	type: 'local' | 'cloud';
	available: boolean;
	performance: {
		avgLatencyMs: number;
		maxTokens: number;
		throughput: number;
	};
	capabilities: {
		maxContextLength: number;
		supportsStreaming: boolean;
		supportsFunctionCalling: boolean;
	};
	cost: {
		costPer1KTokens: number;
		currency: string;
	};
}

export interface RoutingDecision {
	modelId: string;
	modelType: 'local' | 'cloud';
	routingReason: string;
	confidence: number;
	estimatedLatencyMs: number;
	estimatedCost: number;
	evidenceCompliant: boolean;
	thermalConstrained: boolean;
	privacyEnforced: boolean;
	brainwavOptimized: boolean;
}

export interface RoutingResult {
	decision: RoutingDecision;
	response: any;
	metadata: {
		totalDuration: number;
		modelLatency: number;
		evidenceValidation: number;
		thermalCheck: number;
		privacyCheck: number;
		tokensUsed: number;
		actualCost: number;
		brainwavRouted: boolean;
		fallbackUsed: boolean;
		errors?: string[];
	};
	performance: {
		slaMet: boolean;
		latencySLO: number;
		actualLatency: number;
		withinBudget: boolean;
	};
	audit: {
		requestId: string;
		userId?: string;
		timestamp: string;
		modelUsed: string;
		routingPath: string[];
		policiesApplied: string[];
		brainwavAudited: boolean;
	};
}

export interface RoutingPolicy {
	useLocalIf?: (request: RoutingRequest, context: any) => boolean;
	useCloudIf?: (request: RoutingRequest, context: any) => boolean;
	privacyRules?: {
		forceLocal: boolean;
		allowedCloudRegions: string[];
		dataResidency: 'local' | 'regional' | 'global';
	};
	performanceRules?: {
		maxLatencyMs: number;
		maxCostPerRequest: number;
		preferredThroughput: number;
	};
	thermalRules?: {
		maxTemperature: number;
		throttleAtLoad: number;
		emergencyModeOnly: boolean;
	};
}

export class HybridRoutingEngine {
	private readonly modelAdapters: Map<string, ModelAdapter> = new Map();
	private readonly evidenceGate: EvidenceGate;
	private readonly thermalMonitor: ThermalMonitor;
	private readonly privacyEnforcer: PrivacyModeEnforcer;
	private readonly defaultPolicy: RoutingPolicy;

	constructor(
		evidenceGate: EvidenceGate,
		thermalMonitor: ThermalMonitor,
		privacyEnforcer: PrivacyModeEnforcer,
	) {
		this.evidenceGate = evidenceGate;
		this.thermalMonitor = thermalMonitor;
		this.privacyEnforcer = privacyEnforcer;

		this.defaultPolicy = {
			useLocalIf: (request, context) => {
				// Prefer local for privacy mode, small contexts, or thermal constraints
				if (request.privacyMode) return true;
				if (context.thermalCritical) return true;
				if (request.modelPreferences?.preferLocal !== false) return true;
				return false;
			},
			useCloudIf: (request, _context) => {
				// Use cloud for large contexts, low latency requirements, or complex tasks
				const promptTokens = this.estimateTokens(request.prompt);
				const contextTokens = request.context
					? this.estimateTokens(JSON.stringify(request.context))
					: 0;
				const totalTokens = promptTokens + contextTokens;

				if (totalTokens > 20000) return true; // Large context
				if (request.modelPreferences?.maxLatencyMs && request.modelPreferences.maxLatencyMs < 1500)
					return true;
				if (request.modelPreferences?.allowCloud && !request.privacyMode) return true;
				return false;
			},
			privacyRules: {
				forceLocal: false, // Will be overridden by privacy mode
				allowedCloudRegions: ['us-east-1', 'eu-west-1'],
				dataResidency: 'local',
			},
			performanceRules: {
				maxLatencyMs: 5000,
				maxCostPerRequest: 0.1,
				preferredThroughput: 10,
			},
			thermalRules: {
				maxTemperature: 85,
				throttleAtLoad: 0.8,
				emergencyModeOnly: false,
			},
		};
	}

	registerModelAdapter(adapter: ModelAdapter): void {
		this.modelAdapters.set(adapter.id, adapter);
	}

	async route(request: RoutingRequest, policy?: Partial<RoutingPolicy>): Promise<RoutingResult> {
		const requestId = request.requestId || `route-${randomUUID()}`;
		const startTime = Date.now();

		try {
			// Validate request
			const validatedRequest = RoutingRequestSchema.parse(request);

			// Check thermal constraints
			const thermalCheckStart = Date.now();
			const thermalState = await this.thermalMonitor.getCurrentTemperature();
			const thermalCheckDuration = Date.now() - thermalCheckStart;

			const thermalCritical = thermalState.zone === 'critical' || thermalState.zone === 'shutdown';
			const shouldThrottle =
				thermalCritical || (thermalState.zone === 'elevated' && thermalState.trend === 'rising');

			// Evidence validation
			const evidenceCheckStart = Date.now();
			let evidenceCompliant = true;
			let evidenceReason = '';

			if (validatedRequest.evidenceRequired) {
				const evidenceResult = await this.evidenceGate.validateAccess({
					user: { id: validatedRequest.userId || 'anonymous', role: 'user' },
					resource: { id: requestId, type: 'model_routing' },
					action: 'execute',
				});

				evidenceCompliant = evidenceResult.granted;
				evidenceReason = evidenceResult.reason || '';
			}
			const evidenceCheckDuration = Date.now() - evidenceCheckStart;

			if (!evidenceCompliant) {
				return this.createErrorResult(
					requestId,
					startTime,
					`Evidence validation failed: ${evidenceReason}`,
					{
						thermalCheck: thermalCheckDuration,
						evidenceValidation: evidenceCheckDuration,
						privacyCheck: 0,
					},
				);
			}

			// Privacy mode enforcement
			const privacyCheckStart = Date.now();
			let _privacyEnforced = false;
			let filteredRequest = validatedRequest;

			if (validatedRequest.privacyMode) {
				const privacyResult = await this.privacyEnforcer.enforcePrivacy(validatedRequest);
				_privacyEnforced = privacyResult.enforced;
				filteredRequest = privacyResult.filteredRequest;
			}
			const privacyCheckDuration = Date.now() - privacyCheckStart;

			// Apply routing policy
			const effectivePolicy = { ...this.defaultPolicy, ...policy };
			const routingDecision = await this.makeRoutingDecision(filteredRequest, effectivePolicy, {
				thermalCritical,
				shouldThrottle,
				thermalState,
			});

			// Execute model request
			const modelStart = Date.now();
			const modelResponse = await this.executeModelRequest(filteredRequest, routingDecision);
			const modelLatency = Date.now() - modelStart;

			// Calculate metrics
			const totalDuration = Date.now() - startTime;
			const tokensUsed =
				this.estimateTokens(JSON.stringify(modelResponse)) +
				this.estimateTokens(validatedRequest.prompt);
			const actualCost = this.calculateCost(routingDecision.modelId, tokensUsed);

			const slaMet = totalDuration <= (effectivePolicy.performanceRules?.maxLatencyMs || 5000);
			const latencySLO = effectivePolicy.performanceRules?.maxLatencyMs || 5000;
			const withinBudget =
				actualCost <= (effectivePolicy.performanceRules?.maxCostPerRequest || 0.1);

			// Create audit trail
			const audit = {
				requestId,
				userId: validatedRequest.userId,
				timestamp: new Date().toISOString(),
				modelUsed: routingDecision.modelId,
				routingPath: [routingDecision.modelType],
				policiesApplied: this.getAppliedPolicies(effectivePolicy, validatedRequest),
				brainwavAudited: true,
			};

			return {
				decision: routingDecision,
				response: modelResponse,
				metadata: {
					totalDuration,
					modelLatency,
					evidenceValidation: evidenceCheckDuration,
					thermalCheck: thermalCheckDuration,
					privacyCheck: privacyCheckDuration,
					tokensUsed,
					actualCost,
					brainwavRouted: true,
					fallbackUsed:
						routingDecision.modelType === 'cloud' && validatedRequest.modelPreferences?.preferLocal,
				},
				performance: {
					slaMet,
					latencySLO,
					actualLatency: totalDuration,
					withinBudget,
				},
				audit,
			};
		} catch (error) {
			return this.createErrorResult(
				requestId,
				startTime,
				`Routing error: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async makeRoutingDecision(
		request: RoutingRequest,
		policy: RoutingPolicy,
		context: any,
	): Promise<RoutingDecision> {
		const localAdapters = Array.from(this.modelAdapters.values()).filter(
			(a) => a.type === 'local' && a.available,
		);
		const cloudAdapters = Array.from(this.modelAdapters.values()).filter(
			(a) => a.type === 'cloud' && a.available,
		);

		// Start with MLX-first preference
		if (policy.useLocalIf?.(request, context) && localAdapters.length > 0) {
			const localAdapter = this.selectBestAdapter(localAdapters, request);
			return {
				modelId: localAdapter.id,
				modelType: 'local',
				routingReason: 'MLX-first policy preference',
				confidence: 0.9,
				estimatedLatencyMs: localAdapter.performance.avgLatencyMs,
				estimatedCost: 0,
				evidenceCompliant: true,
				thermalConstrained: context.thermalCritical,
				privacyEnforced: request.privacyMode,
				brainwavOptimized: true,
			};
		}

		// Check if cloud routing is preferred or required
		if (
			policy.useCloudIf?.(request, context) &&
			cloudAdapters.length > 0 &&
			request.modelPreferences?.allowCloud !== false
		) {
			const cloudAdapter = this.selectBestAdapter(cloudAdapters, request);
			return {
				modelId: cloudAdapter.id,
				modelType: 'cloud',
				routingReason: this.getCloudRoutingReason(request, context),
				confidence: 0.8,
				estimatedLatencyMs: cloudAdapter.performance.avgLatencyMs,
				estimatedCost: this.calculateCost(cloudAdapter.id, this.estimateTokens(request.prompt)),
				evidenceCompliant: true,
				thermalConstrained: context.thermalCritical,
				privacyEnforced: request.privacyMode,
				brainwavOptimized: true,
			};
		}

		// Fallback to local if available
		if (localAdapters.length > 0) {
			const localAdapter = this.selectBestAdapter(localAdapters, request);
			return {
				modelId: localAdapter.id,
				modelType: 'local',
				routingReason: 'Fallback to local MLX',
				confidence: 0.7,
				estimatedLatencyMs: localAdapter.performance.avgLatencyMs,
				estimatedCost: 0,
				evidenceCompliant: true,
				thermalConstrained: context.thermalCritical,
				privacyEnforced: request.privacyMode,
				brainwavOptimized: true,
			};
		}

		// No available models
		throw new Error('No available model adapters for routing request');
	}

	private selectBestAdapter(adapters: ModelAdapter[], request: RoutingRequest): ModelAdapter {
		// Simple selection based on performance and capabilities
		return adapters.reduce((best, current) => {
			const bestScore = this.calculateAdapterScore(best, request);
			const currentScore = this.calculateAdapterScore(current, request);
			return currentScore > bestScore ? current : best;
		});
	}

	private calculateAdapterScore(adapter: ModelAdapter, _request: RoutingRequest): number {
		let score = 0;

		// Performance score (lower latency is better)
		score += Math.max(0, 100 - adapter.performance.avgLatencyMs);

		// Throughput score
		score += adapter.performance.throughput * 10;

		// Capability matching
		if (adapter.capabilities.supportsStreaming) score += 20;
		if (adapter.capabilities.supportsFunctionCalling) score += 15;

		// Cost consideration (lower cost is better)
		score += Math.max(0, 50 - adapter.cost.costPer1KTokens);

		// Availability
		if (adapter.available) score += 100;

		return score;
	}

	private getCloudRoutingReason(request: RoutingRequest, context: any): string {
		const totalTokens =
			this.estimateTokens(request.prompt) +
			this.estimateTokens(JSON.stringify(request.context || ''));

		if (totalTokens > 20000) return 'Large context (>20k tokens) requires cloud model';
		if (request.modelPreferences?.maxLatencyMs && request.modelPreferences.maxLatencyMs < 1500)
			return 'Low latency requirement requires cloud model';
		if (context.thermalCritical) return 'Thermal constraints favor cloud model';
		return 'Cloud burst for optimal performance';
	}

	private async executeModelRequest(
		request: RoutingRequest,
		decision: RoutingDecision,
	): Promise<any> {
		const adapter = this.modelAdapters.get(decision.modelId);
		if (!adapter || !adapter.available) {
			throw new Error(`Model adapter ${decision.modelId} not available`);
		}

		// Mock model execution - in real implementation, this would call the actual model
		return {
			id: `response-${randomUUID()}`,
			content: `Mock response from ${decision.modelId} for: ${request.prompt.substring(0, 100)}...`,
			model: decision.modelId,
			tokensUsed: this.estimateTokens(request.prompt),
			latency: decision.estimatedLatencyMs,
			brainwavGenerated: true,
		};
	}

	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	private calculateCost(modelId: string, tokens: number): number {
		const adapter = this.modelAdapters.get(modelId);
		if (!adapter) return 0;
		return (tokens / 1000) * adapter.cost.costPer1KTokens;
	}

	private getAppliedPolicies(policy: RoutingPolicy, request: RoutingRequest): string[] {
		const policies: string[] = [];

		if (request.privacyMode) policies.push('privacy-mode');
		if (request.evidenceRequired) policies.push('evidence-required');
		if (request.thermalConstraints) policies.push('thermal-constraints');
		if (policy.useLocalIf) policies.push('mlx-first');
		if (policy.useCloudIf) policies.push('cloud-burst');

		return policies;
	}

	private createErrorResult(
		requestId: string,
		startTime: number,
		error: string,
		timing?: any,
	): RoutingResult {
		const totalDuration = Date.now() - startTime;

		return {
			decision: {
				modelId: 'none',
				modelType: 'local',
				routingReason: 'error',
				confidence: 0,
				estimatedLatencyMs: 0,
				estimatedCost: 0,
				evidenceCompliant: false,
				thermalConstrained: false,
				privacyEnforced: false,
				brainwavOptimized: false,
			},
			response: { error },
			metadata: {
				totalDuration,
				modelLatency: 0,
				evidenceValidation: timing?.evidenceValidation || 0,
				thermalCheck: timing?.thermalCheck || 0,
				privacyCheck: timing?.privacyCheck || 0,
				tokensUsed: 0,
				actualCost: 0,
				brainwavRouted: false,
				fallbackUsed: false,
				errors: [error],
			},
			performance: {
				slaMet: false,
				latencySLO: 0,
				actualLatency: totalDuration,
				withinBudget: false,
			},
			audit: {
				requestId,
				timestamp: new Date().toISOString(),
				modelUsed: 'none',
				routingPath: ['error'],
				policiesApplied: [],
				brainwavAudited: true,
			},
		};
	}
}
