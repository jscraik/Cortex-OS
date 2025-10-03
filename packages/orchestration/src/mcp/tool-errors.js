// Shared tool error types to avoid circular imports between tools and tool-contracts
export var ToolErrorCode;
((ToolErrorCode) => {
	ToolErrorCode['TASK_NOT_FOUND'] = 'TASK_NOT_FOUND';
	ToolErrorCode['WORKFLOW_NOT_FOUND'] = 'WORKFLOW_NOT_FOUND';
	ToolErrorCode['INVALID_INPUT'] = 'INVALID_INPUT';
	ToolErrorCode['PERMISSION_DENIED'] = 'PERMISSION_DENIED';
	ToolErrorCode['RATE_LIMITED'] = 'RATE_LIMITED';
	ToolErrorCode['INTERNAL_ERROR'] = 'INTERNAL_ERROR';
})(ToolErrorCode || (ToolErrorCode = {}));
// Validation error thrown when a contract schema rejects input
export class ToolValidationError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ToolValidationError';
	}
}
//# sourceMappingURL=tool-errors.js.map
