import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	ImplementationSuggestedEventSchema,
	RefactoringOpportunityEventSchema,
	TDD_COACH_EVENT_SOURCE,
	TddCycleStartedEventSchema,
	TestWrittenEventSchema,
} from './events/tdd-coach-events.js';

const DEFAULT_TDD_COACH_ACL: TopicACL = {
	'tdd_coach.cycle.started': { publish: true, subscribe: true },
	'tdd_coach.test.written': { publish: true, subscribe: true },
	'tdd_coach.implementation.suggested': { publish: true, subscribe: true },
	'tdd_coach.refactoring.opportunity': { publish: true, subscribe: true },
};

function registerTddCoachSchema(
	registry: SchemaRegistry,
	eventType: keyof typeof DEFAULT_TDD_COACH_ACL,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
): void {
	registry.register({
		eventType: eventType as string,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/tdd-coach',
			source: TDD_COACH_EVENT_SOURCE,
		},
	});
}

function registerCycleStarted(registry: SchemaRegistry): void {
	registerTddCoachSchema(
		registry,
		'tdd_coach.cycle.started',
		TddCycleStartedEventSchema,
		'Signals that a new TDD cycle has started',
		['tdd', 'cycle'],
		[
			{
				cycleId: 'cycle-001',
				projectPath: '/workspace/project',
				phase: 'red',
				testFile: 'tests/sample.test.ts',
				sourceFile: 'src/sample.ts',
				startedBy: 'developer',
				startedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);
}

function registerTestWritten(registry: SchemaRegistry): void {
	registerTddCoachSchema(
		registry,
		'tdd_coach.test.written',
		TestWrittenEventSchema,
		'Emitted when the coach records a new unit test',
		['tdd', 'test'],
		[
			{
				cycleId: 'cycle-001',
				testId: 'test-123',
				testFile: 'tests/sample.test.ts',
				testName: 'should follow red-green-refactor',
				description: 'Ensures workflow guidance is provided',
				complexity: 'medium',
				writtenAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);
}

function registerImplementationSuggested(registry: SchemaRegistry): void {
	registerTddCoachSchema(
		registry,
		'tdd_coach.implementation.suggested',
		ImplementationSuggestedEventSchema,
		'Provides implementation guidance after a failing test',
		['tdd', 'implementation'],
		[
			{
				cycleId: 'cycle-001',
				testId: 'test-123',
				suggestion: 'Implement minimal logic to satisfy expectation',
				confidence: 0.7,
				approach: 'minimal',
				suggestedAt: new Date('2024-01-01T08:10:00Z').toISOString(),
			},
		],
	);
}

function registerRefactoringOpportunity(registry: SchemaRegistry): void {
	registerTddCoachSchema(
		registry,
		'tdd_coach.refactoring.opportunity',
		RefactoringOpportunityEventSchema,
		'Highlights follow-up refactoring opportunities',
		['tdd', 'refactor'],
		[
			{
				cycleId: 'cycle-001',
				opportunityId: 'ref-42',
				file: 'src/sample.ts',
				type: 'improve_naming',
				description: 'Rename helper for clarity',
				priority: 'medium',
				detectedAt: new Date('2024-01-01T08:20:00Z').toISOString(),
			},
		],
	);
}

export function createTddCoachSchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});
	registerCycleStarted(registry);
	registerTestWritten(registry);
	registerImplementationSuggested(registry);
	registerRefactoringOpportunity(registry);
	return registry;
}

export interface TddCoachBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createTddCoachBus(config: TddCoachBusConfig = {}) {
	const registry = config.schemaRegistry ?? createTddCoachSchemaRegistry();
	const acl: TopicACL = { ...DEFAULT_TDD_COACH_ACL, ...(config.acl ?? {}) };
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
