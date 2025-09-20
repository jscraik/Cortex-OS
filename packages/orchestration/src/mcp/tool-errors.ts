// Shared tool error types to avoid circular imports between tools and tool-contracts
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
