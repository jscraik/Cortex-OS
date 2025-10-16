import type { AgentEvent } from './types.js';
import { validateAgentEvent } from './types.js';
import { createCompleteEvent, extractErrorMessage, generateCorrelationId } from './utils.js';

/**
 * brAInwav Bus interface for telemetry event emission
 */
export interface Bus {
	publish(topic: string, data: unknown): void | Promise<void>;
}

/**
 * brAInwav Telemetry emitter configuration options
 */
export interface EmitterOpts {
	topic?: string;
	redaction?: (event: AgentEvent) => AgentEvent;
}

/**
 * Phase helper interface for workflow tracking
 */
export interface PhaseHelper {
	started(): void;
	finished(outcome?: Record<string, unknown>): void;
}

/**
 * brAInwav Telemetry emitter for structured agent events
 *
 * Provides vendor-neutral observability with privacy-first design for
 * brAInwav Cortex-OS agent workflows and tool executions.
 *
 * @example
 * ```typescript
 * const telemetry = new Telemetry(bus, {
 *   topic: 'cortex.telemetry.agent.event',
 *   redaction: createRedactionFilter()
 * });
 *
 * telemetry.emit({
 *   event: 'tool_invoked',
 *   agentId: 'brAInwav-agent-1',
 *   phase: 'execution',
 *   labels: { tool: 'search' }
 * });
 * ```
 */
export class Telemetry {
	private readonly topic: string;
	private readonly redaction?: (event: AgentEvent) => AgentEvent;

	/**
	 * Create new brAInwav telemetry emitter
	 *
	 * @param bus - Event bus for publishing telemetry events
	 * @param options - Configuration options for topic and redaction
	 */
	constructor(
		private readonly bus: Bus,
		options: EmitterOpts = {},
	) {
		this.topic = options.topic || 'cortex.a2a.events';
		this.redaction = options.redaction;
	}

	/**
	 * Emit structured AgentEvent with brAInwav context
	 *
	 * Validates event structure, applies redaction, and publishes to configured topic.
	 * Handles errors gracefully without throwing to prevent workflow disruption.
	 *
	 * @param event - Partial AgentEvent (required fields will be defaulted)
	 */
	emit(event: Partial<AgentEvent>): void {
		this.safeEmit(event);
	}

	/**
	 * Create phase helper for workflow tracking
	 *
	 * Returns helper with started() and finished() methods that emit
	 * correlated run_started and run_finished events for workflow phases.
	 *
	 * @param phaseName - Name of the workflow phase to track
	 * @returns Phase helper with started/finished methods
	 */
	phase(phaseName: string): PhaseHelper {
		const correlationId = generateCorrelationId();

		return {
			started: (): void => this.emitPhaseEvent('run_started', phaseName, correlationId),
			finished: (outcome?: Record<string, unknown>): void =>
				this.emitPhaseEvent('run_finished', phaseName, correlationId, outcome),
		};
	}

	/**
	 * Safe emission with error handling
	 */
	private safeEmit(event: Partial<AgentEvent>): void {
		try {
			const completeEvent = createCompleteEvent(event);
			const validatedEvent = validateAgentEvent(completeEvent);
			const finalEvent = this.applyRedaction(validatedEvent);
			this.bus.publish(this.topic, finalEvent);
		} catch (error) {
			console.error(extractErrorMessage(error, 'Telemetry emission failed'));
		}
	}

	/**
	 * Apply redaction if configured
	 */
	private applyRedaction(event: AgentEvent): AgentEvent {
		return this.redaction ? this.redaction(event) : event;
	}

	/**
	 * Emit phase-specific events
	 */
	private emitPhaseEvent(
		eventType: 'run_started' | 'run_finished',
		phaseName: string,
		correlationId: string,
		outcome?: Record<string, unknown>,
	): void {
		this.safeEmit({
			event: eventType,
			phase: phaseName as 'planning' | 'execution' | 'completion',
			correlationId,
			outcome,
			labels: { brAInwav: `phase-${eventType.replace('run_', '')}` },
		});
	}
}
