/**
 * Contract-first MCP tool definitions for Retrieval Augmented Generation (RAG).
 *
 * These contracts intentionally focus on schemas, metadata, and error surfaces
 * so subsequent implementation work can plug in concrete handlers while
 * preserving a stable Model Context Protocol interface.
 */

import { z, type ZodTypeAny, ZodIssueCode } from 'zod';

type RagToolHandler<I, O> = (input: I) => Promise<O>;

export interface RagToolContract<I extends ZodTypeAny, O extends ZodTypeAny> {
        name: `rag.${string}`;
        description: string;
        inputSchema: I;
        outputSchema: O;
        errors: Array<{
                code: 'validation_error' | 'not_found' | 'quota_exceeded' | 'internal_error';
                description: string;
        }>;
        handler: RagToolHandler<z.infer<I>, z.infer<O>>;
}

const notImplemented = <I, O>(name: string): RagToolHandler<I, O> => {
        return async (_input: I) => {
                throw new Error(`${name} handler not implemented`);
        };
};

const DOCUMENT_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const METADATA_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_METADATA_KEYS = 64;

const metadataPrimitiveSchema = z.union([
        z.string().max(1024),
        z.number(),
        z.boolean(),
        z.null(),
]);

const metadataArraySchema = z.array(metadataPrimitiveSchema).max(20);

export const RagMetadataSchema = z
        .record(z.union([metadataPrimitiveSchema, metadataArraySchema]))
        .superRefine((metadata, ctx) => {
                const keys = Object.keys(metadata);
                if (keys.length > MAX_METADATA_KEYS) {
                        ctx.addIssue({
                                code: ZodIssueCode.custom,
                                message: `Metadata supports a maximum of ${MAX_METADATA_KEYS} keys`,
                        });
                }
                for (const key of keys) {
                        if (!METADATA_KEY_PATTERN.test(key)) {
                                ctx.addIssue({
                                        code: ZodIssueCode.custom,
                                        message:
                                                'Metadata keys must use alphanumeric characters plus . _ - and be at most 64 characters',
                                        path: [key],
                                });
                        }
                }
        });

export const RagDocumentSchema = z.object({
        id: z
                .string()
                .min(3, 'Document id must be at least 3 characters long')
                .max(256, 'Document id cannot exceed 256 characters')
                .regex(
                        DOCUMENT_ID_PATTERN,
                        'Document id may only include letters, numbers, period, underscore, colon, or dash',
                ),
        content: z
                .string()
                .trim()
                .min(1, 'Document content cannot be empty')
                .max(200_000, 'Document content exceeds maximum length of 200k characters'),
        source: z.string().trim().max(1024).optional(),
        mimeType: z.string().trim().max(128).optional(),
        metadata: RagMetadataSchema.optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
        embedding: z.array(z.number()).min(1).max(4096).optional(),
});

const RagChunkingOptionsSchema = z.object({
        maxChars: z
                .number()
                .int()
                .min(128, 'Chunk size must be at least 128 characters')
                .max(16_384, 'Chunk size cannot exceed 16,384 characters')
                .default(2_000),
        overlap: z
                .number()
                .int()
                .min(0, 'Chunk overlap cannot be negative')
                .max(8_000, 'Chunk overlap cannot exceed 8,000 characters')
                .default(200),
});

export const RagDocumentIngestionOptionsSchema = z.object({
        mode: z.enum(['upsert', 'append', 'replace']).default('upsert'),
        deduplicate: z.boolean().default(true),
        chunking: RagChunkingOptionsSchema.default({ maxChars: 2_000, overlap: 200 }),
        disableEmbeddings: z.boolean().default(false),
});

export const RagDocumentIngestionInputSchema = z.object({
        documents: z
                .array(RagDocumentSchema)
                .min(1, 'At least one document must be provided for ingestion')
                .max(500, 'Batch ingestion limited to 500 documents'),
        options: RagDocumentIngestionOptionsSchema.default({
                mode: 'upsert',
                deduplicate: true,
                chunking: { maxChars: 2_000, overlap: 200 },
                disableEmbeddings: false,
        }),
});

export const RagDocumentIngestionOutputSchema = z.object({
        ingested: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        warnings: z.array(z.string()).default([]),
        correlationId: z.string(),
        durationMs: z.number().int().nonnegative().optional(),
});

const RagSearchModeSchema = z.enum(['hybrid', 'semantic', 'keyword']);

export const RagSearchInputSchema = z.object({
        query: z
                .string()
                .trim()
                .min(1, 'Search query must include text')
                .max(2_000, 'Search query cannot exceed 2,000 characters'),
        topK: z
                .number()
                .int()
                .min(1, 'topK must be at least 1')
                .max(50, 'topK cannot exceed 50')
                .default(10),
        mode: RagSearchModeSchema.default('hybrid'),
        filters: RagMetadataSchema.optional(),
        vector: z.array(z.number()).min(1).max(4_096).optional(),
        scoreThreshold: z.number().min(0).max(1).default(0),
        includeMetadata: z.boolean().default(true),
        includeCitations: z.boolean().default(true),
        includeChunks: z.boolean().default(false),
});

export const RagSearchResultSchema = z.object({
        id: z.string(),
        documentId: z.string().optional(),
        chunkId: z.string().optional(),
        score: z.number().min(0),
        snippet: z.string(),
        source: z.string().optional(),
        metadata: RagMetadataSchema.optional(),
});

export const RagSearchOutputSchema = z.object({
        query: z.string(),
        mode: RagSearchModeSchema,
        results: z.array(RagSearchResultSchema),
        hasMore: z.boolean().default(false),
});

export const RagRetrievalInputSchema = z.object({
        documentIds: z
                .array(
                        z
                                .string()
                                .min(1, 'Document id cannot be empty')
                                .max(256, 'Document id cannot exceed 256 characters')
                                .regex(
                                        DOCUMENT_ID_PATTERN,
                                        'Document id may only include letters, numbers, period, underscore, colon, or dash',
                                ),
                )
                .min(1, 'At least one document id must be provided for retrieval')
                .max(100, 'Retrieval limited to 100 document ids per request'),
        includeContent: z.boolean().default(true),
        includeMetadata: z.boolean().default(true),
        includeChunks: z.boolean().default(false),
        chunkLimit: z.number().int().min(1).max(100).default(20),
});

export const RagRetrievedChunkSchema = z.object({
        id: z.string(),
        text: z.string(),
        score: z.number().optional(),
        metadata: RagMetadataSchema.optional(),
});

export const RagRetrievedDocumentSchema = z.object({
        id: z.string(),
        content: z.string().optional(),
        metadata: RagMetadataSchema.optional(),
        chunks: z.array(RagRetrievedChunkSchema).optional(),
});

export const RagRetrievalOutputSchema = z.object({
        documents: z.array(RagRetrievedDocumentSchema),
        correlationId: z.string(),
        warnings: z.array(z.string()).default([]),
});

export type RagDocument = z.infer<typeof RagDocumentSchema>;
export type RagDocumentIngestionInput = z.infer<typeof RagDocumentIngestionInputSchema>;
export type RagDocumentIngestionOutput = z.infer<typeof RagDocumentIngestionOutputSchema>;
export type RagSearchInput = z.infer<typeof RagSearchInputSchema>;
export type RagSearchOutput = z.infer<typeof RagSearchOutputSchema>;
export type RagRetrievalInput = z.infer<typeof RagRetrievalInputSchema>;
export type RagRetrievalOutput = z.infer<typeof RagRetrievalOutputSchema>;

export const ragDocumentIngestionTool: RagToolContract<
        typeof RagDocumentIngestionInputSchema,
        typeof RagDocumentIngestionOutputSchema
> = {
        name: 'rag.document.ingest',
        description: 'Ingest batched documents into the Cortex RAG knowledge base.',
        inputSchema: RagDocumentIngestionInputSchema,
        outputSchema: RagDocumentIngestionOutputSchema,
        errors: [
                {
                        code: 'validation_error',
                        description: 'Input payload failed schema validation.',
                },
                {
                        code: 'quota_exceeded',
                        description: 'Ingestion would exceed configured storage limits.',
                },
                {
                        code: 'internal_error',
                        description: 'Unexpected failure while persisting documents.',
                },
        ],
        handler: notImplemented('rag.document.ingest'),
};

export const ragSearchTool: RagToolContract<
        typeof RagSearchInputSchema,
        typeof RagSearchOutputSchema
> = {
        name: 'rag.search',
        description: 'Execute semantic or hybrid searches against the Cortex knowledge base.',
        inputSchema: RagSearchInputSchema,
        outputSchema: RagSearchOutputSchema,
        errors: [
                {
                        code: 'validation_error',
                        description: 'Search query or filters were invalid.',
                },
                {
                        code: 'not_found',
                        description: 'No documents matched the provided identifiers or filters.',
                },
                {
                        code: 'internal_error',
                        description: 'Unexpected error while executing search.',
                },
        ],
        handler: notImplemented('rag.search'),
};

export const ragRetrievalTool: RagToolContract<
        typeof RagRetrievalInputSchema,
        typeof RagRetrievalOutputSchema
> = {
        name: 'rag.retrieve',
        description: 'Retrieve canonical documents and optional chunk evidence by identifier.',
        inputSchema: RagRetrievalInputSchema,
        outputSchema: RagRetrievalOutputSchema,
        errors: [
                {
                        code: 'validation_error',
                        description: 'Retrieval request contained invalid document identifiers.',
                },
                {
                        code: 'not_found',
                        description: 'One or more requested documents could not be found.',
                },
                {
                        code: 'internal_error',
                        description: 'Unexpected error while assembling retrieval response.',
                },
        ],
        handler: notImplemented('rag.retrieve'),
};

export const ragToolContracts = [
        ragDocumentIngestionTool,
        ragSearchTool,
        ragRetrievalTool,
] as const;
