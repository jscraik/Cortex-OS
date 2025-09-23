/**
 * MCP tool contract definitions for the memories package.
 *
 * These definitions provide contract-first metadata, schemas, and
 * validation helpers for exposing Cortex memories over the Model Context
 * Protocol. Handlers are intentionally left as `NOT_IMPLEMENTED` so that
 * subsequent tasks can focus on execution logic while reusing the shared
 * contracts defined here.
 */

import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { ZodError, type ZodIssue, type ZodType, z } from 'zod';
import { createStoreFromEnv } from '../config/store-from-env.js';
import { createMemoryStoreHandler } from './handlers.js';

interface MemoryToolResponse {
	content: Array<{ type: 'text'; text: string }>;
	metadata: {
		correlationId: string;
		timestamp: string;
		tool: string;
	};
	isError?: boolean;
}

interface MemoryTool {
	name: string;
	aliases?: string[];
	description: string;
	inputSchema: ZodType;
	handler: (params: unknown) => Promise<MemoryToolResponse>;
	invoke?: ToolContractInvoker;
}
class MemoryToolError extends Error {
	constructor(
		public code: 'validation_error' | 'security_error' | 'not_found' | 'internal_error',
		message: string,
		public details: string[] = [],
	) {
		super(message);
		this.name = 'MemoryToolError';
	}
}

type ContractErrorDetail = { issues: ZodIssue[] } | undefined;

type ContractInvocationError = {
	code: string;
	message: string;
	httpStatus: number;
	retryable: boolean;
	details?: ContractErrorDetail;
};

type ToolContractResult =
	| { type: 'error'; error: ContractInvocationError }
	| { type: 'result'; result: Record<string, unknown> };

type ToolContractInvoker = (
	input: unknown,
	context?: Record<string, unknown>,
) => Promise<ToolContractResult>;

export const MAX_MEMORY_TEXT_LENGTH = 8192;
const MAX_MEMORY_TAGS = 32;
const MAX_METADATA_ENTRIES = 50;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ARRAY_LENGTH = 50;
const MAX_METADATA_STRING_LENGTH = 2048;
const MAX_METADATA_SIZE_BYTES = 8_192;

const MEMORY_ID_PATTERN = /^[a-zA-Z0-9._:-]{3,128}$/;
const MEMORY_KIND_PATTERN = /^[a-zA-Z0-9._-]+$/;
const UNSAFE_METADATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function _ensurePlainObject(
	value: unknown,
	context: string,
): asserts value is Record<string, unknown> {
	if (!isRecord(value)) {
		throw new MemoryToolError('validation_error', `${context} must be an object`, [
			`${context} must be an object`,
		]);
	}
	const proto = Reflect.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) {
		const message =
			context === 'metadata'
				? 'Unsafe metadata prototype detected'
				: `Unsafe prototype detected for ${context}`;
		throw new MemoryToolError('security_error', message, [`${context} has unsafe prototype`]);
	}
}

function createCorrelationId(): string {
	return randomUUID();
}

function mapZodIssues(issues: ZodIssue[]): string[] {
	return issues.map((issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`);
}

function toContractIssues(issues: ZodIssue[]): ContractErrorDetail {
	return { issues };
}

function createContractInvoker(canonicalName: string, schema: ZodType): ToolContractInvoker {
	return async (input: unknown): Promise<ToolContractResult> => {
		try {
			schema.parse(input);
		} catch (error) {
			if (error instanceof ZodError) {
				return {
					type: 'error',
					error: {
						code: 'INVALID_INPUT',
						message: `${canonicalName} received invalid input`,
						httpStatus: 400,
						retryable: false,
						details: toContractIssues(error.issues),
					},
				};
			}
			return {
				type: 'error',
				error: {
					code: 'INVALID_INPUT',
					message: `${canonicalName} validation failed`,
					httpStatus: 400,
					retryable: false,
				},
			};
		}
		return {
			type: 'error',
			error: {
				code: 'NOT_IMPLEMENTED',
				message: `${canonicalName} handler not implemented`,
				httpStatus: 501,
				retryable: false,
			},
		};
	};
}

function _sanitizeText(text: string, field: 'text' | 'update_text'): string {
	const normalized = text.trim();
	if (!normalized) {
		throw new MemoryToolError('validation_error', 'Text content cannot be empty', [
			`${field === 'text' ? 'Text' : 'Updated text'} cannot be empty`,
		]);
	}
	if (normalized.length > MAX_MEMORY_TEXT_LENGTH) {
		throw new MemoryToolError(
			'validation_error',
			`Text exceeds maximum length of ${MAX_MEMORY_TEXT_LENGTH} characters`,
			[`Text length ${normalized.length} exceeds limit of ${MAX_MEMORY_TEXT_LENGTH}`],
		);
	}
	return normalized;
}

function _sanitizeTags(tags: string[] = []): string[] {
	const unique: string[] = [];
	const seen = new Set<string>();

	for (const raw of tags) {
		const tag = raw.trim();
		if (!tag) continue;
		if (tag.length > 64) {
			throw new MemoryToolError('validation_error', 'Tag exceeds maximum length of 64 characters', [
				`Tag "${tag.slice(0, 80)}" exceeds maximum length`,
			]);
		}
		if (seen.has(tag)) continue;
		if (unique.length >= MAX_MEMORY_TAGS) {
			throw new MemoryToolError(
				'validation_error',
				`Too many tags provided (max ${MAX_MEMORY_TAGS})`,
				[`Tag limit of ${MAX_MEMORY_TAGS} exceeded`],
			);
		}
		seen.add(tag);
		unique.push(tag);
	}

	return unique;
}

function sanitizeMetadataValue(value: unknown, depth: number): unknown {
	if (depth > MAX_METADATA_DEPTH) {
		throw new MemoryToolError(
			'validation_error',
			`Metadata nesting depth exceeds ${MAX_METADATA_DEPTH}`,
			[`Metadata depth ${depth} exceeds maximum of ${MAX_METADATA_DEPTH}`],
		);
	}

	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		if (value.length > MAX_METADATA_STRING_LENGTH) {
			throw new MemoryToolError(
				'validation_error',
				'Metadata string value exceeds allowed length',
				[`Metadata string length ${value.length} exceeds limit of ${MAX_METADATA_STRING_LENGTH}`],
			);
		}
		return value;
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new MemoryToolError('validation_error', 'Metadata numbers must be finite', [
				'Metadata numbers must be finite',
			]);
		}
		return value;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		if (value.length > MAX_METADATA_ARRAY_LENGTH) {
			throw new MemoryToolError(
				'validation_error',
				`Metadata arrays cannot exceed ${MAX_METADATA_ARRAY_LENGTH} items`,
				[`Metadata array length ${value.length} exceeds limit of ${MAX_METADATA_ARRAY_LENGTH}`],
			);
		}
		return value.map((item) => sanitizeMetadataValue(item, depth + 1));
	}

	if (typeof value === 'object') {
		return sanitizeMetadata(value as Record<string, unknown>, depth + 1);
	}

	throw new MemoryToolError(
		'validation_error',
		`Unsupported metadata value type: ${typeof value}`,
		[`Unsupported metadata value type: ${typeof value}`],
	);
}

function ensureMetadataSize(metadata: Record<string, unknown>): void {
	const serialized = JSON.stringify(metadata);
	const bytes = Buffer.byteLength(serialized, 'utf8');
	if (bytes > MAX_METADATA_SIZE_BYTES) {
		throw new MemoryToolError(
			'validation_error',
			`Metadata payload exceeds ${MAX_METADATA_SIZE_BYTES} bytes`,
			[`Metadata size ${bytes} bytes exceeds limit of ${MAX_METADATA_SIZE_BYTES}`],
		);
	}
}

function sanitizeMetadata(metadata: Record<string, unknown>, depth = 0): Record<string, unknown> {
	if (depth > MAX_METADATA_DEPTH) {
		throw new MemoryToolError(
			'validation_error',
			`Metadata nesting depth exceeds ${MAX_METADATA_DEPTH}`,
			[`Metadata depth ${depth} exceeds maximum of ${MAX_METADATA_DEPTH}`],
		);
	}

	const proto = Reflect.getPrototypeOf(metadata);
	if (proto !== Object.prototype && proto !== null) {
		throw new MemoryToolError('security_error', 'Unsafe metadata prototype detected', [
			'Metadata prototype must not override Object.prototype',
		]);
	}

	const entries = Object.entries(metadata);
	if (entries.length > MAX_METADATA_ENTRIES) {
		throw new MemoryToolError(
			'validation_error',
			`Metadata contains too many keys (max ${MAX_METADATA_ENTRIES})`,
			[`Metadata key count ${entries.length} exceeds limit of ${MAX_METADATA_ENTRIES}`],
		);
	}

	const sanitized = Object.create(null) as Record<string, unknown>;

	for (const [rawKey, value] of entries) {
		const key = rawKey.trim();
		if (!key) {
			throw new MemoryToolError('validation_error', 'Metadata keys cannot be empty', [
				'Metadata keys cannot be empty',
			]);
		}
		if (UNSAFE_METADATA_KEYS.has(key) || key.startsWith('__')) {
			throw new MemoryToolError('security_error', `Unsafe metadata key "${key}" detected`, [
				`Metadata key "${key}" is not allowed`,
			]);
		}
		sanitized[key] = sanitizeMetadataValue(value, depth + 1);
	}

	ensureMetadataSize(sanitized);

	return sanitized;
}

function createSuccessResponse<T>(
	tool: string,
	data: T,
	correlationId: string,
	timestamp: string,
): MemoryToolResponse {
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: true,
					data,
					correlationId,
					timestamp,
				}),
			},
		],
		metadata: { correlationId, timestamp, tool },
	};
}

function createErrorResponse(
	tool: string,
	error: { code: string; message: string; details?: string[] },
	correlationId: string,
	timestamp: string,
	durationMs?: number,
): MemoryToolResponse {
	console.error(`[memories:mcp:${tool}] ${error.code}: ${error.message}`, {
		correlationId,
		details: error.details ?? [],
		...(typeof durationMs === 'number' ? { durationMs } : {}),
	});

	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: false,
					error: {
						code: error.code,
						message: error.message,
						details: error.details ?? [],
					},
					correlationId,
					timestamp,
				}),
			},
		],
		metadata: { correlationId, timestamp, tool },
		isError: true,
	};
}

async function executeTool<
	TOutput,
	TSchema extends ZodType<TOutput, z.ZodTypeDef, unknown>,
	TResult,
>(
	tool: string,
	schema: TSchema,
	params: unknown,
	logic: (input: TOutput, raw: unknown) => Promise<TResult> | TResult,
): Promise<MemoryToolResponse> {
	const correlationId = createCorrelationId();
	const timestamp = new Date().toISOString();
	const startedAt = Date.now();

	try {
		const parsed = schema.parse(params);
		const result = await logic(parsed, params);
		console.debug(`[memories:mcp:${tool}] completed`, {
			correlationId,
			durationMs: Date.now() - startedAt,
		});
		return createSuccessResponse(tool, result, correlationId, timestamp);
	} catch (error) {
		const durationMs = Date.now() - startedAt;
		if (error instanceof MemoryToolError) {
			return createErrorResponse(
				tool,
				{
					code: error.code,
					message: error.message,
					details: error.details,
				},
				correlationId,
				timestamp,
				durationMs,
			);
		}
		if (error instanceof ZodError) {
			return createErrorResponse(
				tool,
				{
					code: 'validation_error',
					message: 'Invalid input provided',
					details: mapZodIssues(error.issues),
				},
				correlationId,
				timestamp,
				durationMs,
			);
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return createErrorResponse(
			tool,
			{
				code: 'internal_error',
				message,
			},
			correlationId,
			timestamp,
			durationMs,
		);
	}
}

const memoryKindSchema = z
	.string()
	.min(1)
	.max(32)
	.regex(
		MEMORY_KIND_PATTERN,
		'Kind may only contain alphanumeric characters, dots, underscores, or hyphens',
	);

const memoryIdentifierSchema = z
	.string()
	.min(3)
	.max(128)
	.regex(
		MEMORY_ID_PATTERN,
		'Memory ID may only contain alphanumeric characters, dots, colons, underscores, or hyphens',
	);

// Memory tool schemas
export const memoryStoreToolSchema = z.object({
	kind: memoryKindSchema,
	text: z.string().min(1).describe('Content to store'),
	tags: z.array(z.string()).default([]).describe('Tags for categorization'),
	metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
});

export const memorySearchToolSchema = z.object({
	query: z.string().min(1).describe('Query to search for similar memories'),
	limit: z.number().int().positive().max(100).default(10).describe('Maximum number of results'),
	kind: memoryKindSchema.optional().describe('Filter by memory type'),
	tags: z.array(z.string()).optional().describe('Filter by tags'),
});

export const memoryUpdateToolSchema = z.object({
	id: memoryIdentifierSchema.describe('Memory item ID to update'),
	text: z.string().min(1).optional().describe('Updated content'),
	tags: z.array(z.string()).optional().describe('Updated tags'),
	metadata: z.record(z.unknown()).optional().describe('Updated metadata'),
});

export const memoryDeleteToolSchema = z
	.object({
		id: memoryIdentifierSchema.describe('Memory item ID to delete'),
	})
	.strict();

export const memoryStatsToolSchema = z.object({
	includeDetails: z.boolean().default(false).describe('Include detailed statistics'),
});

export const memoryGetToolSchema = z
	.object({
		id: memoryIdentifierSchema.describe('Memory item ID to retrieve'),
		namespace: z.string().min(1).default('default'),
	})
	.strict();

export const memoryListToolSchema = z
	.object({
		namespace: z.string().min(1).optional(),
		limit: z.number().int().min(1).max(100).default(20),
		cursor: z.string().min(1).optional(),
		tags: z.array(z.string()).max(32).optional(),
	})
	.superRefine((value, ctx) => {
		if (value.cursor && !value.namespace) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Namespace is required when cursor is provided',
				path: ['namespace'],
			});
		}
	});

type MemoryStoreHandlerInput = z.infer<typeof memoryStoreToolSchema>;
type MemorySearchHandlerInput = z.infer<typeof memorySearchToolSchema>;
type MemoryUpdateHandlerInput = z.infer<typeof memoryUpdateToolSchema>;
type MemoryDeleteHandlerInput = z.infer<typeof memoryDeleteToolSchema>;
type MemoryGetHandlerInput = z.infer<typeof memoryGetToolSchema>;
type MemoryListHandlerInput = z.infer<typeof memoryListToolSchema>;
type MemoryStatsHandlerInput = z.infer<typeof memoryStatsToolSchema>;

// Memory MCP Tool definitions
let storeHandler: ReturnType<typeof createMemoryStoreHandler> | null = null;

async function getStoreHandler() {
	if (!storeHandler) {
		const store = await createStoreFromEnv();
		const namespace = process.env.LOCAL_MEMORY_NAMESPACE || 'default';
		storeHandler = createMemoryStoreHandler(store, namespace);
	}
	return storeHandler;
}

export const memoryStoreTool: MemoryTool = {
	name: 'memories.store',
	aliases: ['memory_store'],
	description: 'Store information in the memory system',
	inputSchema: memoryStoreToolSchema,
	invoke: createContractInvoker('memories.store', memoryStoreToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.store',
			memoryStoreToolSchema,
			params,
			async ({ kind, text, tags, metadata }: MemoryStoreHandlerInput) => {
				const handler = await getStoreHandler();
				return await handler.store({ kind, text, tags, metadata });
			},
		),
};

export const memorySearchTool: MemoryTool = {
	name: 'memories.search',
	aliases: ['memory_retrieve'],
	description: 'Retrieve information from the memory system',
	inputSchema: memorySearchToolSchema,
	invoke: createContractInvoker('memories.search', memorySearchToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.search',
			memorySearchToolSchema,
			params,
			async ({ query, limit, kind, tags }: MemorySearchHandlerInput) => {
				const handler = await getStoreHandler();
				const results = await handler.search({ query, limit, kind, tags });
				return {
					...results,
					filters: {
						kind: kind ?? null,
						tags: tags ?? [],
					},
				};
			},
		),
};

export const memoryUpdateTool: MemoryTool = {
	name: 'memories.update',
	aliases: ['memory_update'],
	description: 'Update existing memory items',
	inputSchema: memoryUpdateToolSchema,
	invoke: createContractInvoker('memories.update', memoryUpdateToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.update',
			memoryUpdateToolSchema,
			params,
			async ({ id, text, tags, metadata }: MemoryUpdateHandlerInput) => {
				const handler = await getStoreHandler();
				return await handler.update({ id, text, tags, metadata });
			},
		),
};

export const memoryDeleteTool: MemoryTool = {
	name: 'memories.delete',
	aliases: ['memory_delete'],
	description: 'Delete memory items',
	inputSchema: memoryDeleteToolSchema,
	invoke: createContractInvoker('memories.delete', memoryDeleteToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.delete',
			memoryDeleteToolSchema,
			params,
			async ({ id }: MemoryDeleteHandlerInput) => {
				const handler = await getStoreHandler();
				return await handler.delete({ id });
			},
		),
};

export const memoryGetTool: MemoryTool = {
	name: 'memories.get',
	aliases: ['memory_get'],
	description: 'Retrieve a specific memory item by identifier',
	inputSchema: memoryGetToolSchema,
	invoke: createContractInvoker('memories.get', memoryGetToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.get',
			memoryGetToolSchema,
			params,
			async ({ id }: MemoryGetHandlerInput) => {
				const handler = await getStoreHandler();
				const memory = await handler.get({ id });
				if (!memory) {
					throw new Error(`Memory with ID ${id} not found`);
				}
				return memory;
			},
		),
};

export const memoryListTool: MemoryTool = {
	name: 'memories.list',
	aliases: ['memory_list'],
	description: 'List memory items with pagination support',
	inputSchema: memoryListToolSchema,
	invoke: createContractInvoker('memories.list', memoryListToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.list',
			memoryListToolSchema,
			params,
			async ({ namespace, limit, cursor, tags }: MemoryListHandlerInput) => {
				const handler = await getStoreHandler();
				return await handler.list({ namespace, limit, cursor, tags });
			},
		),
};

export const memoryStatsTool: MemoryTool = {
	name: 'memories.stats',
	aliases: ['memory_stats'],
	description: 'Get memory system statistics',
	inputSchema: memoryStatsToolSchema,
	invoke: createContractInvoker('memories.stats', memoryStatsToolSchema),
	handler: async (params: unknown) =>
		executeTool(
			'memories.stats',
			memoryStatsToolSchema,
			params,
			async ({ includeDetails }: MemoryStatsHandlerInput) => {
				const handler = await getStoreHandler();
				return await handler.stats({ includeDetails });
			},
		),
};

// Export all Memory MCP tools
export const memoryMcpTools: MemoryTool[] = [
	memoryStoreTool,
	memoryGetTool,
	memoryListTool,
	memorySearchTool,
	memoryDeleteTool,
];
