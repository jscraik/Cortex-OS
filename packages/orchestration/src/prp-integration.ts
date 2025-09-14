/**
 * PRP orchestration engine using functional API
 */

import { EventEmitter } from 'node:events';
import { type Neuron, PRPOrchestrator } from '@cortex-os/prp-runner';
import { v4 as uuid } from 'uuid';
import winston from 'winston';

import type {
	Agent,
	OrchestrationConfig,
	OrchestrationResult,
	PlanningContext,
	Task,
} from './types.js';

export interface PRPEngine {
	config: OrchestrationConfig;
	logger: winston.Logger;
	prp: PRPOrchestrator;
	active: Map<string, Promise<OrchestrationResult>>;
	emitter: EventEmitter;
}

export function createEngine(
	config: Partial<OrchestrationConfig> = {},
	logger: winston.Logger = winston.createLogger({
		level: 'info',
		format: winston.format.combine(
			winston.format.timestamp(),
			winston.format.json(),
		),
		transports: [new winston.transports.Console()],
	}),
): PRPEngine {
	const defaults: OrchestrationConfig = {
		maxConcurrentOrchestrations: 10,
		defaultStrategy: 'neural_prp',
		enableMultiAgentCoordination: true,
		enableAdaptiveDecisions: true,
		planningTimeout: 300000,
		executionTimeout: 1800000,
		qualityThreshold: 0.8,
		performanceMonitoring: true,
	} as OrchestrationConfig;

	if ('fallbackStrategy' in config) {
		throw new Error('fallbackStrategy option was removed');
	}

	return {
		config: { ...defaults, ...config },
		logger,
		prp: new PRPOrchestrator(),
		active: new Map(),
		emitter: new EventEmitter(),
	};
}

export async function orchestrateTask(
	engine: PRPEngine,
	task: Task,
	agents: Agent[],
	context: Partial<PlanningContext> = {},
	neurons: Neuron[] = [],
): Promise<OrchestrationResult> {
	if (engine.active.size >= engine.config.maxConcurrentOrchestrations) {
		throw new Error('Maximum concurrent orchestrations reached');
	}

	const id = uuid();
	for (const n of neurons) {
		engine.prp.registerNeuron?.(n);
	}

	const blueprint = {
		id,
		title: task.title,
		description: task.description || `Orchestration task: ${task.title}`,
		requirements: task.requiredCapabilities,
		context,
		agents,
	};

	const start = Date.now();

	// Create a timeout promise with explicit cancellation handling
	const timeoutMs = engine.config.executionTimeout;
	let timeoutId: NodeJS.Timeout | null = null;
	let timedOut = false;

	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			timedOut = true;
			reject(
				new Error(
					`Task execution timeout after ${timeoutMs}ms for task ${task.id}`,
				),
			);
		}, timeoutMs);
	});

	// Execute PRP cycle
	const executionPromise = engine.prp
		.executePRPCycle(blueprint)
		.then((prp) => {
			// If we've already timed out, suppress emission & just return silently
			if (timedOut) {
				return toResult(id, task.id, prp, start); // value ignored by race winner
			}
			// Clear timeout on success
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			const result = toResult(id, task.id, prp, start);
			engine.emitter.emit('orchestrationCompleted', {
				type: 'task_completed',
				taskId: task.id,
				data: result,
				timestamp: new Date(),
				source: 'PRPEngine',
			});
			return result;
		})
		.catch((err) => {
			// If timed out already, swallow to prevent unhandled rejection; otherwise propagate
			if (timedOut) {
				engine.logger.debug('Suppressed post-timeout PRP resolution', {
					taskId: task.id,
				});
				return toResult(id, task.id, { phase: undefined }, start);
			}
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
			throw err;
		});

	// Race between execution and timeout; ensure cleanup
	const run = Promise.race([executionPromise, timeoutPromise]).finally(() => {
		engine.active.delete(id);
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
	});

	engine.active.set(id, run);
	return run;
}

type PRPResult = {
	phase?: string;
	outputs?: Record<string, unknown>;
	metadata?: {
		cerebrum?: {
			decision?: string;
			reasoning?: string;
		};
	};
	validationResults?: unknown;
};

function toResult(
	id: string,
	taskId: string,
	prp: PRPResult,
	start: number,
): OrchestrationResult {
	return {
		orchestrationId: id,
		taskId,
		success: prp.phase === 'completed',
		plan: null,
		executionResults: prp.outputs || {},
		coordinationResults: {
			coordinationId: id,
			success: prp.phase === 'completed',
			results: prp.outputs || {},
			agentPerformance: {},
			communicationStats: {
				messagesSent: 0,
				messagesReceived: 0,
				errors: 0,
			},
			synchronizationEvents: [],
			resourceUtilization: {},
			executionTime: Date.now() - start,
			completedPhases: prp.phase ? [prp.phase] : [],
			errors: [],
		},
		decisions: [],
		performance: {
			totalDuration: Date.now() - start,
			planningTime: 0,
			executionTime: 0,
			efficiency: 1,
			qualityScore: 1,
		},
		errors: [],
		timestamp: new Date(),
	};
}

export async function cleanup(engine: PRPEngine): Promise<void> {
	engine.active.clear();
}
