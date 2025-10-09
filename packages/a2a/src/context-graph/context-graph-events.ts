/**
 * Context Graph A2A Events for brAInwav Cortex-OS
 *
 * Implements A2A (Agent-to-Agent) events for context graph operations,
 * providing comprehensive audit trails and real-time monitoring capabilities.
 *
 * Key Features:
 * - Context graph operation events with detailed metadata
 * - Model routing decision events with audit trails
 * - Thermal policy enforcement events
 * - Evidence compliance and violation events
 * - Performance and SLA monitoring events
 * - Error and recovery events
 * - Integration with Cortex-OS event bus
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Event schemas for validation
export const ContextGraphEventSchema = z.object({
	type: z.string(),
	source: z.string(),
	version: z.string().default('1.0'),
	timestamp: z.string(),
	data: z.any(),
	metadata: z.object({
		brainwavGenerated: z.boolean().default(true),
		brainwavBranded: z.boolean().default(true),
		requestId: z.string().optional(),
		userId: z.string().optional(),
		phase: z.string().optional(),
		correlationId: z.string().optional(),
	}),
});

export type ContextGraphEvent = z.infer<typeof ContextGraphEventSchema>;

// Event types
export enum ContextGraphEventType {
	// Context slice events
	CONTEXT_SLICE_STARTED = 'contextgraph.slice.started',
	CONTEXT_SLICE_COMPLETED = 'contextgraph.slice.completed',
	CONTEXT_SLICE_FAILED = 'contextgraph.slice.failed',

	// Context pack events
	CONTEXT_PACK_STARTED = 'contextgraph.pack.started',
	CONTEXT_PACK_COMPLETED = 'contextgraph.pack.completed',
	CONTEXT_PACK_FAILED = 'contextgraph.pack.failed',

	// Model routing events
	MODEL_ROUTING_STARTED = 'contextgraph.routing.started',
	MODEL_ROUTING_COMPLETED = 'contextgraph.routing.completed',
	MODEL_ROUTING_FAILED = 'contextgraph.routing.failed',
	MODEL_ROUTING_FALLBACK = 'contextgraph.routing.fallback',

	// Evidence events
	EVIDENCE_VALIDATION_STARTED = 'contextgraph.evidence.started',
	EVIDENCE_VALIDATION_COMPLETED = 'contextgraph.evidence.completed',
	EVIDENCE_VALIDATION_FAILED = 'contextgraph.evidence.failed',
	EVIDENCE_VIOLATION = 'contextgraph.evidence.violation',

	// Thermal events
	THERMAL_CONSTRAINT_APPLIED = 'contextgraph.thermal.applied',
	THERMAL_EMERGENCY = 'contextgraph.thermal.emergency',
	THERMAL_RECOVERY = 'contextgraph.thermal.recovery',

	// Performance events
	PERFORMANCE_SLA_BREACH = 'contextgraph.performance.sla_breach',
	PERFORMANCE_SLA_RESTORED = 'contextgraph.performance.sla_restored',
	PERFORMANCE_THROTTLING = 'contextgraph.performance.throttling',

	// Privacy events
	PRIVACY_MODE_ACTIVATED = 'contextgraph.privacy.activated',
	PRIVACY_VIOLATION = 'contextgraph.privacy.violation',
	PII_DETECTED = 'contextgraph.privacy.pii_detected',

	// Security events
	SECURITY_VIOLATION = 'contextgraph.security.violation',
	SECURITY_BLOCKED = 'contextgraph.security.blocked',
	SECURITY_ALERT = 'contextgraph.security.alert',

	// Error events
	ERROR_OCCURRED = 'contextgraph.error.occurred',
	ERROR_RECOVERY_STARTED = 'contextgraph.error.recovery.started',
	ERROR_RECOVERY_COMPLETED = 'contextgraph.error.recovery.completed',
}

export interface EventPublisher {
	publish(event: ContextGraphEvent): Promise<void>;
	batchPublish(events: ContextGraphEvent[]): Promise<void>;
}

export interface EventSubscription {
	subscribe(eventType: string, handler: (event: ContextGraphEvent) => void): () => void;
	unsubscribe(subscriptionId: string): void;
}

export interface EventMetrics {
	eventsProcessed: number;
	eventsPerSecond: number;
	errorRate: number;
	avgProcessingTime: number;
	lastEventTime: Date;
}

export class ContextGraphEventManager {
	private readonly publishers: Map<string, EventPublisher> = new Map();
	private readonly subscriptions: Map<
		string,
		Array<{
			id: string;
			handler: (event: ContextGraphEvent) => void;
			filters?: Record<string, any>;
		}>
	> = new Map();
	private readonly metrics: EventMetrics = {
		eventsProcessed: 0,
		eventsPerSecond: 0,
		errorRate: 0,
		avgProcessingTime: 0,
		lastEventTime: new Date(),
	};

	constructor(publisher?: EventPublisher) {
		if (publisher) {
			this.publishers.set('default', publisher);
		}
	}

	// Event publishing methods
	async publishContextSliceStarted(
		requestId: string,
		query: string,
		userId?: string,
	): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.CONTEXT_SLICE_STARTED,
			source: 'brAInwav.context-graph.slice',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				query,
				queryLength: query.length,
				tokens: this.estimateTokens(query),
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				userId,
				phase: 'slice',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishContextSliceCompleted(
		requestId: string,
		result: any,
		metadata?: any,
	): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.CONTEXT_SLICE_COMPLETED,
			source: 'brAInwav.context-graph.slice',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				result: {
					nodesCount: result.subgraph?.nodes?.length || 0,
					edgesCount: result.subgraph?.edges?.length || 0,
					duration: result.metadata?.sliceDuration || 0,
				},
				metadata,
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'slice',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishContextSliceFailed(requestId: string, error: string, metadata?: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.CONTEXT_SLICE_FAILED,
			source: 'brAInwav.context-graph.slice',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				error,
				errorType: this.classifyError(error),
				metadata,
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'slice',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishModelRoutingStarted(requestId: string, routingRequest: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.MODEL_ROUTING_STARTED,
			source: 'brAInwav.context-graph.routing',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				routingRequest: {
					promptLength: routingRequest.prompt?.length || 0,
					modelPreferences: routingRequest.modelPreferences,
					privacyMode: routingRequest.privacyMode,
					evidenceRequired: routingRequest.evidenceRequired,
				},
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'routing',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishModelRoutingCompleted(requestId: string, decision: any, result: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.MODEL_ROUTING_COMPLETED,
			source: 'brAInwav.context-graph.routing',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				decision: {
					modelId: decision.modelId,
					modelType: decision.modelType,
					routingReason: decision.routingReason,
					confidence: decision.confidence,
					estimatedLatency: decision.estimatedLatencyMs,
					estimatedCost: decision.estimatedCost,
				},
				result: {
					tokensUsed: result.metadata?.tokensUsed || 0,
					actualCost: result.metadata?.actualCost || 0,
					duration: result.metadata?.totalDuration || 0,
					slaMet: result.performance?.slaMet || false,
				},
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'routing',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishModelRoutingFallback(
		requestId: string,
		originalDecision: any,
		fallbackDecision: any,
	): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.MODEL_ROUTING_FALLBACK,
			source: 'brAInwav.context-graph.routing',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				originalDecision: {
					modelId: originalDecision.modelId,
					modelType: originalDecision.modelType,
					reason: originalDecision.routingReason,
				},
				fallbackDecision: {
					modelId: fallbackDecision.modelId,
					modelType: fallbackDecision.modelType,
					reason: fallbackDecision.routingReason,
				},
				fallbackReason: this.determineFallbackReason(originalDecision, fallbackDecision),
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'routing',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishEvidenceViolation(requestId: string, violation: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.EVIDENCE_VIOLATION,
			source: 'brAInwav.context-graph.evidence',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				violation: {
					type: violation.type,
					description: violation.description,
					riskLevel: violation.riskLevel,
					policiesViolated: violation.policiesViolated || [],
				},
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'evidence',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishThermalEmergency(requestId: string, thermalState: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.THERMAL_EMERGENCY,
			source: 'brAInwav.context-graph.thermal',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				thermalState: {
					currentTemp: thermalState.currentTemp,
					trend: thermalState.trend,
					zone: thermalState.zone,
					critical: thermalState.critical,
					predictedTemp: thermalState.predictedTemp,
				},
				emergencyActions: this.getEmergencyActions(thermalState),
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'thermal',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishSecurityViolation(requestId: string, violation: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.SECURITY_VIOLATION,
			source: 'brAInwav.context-graph.security',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				violation: {
					type: violation.type,
					description: violation.description,
					severity: violation.severity,
					maliciousIntent: violation.maliciousIntent || false,
					blocked: violation.blocked || false,
				},
				mitigation: violation.mitigation || [],
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'security',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	async publishPerformanceSLABreach(requestId: string, slaMetrics: any): Promise<void> {
		const event: ContextGraphEvent = {
			type: ContextGraphEventType.PERFORMANCE_SLA_BREACH,
			source: 'brAInwav.context-graph.performance',
			version: '1.0',
			timestamp: new Date().toISOString(),
			data: {
				requestId,
				slaMetrics: {
					actualLatency: slaMetrics.actualLatency,
					targetLatency: slaMetrics.targetLatency,
					latencyViolation: slaMetrics.latencyViolation,
					costViolation: slaMetrics.costViolation,
					throughputViolation: slaMetrics.throughputViolation,
				},
				impact: this.assessSLAImpact(slaMetrics),
			},
			metadata: {
				brainwavGenerated: true,
				brainwavBranded: true,
				requestId,
				phase: 'performance',
				correlationId: requestId,
			},
		};

		await this.publishEvent(event);
	}

	// Event subscription methods
	subscribe(
		eventType: string,
		handler: (event: ContextGraphEvent) => void,
		filters?: Record<string, any>,
	): () => void {
		if (!this.subscriptions.has(eventType)) {
			this.subscriptions.set(eventType, []);
		}

		const subscriptionId = randomUUID();
		this.subscriptions.get(eventType)?.push({
			id: subscriptionId,
			handler,
			filters,
		});

		return () => this.unsubscribe(eventType, subscriptionId);
	}

	unsubscribe(eventType: string, subscriptionId: string): void {
		const eventSubscriptions = this.subscriptions.get(eventType);
		if (eventSubscriptions) {
			const index = eventSubscriptions.findIndex((sub) => sub.id === subscriptionId);
			if (index >= 0) {
				eventSubscriptions.splice(index, 1);
			}
		}
	}

	// Event publishing implementation
	private async publishEvent(event: ContextGraphEvent): Promise<void> {
		try {
			// Validate event
			const validatedEvent = ContextGraphEventSchema.parse(event);

			// Update metrics
			this.updateMetrics(validatedEvent);

			// Publish to all configured publishers
			const publishPromises = Array.from(this.publishers.values()).map((publisher) =>
				publisher.publish(validatedEvent).catch((error) => {
					console.error('brAInwav Context Graph Event Publishing Error:', error);
				}),
			);

			await Promise.allSettled(publishPromises);

			// Notify local subscribers
			this.notifySubscribers(validatedEvent);
		} catch (error) {
			console.error('brAInwav Context Graph Event Validation Error:', error);
			throw error;
		}
	}

	private notifySubscribers(event: ContextGraphEvent): void {
		const subscriptions = this.subscriptions.get(event.type);
		if (!subscriptions) return;

		subscriptions.forEach((subscription) => {
			try {
				// Apply filters if present
				if (subscription.filters && !this.passesFilters(event, subscription.filters)) {
					return;
				}

				subscription.handler(event);
			} catch (error) {
				console.error('brAInwav Context Graph Event Handler Error:', error);
			}
		});
	}

	private passesFilters(event: ContextGraphEvent, filters: Record<string, any>): boolean {
		for (const [key, value] of Object.entries(filters)) {
			if (event.data[key] !== value && event.metadata[key] !== value) {
				return false;
			}
		}
		return true;
	}

	private updateMetrics(_event: ContextGraphEvent): void {
		this.metrics.eventsProcessed++;
		this.metrics.lastEventTime = new Date();

		// Calculate events per second (simple sliding window)
		const now = Date.now();
		const _oneSecondAgo = now - 1000;
		// In a real implementation, this would use a more sophisticated time window
		this.metrics.eventsPerSecond =
			this.metrics.eventsProcessed > 0 ? Math.min(this.metrics.eventsProcessed, 1000) : 0;
	}

	// Helper methods
	private classifyError(error: string): string {
		if (error.includes('thermal')) return 'thermal';
		if (error.includes('evidence')) return 'evidence';
		if (error.includes('validation')) return 'validation';
		if (error.includes('network')) return 'network';
		if (error.includes('timeout')) return 'timeout';
		return 'unknown';
	}

	private determineFallbackReason(original: any, fallback: any): string {
		if (original.modelType === 'cloud' && fallback.modelType === 'local') {
			return 'Cloud unavailable - falling back to local';
		}
		if (original.modelId !== fallback.modelId) {
			return `Model ${original.modelId} unavailable - using ${fallback.modelId}`;
		}
		return 'Model fallback executed';
	}

	private getEmergencyActions(thermalState: any): string[] {
		const actions: string[] = [];

		if (thermalState.currentTemp > 90) {
			actions.push('Activate emergency cooling');
			actions.push('Throttle all operations');
		}

		if (thermalState.trend === 'rapidly_rising') {
			actions.push('Increase monitoring frequency');
		}

		if (thermalState.critical) {
			actions.push('Consider system restart');
		}

		return actions;
	}

	private assessSLAImpact(slaMetrics: any): string {
		const impacts: string[] = [];

		if (slaMetrics.latencyViolation) {
			impacts.push('User experience degraded');
		}

		if (slaMetrics.costViolation) {
			impacts.push('Budget exceeded');
		}

		if (slaMetrics.throughputViolation) {
			impacts.push('Throughput reduced');
		}

		return impacts.join(', ') || 'Minimal impact';
	}

	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	// Metrics and monitoring
	getMetrics(): EventMetrics {
		return { ...this.metrics };
	}

	getSubscriptionCount(): number {
		let total = 0;
		for (const subscriptions of this.subscriptions.values()) {
			total += subscriptions.length;
		}
		return total;
	}
}

// Event publisher interface for integration with external systems
export interface EventBusPublisher extends EventPublisher {
	publish(event: ContextGraphEvent): Promise<void>;
	batchPublish(events: ContextGraphEvent[]): Promise<void>;
}

export function createContextGraphEventManager(
	publisher?: EventPublisher,
): ContextGraphEventManager {
	return new ContextGraphEventManager(publisher);
}
