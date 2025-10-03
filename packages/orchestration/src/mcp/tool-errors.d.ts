export declare enum ToolErrorCode {
	TASK_NOT_FOUND = 'TASK_NOT_FOUND',
	WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
	INVALID_INPUT = 'INVALID_INPUT',
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	RATE_LIMITED = 'RATE_LIMITED',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
}
export declare class ToolValidationError extends Error {
	constructor(message: string);
}
//# sourceMappingURL=tool-errors.d.ts.map
