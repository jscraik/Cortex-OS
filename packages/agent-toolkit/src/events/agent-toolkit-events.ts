import { z } from 'zod';

/**
 * Agent Toolkit A2A event schemas for inter-package communication
 */

// Tool Execution Started Event
export const ToolExecutionStartedEventSchema = z.object({
	executionId: z.string(),
	toolName: z.string(),
	toolType: z.enum(['search', 'codemod', 'validation', 'analysis']),
	parameters: z.record(z.any()),
	initiatedBy: z.string(),
	startedAt: z.string(),
});

// Search Results Event
export const SearchResultsEventSchema = z.object({
	executionId: z.string(),
	query: z.string(),
	searchType: z.enum(['ripgrep', 'semgrep', 'ast-grep', 'multi']),
	resultsCount: z.number().int().nonnegative(),
	paths: z.array(z.string()),
	duration: z.number().int().nonnegative(),
	foundAt: z.string(),
});

// Code Modification Event
export const CodeModificationEventSchema = z.object({
	executionId: z.string(),
	modificationType: z.enum(['refactor', 'transform', 'fix']),
	filesChanged: z.array(z.string()),
	linesAdded: z.number().int().nonnegative(),
	linesRemoved: z.number().int().nonnegative(),
	modifiedAt: z.string(),
});

// Validation Report Event
export const ValidationReportEventSchema = z.object({
	executionId: z.string(),
	validationType: z.enum(['syntax', 'types', 'tests', 'security']),
	status: z.enum(['passed', 'failed', 'warning']),
	issuesFound: z.number().int().nonnegative(),
	filesValidated: z.array(z.string()),
	reportedAt: z.string(),
});

// Export event type definitions
export type ToolExecutionStartedEvent = z.infer<
	typeof ToolExecutionStartedEventSchema
>;
export type SearchResultsEvent = z.infer<typeof SearchResultsEventSchema>;
export type CodeModificationEvent = z.infer<typeof CodeModificationEventSchema>;
export type ValidationReportEvent = z.infer<typeof ValidationReportEventSchema>;

// Helper function to create agent toolkit events
export const createAgentToolkitEvent = {
	executionStarted: (data: ToolExecutionStartedEvent) => ({
		type: 'agent_toolkit.execution.started' as const,
		data: ToolExecutionStartedEventSchema.parse(data),
	}),
	searchResults: (data: SearchResultsEvent) => ({
		type: 'agent_toolkit.search.results' as const,
		data: SearchResultsEventSchema.parse(data),
	}),
	codeModification: (data: CodeModificationEvent) => ({
		type: 'agent_toolkit.code.modified' as const,
		data: CodeModificationEventSchema.parse(data),
	}),
	validationReport: (data: ValidationReportEvent) => ({
		type: 'agent_toolkit.validation.report' as const,
		data: ValidationReportEventSchema.parse(data),
	}),
};
