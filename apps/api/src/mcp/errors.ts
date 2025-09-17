import { McpToolError, ToolValidationError } from '@cortex-os/mcp-core';

export class McpApiError extends McpToolError {
	constructor(
		message: string,
		options: {
			code?: string;
			details?: Record<string, unknown>;
			cause?: unknown;
		} = {},
	) {
		super(message, options);
	}
}

export class McpSecurityError extends McpApiError {
	constructor(message: string) {
		super(message, { code: 'E_API_SECURITY' });
	}
}

export class McpRateLimitError extends McpApiError {
	constructor(message: string) {
		super(message, { code: 'E_API_RATE_LIMIT' });
	}
}

export class McpRouteNotFoundError extends McpApiError {
	constructor(details: Record<string, unknown>) {
		super('No matching API operation found for the provided input.', {
			code: 'E_API_ROUTE_NOT_FOUND',
			details,
		});
	}
}

export class McpValidationError extends ToolValidationError {}

export class McpHandlerError extends McpApiError {
	constructor(message: string, cause?: unknown) {
		super(message, { code: 'E_API_HANDLER', cause });
	}
}
