import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	BenchmarkResultEventSchema,
	EVALS_EVENT_SOURCE,
	EvaluationCompletedEventSchema,
	EvaluationStartedEventSchema,
	TestCaseExecutedEventSchema,
} from './events/evals-events.js';

const DEFAULT_EVALS_ACL: TopicACL = {
	'evals.evaluation.started': { publish: true, subscribe: true },
	'evals.test.executed': { publish: true, subscribe: true },
	'evals.benchmark.result': { publish: true, subscribe: true },
	'evals.evaluation.completed': { publish: true, subscribe: true },
};

function registerEvalsSchema(
	registry: SchemaRegistry,
	eventType: string,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
) {
	registry.register({
		eventType,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/evals',
			source: EVALS_EVENT_SOURCE,
		},
	});
}

export function createEvalsSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerEvalsSchema(
		registry,
		'evals.evaluation.started',
		EvaluationStartedEventSchema,
		'Emitted when an evaluation suite begins execution',
		['evals', 'evaluation'],
		[
			{
				evaluationId: 'eval-001',
				evaluationType: 'unit',
				targetComponent: '@cortex-os/rag',
				criteria: ['accuracy', 'performance'],
				startedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerEvalsSchema(
		registry,
		'evals.test.executed',
		TestCaseExecutedEventSchema,
		'Records individual test case execution results',
		['evals', 'test'],
		[
			{
				evaluationId: 'eval-001',
				testCaseId: 'test-123',
				name: 'should handle valid query',
				status: 'passed',
				duration: 150,
				executedAt: new Date('2024-01-01T08:00:01Z').toISOString(),
			},
		],
	);

	registerEvalsSchema(
		registry,
		'evals.benchmark.result',
		BenchmarkResultEventSchema,
		'Captures performance benchmarks and metrics',
		['evals', 'benchmark'],
		[
			{
				evaluationId: 'eval-001',
				benchmarkId: 'bench-001',
				metric: 'response_time',
				value: 95.5,
				unit: 'ms',
				baseline: 100.0,
				threshold: 120.0,
				recordedAt: new Date('2024-01-01T08:00:02Z').toISOString(),
			},
		],
	);

	registerEvalsSchema(
		registry,
		'evals.evaluation.completed',
		EvaluationCompletedEventSchema,
		'Marks completion of evaluation with summary results',
		['evals', 'evaluation'],
		[
			{
				evaluationId: 'eval-001',
				status: 'passed',
				totalTests: 50,
				passedTests: 47,
				failedTests: 3,
				duration: 30000,
				completedAt: new Date('2024-01-01T08:00:30Z').toISOString(),
			},
		],
	);

	return registry;
}

export interface EvalsBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createEvalsBus(config: EvalsBusConfig = {}) {
	const registry = config.schemaRegistry ?? createEvalsSchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_EVALS_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
