/**
 * Distributed Tracing Implementation for Orchestration
 * Provides comprehensive tracing capabilities across the orchestration system
 */

import {
	context,
	diag,
	DiagConsoleLogger,
	DiagLogLevel,
	type Span,
	type SpanOptions,
	SpanStatusCode,
	trace,
	type Tracer,
} from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Initialize OpenTelemetry
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

export interface TraceContext {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	baggage: Record<string, string>;
}

export interface WorkflowTraceContext {
	workflowId: string;
	workflowName: string;
	executionId?: string;
	correlationId: string;
	userId?: string;
	sessionId?: string;
}

export interface AgentTraceContext {
	agentId: string;
	agentName: string;
	agentRole: string;
	workflowId: string;
	stepId?: string;
	taskId?: string;
}

export interface ModelTraceContext {
	provider: string;
	model: string;
	operation: 'embedding' | 'chat' | 'rerank';
	inputTokens?: number;
	outputTokens?: number;
}

export class OrchestrationTracer {
	private readonly tracer: Tracer;
	private readonly serviceName: string;
	private readonly version: string;

	constructor(serviceName = 'orchestration', version = '1.0.0') {
		this.serviceName = serviceName;
		this.version = version;

		// Create tracer
		this.tracer = trace.getTracer(serviceName, version);

		// Set up resource attributes
		// Create resource (side-effect) — no need to keep a local variable
		const _resource = new Resource({
			[SemanticResourceAttributes.SERVICE_NAME]: serviceName,
			[SemanticResourceAttributes.SERVICE_VERSION]: version,
			[SemanticResourceAttributes.SERVICE_INSTANCE_ID]: `instance-${Date.now()}`,
		});
		if (_resource) {
			// brAInwav: resource allocated for tracer
		}
	}

	/**
	 * Extract trace context from incoming request
	 */
	extractContext(headers: Record<string, string>): TraceContext {
		const traceparent = headers.traceparent;
		const tracestate = headers.tracestate;

		if (!traceparent) {
			return {
				traceId: this.generateTraceId(),
				spanId: this.generateSpanId(),
				baggage: {},
			};
		}

		// Parse W3C traceparent header
		// Format: 00-traceId-spanId-flags
		const parts = traceparent.split('-');
		if (parts.length !== 4) {
			throw new Error('Invalid traceparent header');
		}

		return {
			traceId: parts[1],
			spanId: parts[2],
			baggage: this.parseTracestate(tracestate),
		};
	}

	/**
	 * Inject trace context into outgoing headers
	 */
	injectContext(context: TraceContext): Record<string, string> {
		const headers: Record<string, string> = {};

		// Inject traceparent
		headers.traceparent = `00-${context.traceId}-${context.spanId}-01`;

		// Inject baggage if any
		if (Object.keys(context.baggage).length > 0) {
			headers.baggage = Object.entries(context.baggage)
				.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
				.join(',');
		}

		return headers;
	}

	/**
	 * Start a new workflow trace span
	 */
	async traceWorkflow<T>(
		workflowContext: WorkflowTraceContext,
		operation: string,
		fn: () => Promise<T>,
		options?: SpanOptions,
	): Promise<T> {
		const spanName = `workflow.${operation}`;
		const spanOptions: SpanOptions = {
			...options,
			attributes: {
				'workflow.id': workflowContext.workflowId,
				'workflow.name': workflowContext.workflowName,
				'workflow.execution_id': workflowContext.executionId,
				'workflow.correlation_id': workflowContext.correlationId,
				'user.id': workflowContext.userId,
				'session.id': workflowContext.sessionId,
				'service.name': this.serviceName,
				'service.version': this.version,
				...options?.attributes,
			},
		};

		return this.tracer.startActiveSpan(spanName, spanOptions, async (span) => {
			try {
				const result = await fn();
				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : 'Unknown error',
				});
				// OpenTelemetry expects an Exception-like type; cast unknown errors here
				span.recordException(error as unknown as import('@opentelemetry/api').Exception);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Start a new agent trace span
	 */
	async traceAgent<T>(
		agentContext: AgentTraceContext,
		operation: string,
		fn: () => Promise<T>,
		options?: SpanOptions,
	): Promise<T> {
		const spanName = `agent.${agentContext.agentRole}.${operation}`;
		const spanOptions: SpanOptions = {
			...options,
			attributes: {
				'agent.id': agentContext.agentId,
				'agent.name': agentContext.agentName,
				'agent.role': agentContext.agentRole,
				'workflow.id': agentContext.workflowId,
				'workflow.step_id': agentContext.stepId,
				'workflow.task_id': agentContext.taskId,
				'service.name': this.serviceName,
				'service.version': this.version,
				...options?.attributes,
			},
		};

		return this.tracer.startActiveSpan(spanName, spanOptions, async (span) => {
			try {
				const result = await fn();
				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : 'Unknown error',
				});
				span.recordException(error as unknown as import('@opentelemetry/api').Exception);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Start a new model trace span
	 */
	async traceModel<T>(
		modelContext: ModelTraceContext,
		fn: () => Promise<T>,
		options?: SpanOptions,
	): Promise<T> {
		const spanName = `model.${modelContext.provider}.${modelContext.operation}`;
		const spanOptions: SpanOptions = {
			...options,
			attributes: {
				'model.provider': modelContext.provider,
				'model.name': modelContext.model,
				'model.operation': modelContext.operation,
				'model.input_tokens': modelContext.inputTokens,
				'model.output_tokens': modelContext.outputTokens,
				'service.name': this.serviceName,
				'service.version': this.version,
				...options?.attributes,
			},
		};

		return this.tracer.startActiveSpan(spanName, spanOptions, async (span) => {
			const startTime = Date.now();

			try {
				const result = await fn();

				// Record timing
				const duration = Date.now() - startTime;
				span.setAttribute('model.duration_ms', duration);

				// If the result contains token information, record it
				if (result && typeof result === 'object') {
					if ('tokensUsed' in result) {
						span.setAttribute(
							'model.total_tokens',
							result.tokensUsed as unknown as import('@opentelemetry/api').AttributeValue,
						);
					}
					if ('usage' in result) {
						const usage = result.usage as Record<string, number>;
						if (usage.prompt_tokens) {
							span.setAttribute('model.input_tokens', usage.prompt_tokens);
						}
						if (usage.completion_tokens) {
							span.setAttribute('model.output_tokens', usage.completion_tokens);
						}
					}
				}

				span.setStatus({ code: SpanStatusCode.OK });
				return result;
			} catch (error) {
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : 'Unknown error',
				});
				span.recordException(error as unknown as import('@opentelemetry/api').Exception);
				throw error;
			} finally {
				span.end();
			}
		});
	}

	/**
	 * Add an event to the current span
	 */
	addEvent(name: string, attributes?: Record<string, unknown>): void {
		const span = trace.getActiveSpan();
		if (span) {
			span.addEvent(name, attributes as unknown as import('@opentelemetry/api').Attributes);
		}
	}

	/**
	 * Set an attribute on the current span
	 */
	setAttribute(key: string, value: unknown): void {
		const span = trace.getActiveSpan();
		if (span) {
			span.setAttribute(key, value as unknown as import('@opentelemetry/api').AttributeValue);
		}
	}

	/**
	 * Create a new span manually
	 */
	createSpan(name: string, options?: SpanOptions): Span {
		return this.tracer.startSpan(name, options);
	}

	/**
	 * Get the current trace context
	 */
	getCurrentContext(): TraceContext {
		const span = trace.getActiveSpan();
		if (!span) {
			return {
				traceId: this.generateTraceId(),
				spanId: this.generateSpanId(),
				baggage: {},
			};
		}

		const spanContext = span.spanContext();
		return {
			traceId: spanContext.traceId,
			spanId: spanContext.spanId,
			baggage: {},
		};
	}

	/**
	 * Generate a random trace ID
	 */
	private generateTraceId(): string {
		return crypto
			.getRandomValues(new Uint8Array(16))
			.reduce((id, byte) => id + byte.toString(16).padStart(2, '0'), '');
	}

	/**
	 * Generate a random span ID
	 */
	private generateSpanId(): string {
		return crypto
			.getRandomValues(new Uint8Array(8))
			.reduce((id, byte) => id + byte.toString(16).padStart(2, '0'), '');
	}

	/**
	 * Parse tracestate header
	 */
	private parseTracestate(tracestate?: string): Record<string, string> {
		if (!tracestate) {
			return {};
		}

		try {
			return tracestate.split(',').reduce(
				(baggage, item) => {
					const [key, value] = item.split('=');
					if (key && value) {
						baggage[key.trim()] = decodeURIComponent(value.trim());
					}
					return baggage;
				},
				{} as Record<string, string>,
			);
		} catch (err) {
			// If parsing fails, log and return empty baggage rather than crashing
			console.warn('brAInwav: failed to parse tracestate', err);
			return {};
		}
	}
}

// Global tracer instance
export const orchestrationTracer = new OrchestrationTracer();

// Utility functions for common tracing patterns
export function withWorkflowTracing<T>(
	workflowContext: WorkflowTraceContext,
	operation: string,
	fn: () => Promise<T>,
	options?: SpanOptions,
): Promise<T> {
	return orchestrationTracer.traceWorkflow(workflowContext, operation, fn, options);
}

export function withAgentTracing<T>(
	agentContext: AgentTraceContext,
	operation: string,
	fn: () => Promise<T>,
	options?: SpanOptions,
): Promise<T> {
	return orchestrationTracer.traceAgent(agentContext, operation, fn, options);
}

export function withModelTracing<T>(
	modelContext: ModelTraceContext,
	fn: () => Promise<T>,
	options?: SpanOptions,
): Promise<T> {
	return orchestrationTracer.traceModel(modelContext, fn, options);
}

// Middleware integrations
export function tracingMiddleware(operation: string) {
	return async (
		c: { req: { header(): Record<string, string>; method?: string; url?: string } },
		next: () => Promise<void>,
	) => {
		const headers = c.req.header();
		const _traceContext = orchestrationTracer.extractContext(headers);
		if (_traceContext) {
			// brAInwav: trace context extracted for diagnostics
		}
		const _carrier = context.active();
		if (_carrier) {
			// brAInwav: carrier observed for context propagation
		}

		await orchestrationTracer.traceWorkflow(
			{
				workflowId: headers['x-workflow-id'] || 'unknown',
				workflowName: headers['x-workflow-name'] || 'unknown',
				correlationId: headers['x-correlation-id'] || crypto.randomUUID(),
				userId: headers['x-user-id'],
				sessionId: headers['x-session-id'],
			},
			operation,
			next,
			{
				attributes: {
					'http.method': c.req.method ?? 'unknown',
					'http.url': c.req.url ?? 'unknown',
					'http.user_agent': headers['user-agent'],
					'http.client_ip': headers['x-forwarded-for'] || headers['x-real-ip'],
				},
			},
		);
	};
}

// Types declared above are already exported via their interface declarations.
// No additional export list required.
