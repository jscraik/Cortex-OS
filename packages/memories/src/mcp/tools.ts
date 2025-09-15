
/**
 * MCP tool contract definitions for the memories package.
 *
 * These definitions provide contract-first metadata, schemas, and
 * validation helpers for exposing Cortex memories over the Model Context
 * Protocol. Handlers are intentionally left as `NOT_IMPLEMENTED` so that
 * subsequent tasks can focus on execution logic while reusing the shared
 * contracts defined here.
 */


import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { memoryZ } from '../schemas/memory.zod.js';

const MEMORY_KIND_VALUES = ['note', 'event', 'artifact', 'embedding'] as const;
const EXAMPLE_TIMESTAMP = '2024-01-01T00:00:00.000Z';

const isoDateTimeSchema = z
        .string()
        .datetime({ offset: true })
        .describe('ISO-8601 timestamp with timezone information.');

const namespaceSchema = z
        .string()
        .trim()
        .min(1, 'Namespace must not be empty')
        .max(128, 'Namespace must be <= 128 characters')
        .regex(/^[A-Za-z0-9._:-]+$/, 'Namespace may only include alphanumeric, dot, colon, underscore or dash characters')
        .describe('Logical namespace used to isolate memory records.');

const memoryIdSchema = z
        .string()
        .trim()
        .min(1, 'Memory id is required')
        .max(128, 'Memory id must be <= 128 characters')
        .regex(/^[A-Za-z0-9._:-]+$/, 'Memory id may only include alphanumeric, dot, colon, underscore or dash characters')
        .describe('Unique identifier for a memory record.');

const tagSchema = z
        .string()
        .trim()
        .min(1, 'Tags must not be empty')
        .max(64, 'Tags must be <= 64 characters')
        .describe('Tag label attached to a memory item.');

const vectorSchema = z
        .array(z.number().finite())
        .min(1, 'Vector must include at least one dimension')
        .max(4096, 'Vector must not exceed 4096 dimensions')
        .describe('Embedding vector representation of the memory.');

const evidenceSchema = z
        .object({
                uri: z.string().url('Evidence URI must be a valid URL'),
                range: z
                        .tuple([z.number().int().nonnegative(), z.number().int().positive()])
                        .refine(([start, end]) => start < end, {
                                message: 'Evidence range must be ascending',
                        })
                        .optional(),
        })
        .strict();

const provenanceSchema = z.object({
        source: z.enum(['user', 'agent', 'system'] as const),
        actor: z.string().trim().min(1).max(128).optional(),
        evidence: z.array(evidenceSchema).max(10).optional(),
        hash: z.string().trim().min(1).max(128).optional(),
});

const policySchema = z.object({
        pii: z.boolean().optional(),
        scope: z.enum(['session', 'user', 'org'] as const).optional(),
        requiresConsent: z.boolean().optional(),
});

const memoryRecordSchema = z
        .object({
                id: memoryIdSchema,
                kind: z.enum(MEMORY_KIND_VALUES),
                namespace: namespaceSchema.optional(),
                text: z
                        .string()
                        .trim()
                        .min(1, 'Text must not be empty when provided')
                        .max(16384, 'Text must be <= 16384 characters')
                        .optional(),
                vector: vectorSchema.optional(),
                tags: z.array(tagSchema).max(32).default([]),
                ttl: isoDateTimeSchema.optional(),
                provenance: provenanceSchema,
                policy: policySchema.optional(),
                embeddingModel: z.string().trim().min(1).max(128).optional(),
                createdAt: isoDateTimeSchema,
                updatedAt: isoDateTimeSchema,
        })
        .superRefine((value, ctx) => {
                if (!value.text && !value.vector) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['text'],
                                message: 'Either text or vector must be provided.',
                        });
                }
        });

const memoryRecordOutputSchema = memoryZ.omit({ namespace: true }).extend({
        namespace: namespaceSchema.optional(),
});

const memorySearchHitSchema = memoryRecordOutputSchema.extend({
        score: z
                .number()
                .min(0)
                .max(1)
                .optional()
                .describe('Optional similarity score in the range [0,1].'),
});

export const memoryStoreInputSchema = memoryRecordSchema;
export const memoryStoreOutputSchema = z.object({
        status: z.enum(['created', 'updated', 'pending'] as const),
        memory: memoryRecordOutputSchema,
});

export const memoryGetInputSchema = z.object({
        id: memoryIdSchema,
        namespace: namespaceSchema.optional(),
        includePending: z.boolean().default(false),
});

export const memoryGetOutputSchema = z.object({
        memory: memoryRecordOutputSchema.nullable(),
});

export const memoryDeleteInputSchema = z.object({
        id: memoryIdSchema,
        namespace: namespaceSchema.optional(),
        hardDelete: z.boolean().default(false),
});

export const memoryDeleteOutputSchema = z.object({
        id: memoryIdSchema,
        deleted: z.literal(true),
        performedAt: isoDateTimeSchema,
});

export const memoryListInputSchema = z
        .object({
                namespace: namespaceSchema.optional(),
                limit: z
                        .number()
                        .int()
                        .min(1)
                        .max(100)
                        .default(25)
                        .describe('Maximum number of items to return.'),
                cursor: z.string().trim().min(1).optional(),
                kinds: z.array(z.enum(MEMORY_KIND_VALUES)).max(4).optional(),
                tags: z.array(tagSchema).max(16).optional(),
        })
        .superRefine((value, ctx) => {
                if (value.cursor && !value.namespace) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['namespace'],
                                message: 'Namespace is required when using a cursor.',
                        });
                }
        });

export const memoryListOutputSchema = z.object({
        items: z.array(memoryRecordOutputSchema),
        nextCursor: z.string().optional(),
});

export const memorySearchInputSchema = z
        .object({
                query: z.string().trim().min(1).max(4096).optional(),
                vector: vectorSchema.optional(),
                namespace: namespaceSchema.optional(),
                limit: z
                        .number()
                        .int()
                        .min(1)
                        .max(50)
                        .default(8)
                        .describe('Maximum number of results to return.'),
                kinds: z.array(z.enum(MEMORY_KIND_VALUES)).max(4).optional(),
                tags: z.array(tagSchema).max(16).optional(),
        })
        .superRefine((value, ctx) => {
                if (!value.query && !value.vector) {
                        ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                path: ['query'],
                                message: 'Either a text query or a vector must be provided.',
                        });
                }
        });

export const memorySearchOutputSchema = z.object({
        items: z.array(memorySearchHitSchema),
        tookMs: z.number().nonnegative().optional(),
});

export type MemoryStoreInput = z.infer<typeof memoryStoreInputSchema>;
export type MemoryStoreOutput = z.infer<typeof memoryStoreOutputSchema>;
export type MemoryGetInput = z.infer<typeof memoryGetInputSchema>;
export type MemoryGetOutput = z.infer<typeof memoryGetOutputSchema>;
export type MemoryDeleteInput = z.infer<typeof memoryDeleteInputSchema>;
export type MemoryDeleteOutput = z.infer<typeof memoryDeleteOutputSchema>;
export type MemoryListInput = z.infer<typeof memoryListInputSchema>;
export type MemoryListOutput = z.infer<typeof memoryListOutputSchema>;
export type MemorySearchInput = z.infer<typeof memorySearchInputSchema>;
export type MemorySearchOutput = z.infer<typeof memorySearchOutputSchema>;

export interface MemoryToolContext {
        namespace?: string;
        requestId?: string;
        locale?: string;
}

export interface MemoryToolSuccessResponse<Data> {
        type: 'success';
        data: Data;
        meta?: Record<string, unknown>;
}

export interface MemoryToolErrorDescriptor {
        code: MemoryToolErrorCode;
        summary: string;
        httpStatus: number;
        retryable: boolean;
        remediation: string;
        docsUrl?: string;
}

export interface MemoryToolErrorResponse {
        type: 'error';
        error: MemoryToolErrorDescriptor & {
                message: string;
                details?: unknown;
        };
}

export type MemoryToolResponse<Data> =
        | MemoryToolSuccessResponse<Data>
        | MemoryToolErrorResponse;

export type MemoryToolHandler<Input, Output> = (
        input: Input,
        context: MemoryToolContext,
) => Promise<MemoryToolResponse<Output>>;

export interface MemoryToolDocumentation<Input, Output> {
        summary: string;
        inputExample: Input;
        outputExample: Output | null;
        errors: MemoryToolErrorCode[];
}

export interface MemoryToolDefinition<Input, Output> {
        name: `memories.${string}`;
        description: string;
        inputSchema: z.ZodType<Input>;
        outputSchema: z.ZodType<Output>;
        errors: MemoryToolErrorCatalog;
        docs: MemoryToolDocumentation<Input, Output>;
        invoke(rawInput: unknown, context?: MemoryToolContext): Promise<MemoryToolResponse<Output>>;
}

export type MemoryToolErrorCode =
        | 'INVALID_INPUT'
        | 'NOT_FOUND'
        | 'NOT_IMPLEMENTED'
        | 'STORAGE_FAILURE'
        | 'INTERNAL_ERROR';

export type MemoryToolErrorCatalog = Record<MemoryToolErrorCode, MemoryToolErrorDescriptor>;

export const memoryToolErrorCatalog: MemoryToolErrorCatalog = {
        INVALID_INPUT: {
                code: 'INVALID_INPUT',
                summary: 'The provided payload failed schema validation.',
                httpStatus: 400,
                retryable: false,
                remediation: 'Review the tool input schema and correct invalid fields before retrying.',
                docsUrl: 'https://docs.cortex-oss.dev/memories/mcp#validation-errors',
        },
        NOT_FOUND: {
                code: 'NOT_FOUND',
                summary: 'The requested memory record does not exist.',
                httpStatus: 404,
                retryable: false,
                remediation: 'Verify the memory identifier and namespace.',
                docsUrl: 'https://docs.cortex-oss.dev/memories/mcp#not-found',
        },
        NOT_IMPLEMENTED: {
                code: 'NOT_IMPLEMENTED',
                summary: 'The tool handler has not been implemented yet.',
                httpStatus: 501,
                retryable: true,
                remediation: 'Check for upcoming releases or implement the handler before use.',
                docsUrl: 'https://docs.cortex-oss.dev/memories/mcp#not-implemented',
        },
        STORAGE_FAILURE: {
                code: 'STORAGE_FAILURE',
                summary: 'The underlying memory store rejected the request.',
                httpStatus: 503,
                retryable: true,
                remediation: 'Retry the operation or failover to a secondary store.',
                docsUrl: 'https://docs.cortex-oss.dev/memories/mcp#storage-failure',
        },
        INTERNAL_ERROR: {
                code: 'INTERNAL_ERROR',
                summary: 'An unexpected error occurred while executing the tool.',
                httpStatus: 500,
                retryable: true,
                remediation: 'Inspect server logs for additional context.',
                docsUrl: 'https://docs.cortex-oss.dev/memories/mcp#internal-error',
        },
};

const defaultCatalog: MemoryToolErrorCatalog = memoryToolErrorCatalog;

const formatZodIssues = (error: z.ZodError<unknown>) => ({
        issues: error.errors.map((issue) => ({
                code: issue.code,
                message: issue.message,
                path: issue.path,
        })),
});

export const createMemoryToolErrorResponse = (
        code: MemoryToolErrorCode,
        message: string,
        details?: unknown,
): MemoryToolErrorResponse => {
        const descriptor = defaultCatalog[code] ?? defaultCatalog.INTERNAL_ERROR;
        return {
                type: 'error',
                error: {
                        ...descriptor,
                        message,
                        details,
                },
        };
};

export const isMemoryToolErrorResponse = (
        response: unknown,
): response is MemoryToolErrorResponse => {
        if (typeof response !== 'object' || response === null) {
                return false;
        }
        const candidate = response as { type?: unknown; error?: unknown };
        if (candidate.type !== 'error') {
                return false;
        }
        const errorPayload = candidate.error as Record<string, unknown> | undefined;
        return (
                typeof errorPayload === 'object' &&
                errorPayload !== null &&
                typeof errorPayload.code === 'string'
        );
};

const createNotImplementedHandler = <Input, Output>(
        toolName: string,
): MemoryToolHandler<Input, Output> => {
        return () =>
                Promise.resolve(
                        createMemoryToolErrorResponse(
                                'NOT_IMPLEMENTED',
                                `${toolName} handler not implemented yet.`,
                        ),
                );
};

const createMemoryToolDefinition = <Input, Output>(config: {
        name: `memories.${string}`;
        description: string;
        inputSchema: z.ZodType<Input>;
        outputSchema: z.ZodType<Output>;
        docs: MemoryToolDocumentation<Input, Output>;
        handler: MemoryToolHandler<Input, Output>;
}): MemoryToolDefinition<Input, Output> => {
        const invoke = async (
                rawInput: unknown,
                context: MemoryToolContext = {},
        ): Promise<MemoryToolResponse<Output>> => {
                const parsed = config.inputSchema.safeParse(rawInput);
                if (!parsed.success) {
                        return createMemoryToolErrorResponse(
                                'INVALID_INPUT',
                                'Payload failed validation for the requested tool.',
                                formatZodIssues(parsed.error),
                        );
                }
                try {
                        return await config.handler(parsed.data, context);
                } catch (error) {
                        if (
                                typeof error === 'object' &&
                                error !== null &&
                                isMemoryToolErrorResponse(error)
                        ) {
                                return error as MemoryToolErrorResponse;
                        }
                        const message =
                                error instanceof Error
                                        ? error.message
                                        : 'Unexpected error while executing the tool.';
                        const details =
                                error instanceof Error
                                        ? { name: error.name, stack: error.stack }
                                        : { cause: error };
                        return createMemoryToolErrorResponse('INTERNAL_ERROR', message, details);
                }
        };

        return {
                name: config.name,
                description: config.description,
                inputSchema: config.inputSchema,
                outputSchema: config.outputSchema,
                errors: defaultCatalog,
                docs: config.docs,
                invoke,
        };
};

const exampleMemory: MemoryStoreInput = {
        id: 'mem-123',
        kind: 'note',
        namespace: 'default',
        text: 'Remember to hydrate after long debugging sessions.',
        tags: ['health', 'productivity'],
        provenance: { source: 'agent', actor: 'coach-bot' },
        createdAt: EXAMPLE_TIMESTAMP,
        updatedAt: EXAMPLE_TIMESTAMP,
};

export const memoryStoreTool = createMemoryToolDefinition({
        name: 'memories.store',
        description: 'Persist or update a memory record within the configured memory store.',
        inputSchema: memoryStoreInputSchema,
        outputSchema: memoryStoreOutputSchema,
        docs: {
                summary: 'Stores a fully described memory record. Either `text` or `vector` must be provided.',
                inputExample: exampleMemory,
                outputExample: {
                        status: 'pending',
                        memory: {
                                ...exampleMemory,
                                policy: undefined,
                                embeddingModel: undefined,
                        },
                },
                errors: ['INVALID_INPUT', 'NOT_IMPLEMENTED', 'STORAGE_FAILURE'],
        },
        handler: createNotImplementedHandler('memories.store'),
});

export const memoryGetTool = createMemoryToolDefinition({
        name: 'memories.get',
        description: 'Retrieve a memory record by identifier.',
        inputSchema: memoryGetInputSchema,
        outputSchema: memoryGetOutputSchema,
        docs: {
                summary: 'Returns a single memory record when it exists in the requested namespace.',
                inputExample: { id: 'mem-123', namespace: 'default', includePending: false },
                outputExample: { memory: null },
                errors: ['INVALID_INPUT', 'NOT_FOUND'],
        },
        handler: createNotImplementedHandler('memories.get'),
});

export const memoryDeleteTool = createMemoryToolDefinition({
        name: 'memories.delete',
        description: 'Delete a memory record from the configured namespace.',
        inputSchema: memoryDeleteInputSchema,
        outputSchema: memoryDeleteOutputSchema,
        docs: {
                summary: 'Removes a memory record. Hard delete may bypass soft-delete workflows.',
                inputExample: { id: 'mem-123', namespace: 'default', hardDelete: false },
                outputExample: {
                        id: 'mem-123',
                        deleted: true,
                        performedAt: EXAMPLE_TIMESTAMP,
                },
                errors: ['INVALID_INPUT', 'NOT_FOUND'],
        },
        handler: createNotImplementedHandler('memories.delete'),
});

export const memoryListTool = createMemoryToolDefinition({
        name: 'memories.list',
        description: 'List memory records with optional pagination and filtering.',
        inputSchema: memoryListInputSchema,
        outputSchema: memoryListOutputSchema,
        docs: {
                summary: 'Provides a paginated listing of memory records scoped to a namespace.',
                inputExample: { namespace: 'default', limit: 25, cursor: undefined, kinds: undefined, tags: undefined },
                outputExample: { items: [], nextCursor: undefined },
                errors: ['INVALID_INPUT'],
        },
        handler: createNotImplementedHandler('memories.list'),
});

export const memorySearchTool = createMemoryToolDefinition({
        name: 'memories.search',
        description: 'Search memories using semantic text or vector queries.',
        inputSchema: memorySearchInputSchema,
        outputSchema: memorySearchOutputSchema,
        docs: {
                summary: 'Executes a semantic search across stored memories using text and/or vector input.',
                inputExample: { query: 'project launch checklist', limit: 5, namespace: 'default', vector: undefined, kinds: undefined, tags: undefined },
                outputExample: { items: [], tookMs: undefined },
                errors: ['INVALID_INPUT'],
        },
        handler: createNotImplementedHandler('memories.search'),
});

export const memoryMcpTools: MemoryToolDefinition<unknown, unknown>[] = [
        memoryStoreTool,

        memoryGetTool,
        memoryDeleteTool,
        memoryListTool,
        memorySearchTool,
];

