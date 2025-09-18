import { z } from 'zod';

// Shared error codes for MCP tool contracts
export enum ToolErrorCode {
	TASK_NOT_FOUND = 'TASK_NOT_FOUND',
	WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
	INVALID_INPUT = 'INVALID_INPUT',
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	RATE_LIMITED = 'RATE_LIMITED',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Validation error thrown when a contract schema rejects input
export class ToolValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolValidationError';
	}
}

// Convenience schema for structured error responses (optional import)
export const toolErrorResponseSchema = z.object({
	code: z.nativeEnum(ToolErrorCode),
	message: z.string(),
	details: z.array(z.string()).optional(),
	retryable: z.boolean().optional(),
	timestamp: z.string().datetime(),
});

export type ToolErrorResponse = z.infer<typeof toolErrorResponseSchema>;
