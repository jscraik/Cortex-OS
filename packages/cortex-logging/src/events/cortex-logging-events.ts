import { z } from 'zod';

/**
 * Cortex Logging A2A event schemas for inter-package communication
 */

// Log Entry Created Event
export const LogEntryCreatedEventSchema = z.object({
	logId: z.string(),
	level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']),
	message: z.string(),
	source: z.string(),
	component: z.string().optional(),
	userId: z.string().optional(),
	sessionId: z.string().optional(),
	metadata: z.record(z.any()).optional(),
	createdAt: z.string(),
});

// Log Stream Started Event
export const LogStreamStartedEventSchema = z.object({
	streamId: z.string(),
	filters: z.record(z.any()).optional(),
	destination: z.enum(['console', 'file', 'database', 'external']),
	format: z.enum(['json', 'text', 'structured']),
	startedBy: z.string(),
	startedAt: z.string(),
});

// Error Pattern Detected Event
export const ErrorPatternDetectedEventSchema = z.object({
	patternId: z.string(),
	pattern: z.string(),
	occurrences: z.number().int().positive(),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	timeWindow: z.string(),
	firstOccurrence: z.string(),
	lastOccurrence: z.string(),
	detectedAt: z.string(),
});

// Log Archived Event
export const LogArchivedEventSchema = z.object({
	archiveId: z.string(),
	timeRange: z.object({
		start: z.string(),
		end: z.string(),
	}),
	entryCount: z.number().int().nonnegative(),
	compressedSize: z.number().int().nonnegative(),
	destination: z.string(),
	archivedAt: z.string(),
});

// Export event type definitions
export type LogEntryCreatedEvent = z.infer<typeof LogEntryCreatedEventSchema>;
export type LogStreamStartedEvent = z.infer<typeof LogStreamStartedEventSchema>;
export type ErrorPatternDetectedEvent = z.infer<typeof ErrorPatternDetectedEventSchema>;
export type LogArchivedEvent = z.infer<typeof LogArchivedEventSchema>;

// Helper function to create cortex-logging events
export const createCortexLoggingEvent = {
	logEntryCreated: (data: LogEntryCreatedEvent) => ({
		type: 'cortex_logging.entry.created' as const,
		data: LogEntryCreatedEventSchema.parse(data),
	}),
	streamStarted: (data: LogStreamStartedEvent) => ({
		type: 'cortex_logging.stream.started' as const,
		data: LogStreamStartedEventSchema.parse(data),
	}),
	errorPatternDetected: (data: ErrorPatternDetectedEvent) => ({
		type: 'cortex_logging.error_pattern.detected' as const,
		data: ErrorPatternDetectedEventSchema.parse(data),
	}),
	logArchived: (data: LogArchivedEvent) => ({
		type: 'cortex_logging.log.archived' as const,
		data: LogArchivedEventSchema.parse(data),
	}),
};
