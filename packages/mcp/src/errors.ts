/**
 * HTTP Exception class for MCP server error handling
 * Includes brAInwav branding as per standards
 */
export class HTTPException extends Error {
	public readonly status: number;
	public readonly headers?: Record<string, string>;

	constructor(status: number, message: string, options?: { headers?: Record<string, string> }) {
		super(`[brAInwav] ${message}`);
		this.name = 'HTTPException';
		this.status = status;
		this.headers = options?.headers;
	}

	/**
	 * Create a standardized error response
	 */
	toJSON(): { error: string; status: number; headers?: Record<string, string> } {
		return {
			error: this.message,
			status: this.status,
			...(this.headers && { headers: this.headers }),
		};
	}
}

/**
 * MCP-specific error codes
 */
export const MCPErrorCodes = {
	UNSATISFIED_TOOL_VERSION: -32001,
	INVALID_TOOL_VERSION: -32002,
	RESOURCE_SUBSCRIPTION_FAILED: -32003,
	PROMPT_LOAD_FAILED: -32004,
} as const;

/**
 * MCP-specific exception for tool version constraints
 */
export class MCPToolVersionException extends HTTPException {
	constructor(message: string, code: keyof typeof MCPErrorCodes = 'UNSATISFIED_TOOL_VERSION') {
		super(-32000, message, {
			headers: {
				'X-MCP-Error-Code': MCPErrorCodes[code].toString(),
			},
		});
		this.name = 'MCPToolVersionException';
	}
}

/**
 * MCP-specific exception for resource operations
 */
export class MCPResourceException extends HTTPException {
	constructor(message: string, code: keyof typeof MCPErrorCodes = 'RESOURCE_SUBSCRIPTION_FAILED') {
		super(-32000, message, {
			headers: {
				'X-MCP-Error-Code': MCPErrorCodes[code].toString(),
			},
		});
		this.name = 'MCPResourceException';
	}
}

/**
 * MCP-specific exception for prompt operations
 */
export class MCPPromptException extends HTTPException {
	constructor(message: string, code: keyof typeof MCPErrorCodes = 'PROMPT_LOAD_FAILED') {
		super(-32000, message, {
			headers: {
				'X-MCP-Error-Code': MCPErrorCodes[code].toString(),
			},
		});
		this.name = 'MCPPromptException';
	}
}
