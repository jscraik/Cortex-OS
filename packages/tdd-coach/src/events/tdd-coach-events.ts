import { createEnvelope } from '@cortex-os/a2a-contracts/envelope';
import { z } from 'zod';

/**
 * TDD Coach A2A event schemas for inter-package communication
 */

export const TDD_COACH_EVENT_SOURCE = 'https://cortex-os.dev/tdd-coach';
const TDD_EVENT_SCHEMA_VERSION = '1';
const TDD_DATACONTENTTYPE = 'application/json';

const schemaUri = (eventType: string) =>
	`https://schemas.cortex-os.dev/tdd-coach/${eventType}/v${TDD_EVENT_SCHEMA_VERSION}`;

// TDD Cycle Started Event
export const TddCycleStartedEventSchema = z.object({
	cycleId: z.string(),
	projectPath: z.string(),
	phase: z.enum(['red', 'green', 'refactor']),
	testFile: z.string().optional(),
	sourceFile: z.string().optional(),
	startedBy: z.string(),
	startedAt: z.string(),
});

// Test Written Event
export const TestWrittenEventSchema = z.object({
	cycleId: z.string(),
	testId: z.string(),
	testFile: z.string(),
	testName: z.string(),
	description: z.string(),
	complexity: z.enum(['simple', 'medium', 'complex']),
	writtenAt: z.string(),
});

// Implementation Suggested Event
export const ImplementationSuggestedEventSchema = z.object({
	cycleId: z.string(),
	testId: z.string(),
	suggestion: z.string(),
	confidence: z.number().min(0).max(1),
	approach: z.enum(['minimal', 'standard', 'comprehensive']),
	suggestedAt: z.string(),
});

// Refactoring Opportunity Event
export const RefactoringOpportunityEventSchema = z.object({
	cycleId: z.string(),
	opportunityId: z.string(),
	file: z.string(),
	type: z.enum(['extract_method', 'eliminate_duplication', 'improve_naming', 'simplify_logic']),
	description: z.string(),
	priority: z.enum(['low', 'medium', 'high']),
	detectedAt: z.string(),
});

// Export event type definitions
export type TddCycleStartedEvent = z.infer<typeof TddCycleStartedEventSchema>;
export type TestWrittenEvent = z.infer<typeof TestWrittenEventSchema>;
export type ImplementationSuggestedEvent = z.infer<typeof ImplementationSuggestedEventSchema>;
export type RefactoringOpportunityEvent = z.infer<typeof RefactoringOpportunityEventSchema>;

// Helper function to create TDD Coach events
export const createTddCoachEvent = {
	cycleStarted: (data: TddCycleStartedEvent) =>
		createEnvelope({
			type: 'tdd_coach.cycle.started' as const,
			source: TDD_COACH_EVENT_SOURCE,
			data: TddCycleStartedEventSchema.parse(data),
			datacontenttype: TDD_DATACONTENTTYPE,
			dataschema: schemaUri('tdd_coach.cycle.started'),
		}),
	testWritten: (data: TestWrittenEvent) =>
		createEnvelope({
			type: 'tdd_coach.test.written' as const,
			source: TDD_COACH_EVENT_SOURCE,
			data: TestWrittenEventSchema.parse(data),
			datacontenttype: TDD_DATACONTENTTYPE,
			dataschema: schemaUri('tdd_coach.test.written'),
		}),
	implementationSuggested: (data: ImplementationSuggestedEvent) =>
		createEnvelope({
			type: 'tdd_coach.implementation.suggested' as const,
			source: TDD_COACH_EVENT_SOURCE,
			data: ImplementationSuggestedEventSchema.parse(data),
			datacontenttype: TDD_DATACONTENTTYPE,
			dataschema: schemaUri('tdd_coach.implementation.suggested'),
		}),
	refactoringOpportunity: (data: RefactoringOpportunityEvent) =>
		createEnvelope({
			type: 'tdd_coach.refactoring.opportunity' as const,
			source: TDD_COACH_EVENT_SOURCE,
			data: RefactoringOpportunityEventSchema.parse(data),
			datacontenttype: TDD_DATACONTENTTYPE,
			dataschema: schemaUri('tdd_coach.refactoring.opportunity'),
		}),
};
