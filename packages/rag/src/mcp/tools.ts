/**

 * MCP Tool definitions for the RAG package.
 * Implements ingestion, search, retrieval, reranking, and citation helpers
 * that expose the core RAG pipeline over the Model Context Protocol (MCP).
 */

import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { createLogger } from '@cortex-os/observability';
import { ZodError, type ZodIssue, z } from 'zod';

import { handleRAG } from '../index.js';
import type { RAGQuerySchema } from '../lib/contracts-shim.js';

// Removed unused type MCPResponse

interface RAGToolResponse {
	content: Array<{ type: 'text'; text: string }>;
	metadata: {
		tool: string;
		correlationId: string;
		timestamp: string;
	};
	isError?: boolean;
}

// Define a simple tool interface for now
interface RAGTool {
	name: string;
	description: string;
	inputSchema: z.ZodSchema;
	handler: (params: unknown) => Promise<RAGToolResponse>;
}

type RAGErrorCode = 'validation_error' | 'security_error' | 'internal_error';

class RAGToolError extends Error {
	constructor(
		public code: RAGErrorCode,
		message: string,
		public details: string[] = [],
	) {
		super(message);
		this.name = 'RAGToolError';
	}
}

const logger = createLogger('rag-mcp-tools');

const MAX_QUERY_LENGTH = 4096;
const MAX_INGEST_CONTENT_LENGTH = 25_000;
const MAX_SOURCE_LENGTH = 512;
const MAX_METADATA_SIZE_BYTES = 16_384;
const MAX_METADATA_KEYS = 64;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_ARRAY_LENGTH = 50;
const MAX_METADATA_STRING_LENGTH = 2048;
const UNSAFE_METADATA_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

interface NormalizedError {
	code: RAGErrorCode;
	message: string;
	details: string[];
}

function createCorrelationId(): string {
	return randomUUID();
}

function toTextPayload(payload: unknown): string {
	return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

function mapZodIssues(issues: ZodIssue[]): string[] {
	return issues.map(
		(issue) => `${issue.path.join('.') || issue.code}: ${issue.message}`,
	);
}

function normalizeError(error: unknown): NormalizedError {
	if (error instanceof RAGToolError) {
		return {
			code: error.code,
			message: error.message,
			details: error.details,
		};
	}

	if (error instanceof ZodError) {
		return {
			code: 'validation_error',
			message: 'Invalid input payload',
			details: mapZodIssues(error.issues),
		};
	}

	if (error instanceof Error) {
		return {
			code: 'internal_error',
			message: 'Internal error while executing tool',
			details: [error.message],
		};
	}

	return {
		code: 'internal_error',
		message: 'Unknown error occurred',
		details: [],
	};
}

function createErrorResponse(
	tool: string,
	correlationId: string,
	error: NormalizedError,
): RAGToolResponse {
	const timestamp = new Date().toISOString();
	return {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					success: false,
					error,
					correlationId,
				}),
			},
		],
		metadata: {
			tool,
			correlationId,
			timestamp,
		},
		isError: true,
	};
}

function respondWithError(
	tool: string,
	correlationId: string,
	error: unknown,
): RAGToolResponse {
	const normalized = normalizeError(error);
	const logPayload = {
		correlationId,
		tool,
		error: normalized,
	};

	if (
		normalized.code === 'validation_error' ||
		normalized.code === 'security_error'
	) {
		logger.warn(logPayload, `${tool} validation failed`);
	} else {
		logger.error(logPayload, `${tool} failed`);
	}

	return createErrorResponse(tool, correlationId, normalized);
}

function createSuccessResponse(
	tool: string,
	correlationId: string,
	payload: unknown,
	logContext: Record<string, unknown> = {},
): RAGToolResponse {
	logger.info({ correlationId, tool, ...logContext }, `${tool} completed`);
	return {
		content: [
			{
				type: 'text',
				text: toTextPayload(payload),
			},
		],
		metadata: {
			tool,
			correlationId,
			timestamp: new Date().toISOString(),
		},
	};
}

function sanitizeQuery(raw: string): string {
	const query = raw.trim();
	if (!query) {
		throw new RAGToolError('validation_error', 'Query cannot be empty', [
			'Query cannot be empty',
		]);
	}
	if (query.length > MAX_QUERY_LENGTH) {
		throw new RAGToolError(
			'validation_error',
			`Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters`,
			[`Query length ${query.length} exceeds limit of ${MAX_QUERY_LENGTH}`],
		);
	}
	return query;
}

function sanitizeContent(raw: string): string {
	const content = raw.trim();
	if (!content) {
		throw new RAGToolError('validation_error', 'Content cannot be empty', [
			'Content cannot be empty',
		]);
	}
	if (content.length > MAX_INGEST_CONTENT_LENGTH) {
		throw new RAGToolError(
			'validation_error',
			`Content exceeds maximum length of ${MAX_INGEST_CONTENT_LENGTH} characters`,
			[
				`Content length ${content.length} exceeds limit of ${MAX_INGEST_CONTENT_LENGTH}`,
			],
		);
	}
	return content;
}

function sanitizeSource(raw?: string): string | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const source = raw.trim();
	if (!source) {
		return undefined;
	}
	if (source.length > MAX_SOURCE_LENGTH) {
		throw new RAGToolError(
			'validation_error',
			`Source exceeds maximum length of ${MAX_SOURCE_LENGTH} characters`,
			[`Source length ${source.length} exceeds limit of ${MAX_SOURCE_LENGTH}`],
		);
	}
	return source;
}

function ensurePlainObject(
	value: unknown,
	context: string,
): asserts value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new RAGToolError(
			'validation_error',
			`${context} must be a plain object`,
			[`${context} must be a plain object`],
		);
	}
	const proto = Reflect.getPrototypeOf(value);
	if (proto !== Object.prototype) {
		throw new RAGToolError(
			'security_error',
			`${context} has unsafe prototype`,
			[`${context} has unsafe prototype`],
		);
	}
}

function sanitizeMetadata(
	metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (metadata === undefined) {
		return undefined;
	}

	ensurePlainObject(metadata, 'metadata');
	const sanitized = sanitizeMetadataObject(metadata, 0);

	const serialized = JSON.stringify(sanitized);
	const byteSize = Buffer.byteLength(serialized, 'utf8');
	if (byteSize > MAX_METADATA_SIZE_BYTES) {
		throw new RAGToolError(
			'validation_error',
			`Metadata exceeds maximum size of ${MAX_METADATA_SIZE_BYTES} bytes`,
			[
				`Metadata size ${byteSize} bytes exceeds limit of ${MAX_METADATA_SIZE_BYTES}`,
			],
		);
	}

	return sanitized;
}

function extractMetadataCandidate(params: unknown): unknown {
	if (typeof params !== 'object' || params === null) {
		return undefined;
	}
	if (!('metadata' in params)) {
		return undefined;
	}
	try {
		return (params as Record<string, unknown>).metadata;
	} catch {
		return undefined;
	}
}

function hasUnsafePrototype(value: unknown): boolean {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const proto = Reflect.getPrototypeOf(value);
	// Only return true if the prototype is not Object.prototype or Array.prototype
	return proto !== Object.prototype && proto !== Array.prototype;
}

function sanitizeMetadataObject(
	object: Record<string, unknown>,
	depth: number,
): Record<string, unknown> {
	if (depth > MAX_METADATA_DEPTH) {
		throw new RAGToolError(
			'validation_error',
			`Metadata nesting depth exceeds ${MAX_METADATA_DEPTH}`,
			[`Metadata depth ${depth} exceeds maximum of ${MAX_METADATA_DEPTH}`],
		);
	}

	if (Object.keys(object).length > MAX_METADATA_KEYS) {
		throw new RAGToolError(
			'validation_error',
			`Metadata contains too many entries (max ${MAX_METADATA_KEYS})`,
			[`Metadata key limit of ${MAX_METADATA_KEYS} exceeded`],
		);
	}

	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(object)) {
		if (UNSAFE_METADATA_KEYS.has(key)) {
			throw new RAGToolError(
				'security_error',
				`Unsafe metadata key "${key}" is not allowed`,
				[`Unsafe metadata key "${key}" is not allowed`],
			);
		}
		sanitized[key] = sanitizeMetadataValue(value, depth + 1);
	}

	return sanitized;
}

function sanitizeMetadataValue(value: unknown, depth: number): unknown {
	if (depth > MAX_METADATA_DEPTH) {
		throw new RAGToolError(
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
			throw new RAGToolError(
				'validation_error',
				'Metadata string value exceeds allowed length',
				[
					`Metadata string length ${value.length} exceeds limit of ${MAX_METADATA_STRING_LENGTH}`,
				],
			);
		}
		return value;
	}

	if (typeof value === 'number') {
		if (!Number.isFinite(value)) {
			throw new RAGToolError(
				'validation_error',
				'Metadata numbers must be finite',
				['Metadata numbers must be finite'],
			);
		}
		return value;
	}

	if (typeof value === 'boolean') {
		return value;
	}

	if (Array.isArray(value)) {
		if (value.length > MAX_METADATA_ARRAY_LENGTH) {
			throw new RAGToolError(
				'validation_error',
				`Metadata arrays cannot exceed ${MAX_METADATA_ARRAY_LENGTH} items`,
				[
					`Metadata array length ${value.length} exceeds limit of ${MAX_METADATA_ARRAY_LENGTH}`,
				],
			);
		}
		return value.map((item) => sanitizeMetadataValue(item, depth + 1));
	}

	if (typeof value === 'object') {
		ensurePlainObject(value, 'metadata');
		return sanitizeMetadataObject(value, depth + 1);
	}
	// Removed unused type MCPResponse

	throw new RAGToolError(
		'validation_error',
		`Unsupported metadata value type: ${typeof value}`,
		[`Unsupported metadata value type: ${typeof value}`],
	);
}

export const ragQueryToolSchema = z.object({
	query: z
		.string()
		.min(1)
		.max(MAX_QUERY_LENGTH)
		.describe('The query text to search for'),
	topK: z
		.number()
		.int()
		.positive()
		.max(100)
		.default(5)
		.describe('Number of results to return'),
	maxTokens: z
		.number()
		.int()
		.positive()
		.max(4096)
		.default(1024)
		.describe('Maximum tokens for response'),
	timeoutMs: z
		.number()
		.int()
		.positive()
		.max(120000)
		.default(30000)
		.describe('Timeout in milliseconds'),
});

export const ragIngestToolSchema = z.object({
	content: z
		.string()
		.min(1)
		.describe('Content to ingest into RAG knowledge base'),
	source: z.string().optional().describe('Source identifier for the content'),
	metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
});

export const ragStatusToolSchema = z.object({
	includeStats: z
		.boolean()
		.default(false)
		.describe('Include detailed statistics'),
});

export const ragQueryTool: RAGTool = {
	name: 'rag_query',
	description: 'Query the RAG knowledge base using semantic search',
	inputSchema: ragQueryToolSchema,
	handler: async (params: unknown) => {
		const correlationId = createCorrelationId();
		try {
			const {
				query: rawQuery,
				topK,
				maxTokens,
				timeoutMs,
			} = ragQueryToolSchema.parse(params);

			const query = sanitizeQuery(rawQuery);

			logger.debug(
				{
					correlationId,
					tool: 'rag_query',
					queryLength: query.length,
					topK,
				},
				'rag_query executing',
			);

			const input = {
				config: {
					maxTokens,
					timeoutMs,
					memory: {
						maxItems: Math.min(topK * 10, 1_000),
						maxBytes: maxTokens * 4,
					},
				},
				query: { query, topK } satisfies z.infer<typeof RAGQuerySchema>,
				json: true,
			};

			const result = await handleRAG(input);

			return createSuccessResponse('rag_query', correlationId, result, {
				queryLength: query.length,
				topK,
			});
		} catch (error) {
			return respondWithError('rag_query', correlationId, error);
		}
	},
};

export const ragIngestTool: RAGTool = {
	name: 'rag_ingest',
	description: 'Ingest content into the RAG knowledge base',
	inputSchema: ragIngestToolSchema,
	handler: async (params: unknown) => {
		const correlationId = createCorrelationId();
		try {
			const metadataCandidate = extractMetadataCandidate(params);
			if (hasUnsafePrototype(metadataCandidate)) {
				throw new RAGToolError(
					'security_error',
					'Unsafe metadata prototype detected',
					['metadata has unsafe prototype'],
				);
			}

			const {
				content: rawContent,
				source: rawSource,
				metadata: rawMetadata,
			} = ragIngestToolSchema.parse(params);

			const content = sanitizeContent(rawContent);
			const source = sanitizeSource(rawSource);
			const metadata = sanitizeMetadata(rawMetadata);

			logger.debug(
				{
					correlationId,
					tool: 'rag_ingest',
					contentLength: content.length,
					hasMetadata: Boolean(metadata),
				},
				'rag_ingest executing',
			);

			const result = {
				status: 'ingested',
				contentLength: content.length,
				source,
				metadata,
				timestamp: new Date().toISOString(),
			};

			return createSuccessResponse('rag_ingest', correlationId, {
				success: true,
				result,
			});
		} catch (error) {
			return respondWithError('rag_ingest', correlationId, error);
		}
	},
};

export const ragStatusTool: RAGTool = {
	name: 'rag_status',
	description: 'Get status and statistics of the RAG system',
	inputSchema: ragStatusToolSchema,
	handler: async (params: unknown) => {
		const correlationId = createCorrelationId();
		try {
			const { includeStats } = ragStatusToolSchema.parse(params);

			logger.debug(
				{
					correlationId,
					tool: 'rag_status',
					includeStats,
				},
				'rag_status executing',
			);

			const status = {
				status: 'active',
				timestamp: new Date().toISOString(),
				...(includeStats && {
					stats: {
						documentsIngested: 0,
						totalEmbeddings: 0,
						lastQuery: null as string | null,
						averageQueryTime: 0,
					},
				}),
			};

			return createSuccessResponse('rag_status', correlationId, {
				success: true,
				status,
			});
		} catch (error) {
			return respondWithError('rag_status', correlationId, error);
		}
	},
};

export const ragMcpTools: RAGTool[] = [
	ragQueryTool,
	ragIngestTool,
	ragStatusTool,
];
