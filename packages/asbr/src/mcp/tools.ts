import { z } from 'zod';

// ASBR (Agent-based Software Review) MCP Tool Schemas
const CreateReviewInputSchema = z.object({
	repositoryUrl: z.string().url(),
	pullRequestId: z.string().optional(),
	scope: z.enum(['full', 'incremental', 'security-only']).default('incremental'),
	reviewers: z.array(z.enum(['ai', 'security', 'performance', 'architecture'])).optional(),
});

const GetReviewStatusInputSchema = z.object({
	reviewId: z.string(),
	includeDetails: z.boolean().optional().default(false),
});

const SubmitFeedbackInputSchema = z.object({
	reviewId: z.string(),
	feedback: z.object({
		type: z.enum(['approval', 'request-changes', 'comment']),
		message: z.string(),
		lineNumber: z.number().int().positive().optional(),
		filePath: z.string().optional(),
	}),
});

const ListReviewsInputSchema = z.object({
	status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
	reviewer: z.string().optional(),
	limit: z.number().int().positive().max(100).default(20),
});

const RunSecurityScanInputSchema = z.object({
	targetPath: z.string(),
	scanType: z.enum(['sast', 'dependency', 'secrets', 'all']).default('all'),
	severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

// ASBR MCP Tool Definitions
export interface ASBRTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
}

export const asbrMcpTools: ASBRTool[] = [
	{
		name: 'create_review',
		description: 'Create a new code review with AI-powered analysis',
		inputSchema: CreateReviewInputSchema,
	},
	{
		name: 'get_review_status',
		description: 'Get the status and progress of a code review',
		inputSchema: GetReviewStatusInputSchema,
	},
	{
		name: 'submit_feedback',
		description: 'Submit feedback or approval for a code review',
		inputSchema: SubmitFeedbackInputSchema,
	},
	{
		name: 'list_reviews',
		description: 'List code reviews with optional filtering',
		inputSchema: ListReviewsInputSchema,
	},
	{
		name: 'run_security_scan',
		description: 'Run security analysis on code',
		inputSchema: RunSecurityScanInputSchema,
	},
];

// Export types for external use
export type CreateReviewInput = z.infer<typeof CreateReviewInputSchema>;
export type GetReviewStatusInput = z.infer<typeof GetReviewStatusInputSchema>;
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;
export type ListReviewsInput = z.infer<typeof ListReviewsInputSchema>;
export type RunSecurityScanInput = z.infer<typeof RunSecurityScanInputSchema>;
