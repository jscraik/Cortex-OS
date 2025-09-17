export type ToolArguments = Record<string, unknown>;

export interface ToolCallParams {
	name: string;
	arguments?: ToolArguments;
}

export interface ToolRequest {
	jsonrpc: '2.0';
	id: string | number;
	method: 'tools/call';
	params: ToolCallParams;
}

export interface ToolContentBlock {
	type: string;
	text?: string;
	[key: string]: unknown;
}

export interface ToolCallResult {
	content: ToolContentBlock[];
	isError?: boolean;
	structuredContent?: Record<string, unknown>;
	_meta?: Record<string, unknown>;
}

export interface ToolResponse {
	jsonrpc: '2.0';
	id: string | number;
	result: ToolCallResult;
}

export interface ToolErrorResponse {
	jsonrpc: '2.0';
	id: string | number;
	error: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export const toolRequestSchema = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: 'https://cortex-os.dev/schemas/mcp/tool-request.json',
	type: 'object',
	additionalProperties: false,
	required: ['jsonrpc', 'id', 'method', 'params'],
	properties: {
		jsonrpc: { type: 'string', const: '2.0' },
		id: {
			anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer' }],
		},
		method: { type: 'string', const: 'tools/call' },
		params: {
			type: 'object',
			required: ['name'],
			additionalProperties: false,
			properties: {
				name: { type: 'string', minLength: 1 },
				arguments: {
					type: 'object',
					additionalProperties: true,
				},
			},
		},
	},
} as const;

const contentBlockSchema = {
	type: 'object',
	required: ['type'],
	additionalProperties: true,
	properties: {
		type: { type: 'string', minLength: 1 },
		text: { type: 'string' },
	},
} as const;

export const toolResponseSchema = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: 'https://cortex-os.dev/schemas/mcp/tool-response.json',
	type: 'object',
	additionalProperties: false,
	required: ['jsonrpc', 'id', 'result'],
	properties: {
		jsonrpc: { type: 'string', const: '2.0' },
		id: {
			anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer' }],
		},
		result: {
			type: 'object',
			additionalProperties: false,
			required: ['content'],
			properties: {
				content: {
					type: 'array',
					minItems: 1,
					items: contentBlockSchema,
				},
				isError: { type: 'boolean' },
				structuredContent: {
					type: 'object',
					additionalProperties: true,
				},
				_meta: {
					type: 'object',
					additionalProperties: true,
				},
			},
		},
	},
} as const;

export const toolErrorSchema = {
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: 'https://cortex-os.dev/schemas/mcp/tool-error.json',
	type: 'object',
	additionalProperties: false,
	required: ['jsonrpc', 'id', 'error'],
	properties: {
		jsonrpc: { type: 'string', const: '2.0' },
		id: {
			anyOf: [{ type: 'string', minLength: 1 }, { type: 'integer' }],
		},
		error: {
			type: 'object',
			additionalProperties: true,
			required: ['code', 'message'],
			properties: {
				code: { type: 'integer' },
				message: { type: 'string', minLength: 1 },
				data: {
					anyOf: [
						{ type: 'null' },
						{ type: 'boolean' },
						{ type: 'number' },
						{ type: 'string' },
						{ type: 'array' },
						{ type: 'object' },
					],
				},
			},
		},
	},
} as const;
