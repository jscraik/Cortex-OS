import { describe, expect, it } from 'vitest';

import {
        ragDocumentIngestionTool,
        ragRetrievalTool,
        ragSearchTool,
        ragToolContracts,
} from '../tools.js';

const sampleDocument = {
        id: 'doc-1',
        content: 'Sample document body for ingestion.',
};

describe('RAG MCP tool contracts', () => {
        it('exposes ingestion, search, and retrieval tool definitions', () => {
                const names = ragToolContracts.map((tool) => tool.name);

                expect(names).toContain('rag.document.ingest');
                expect(names).toContain('rag.search');
                expect(names).toContain('rag.retrieve');
        });

        it('requires at least one document when ingesting', () => {
                const result = ragDocumentIngestionTool.inputSchema.safeParse({ documents: [] });

                expect(result.success).toBe(false);
                if (!result.success) {
                        const messages = result.error.issues.map((issue) => issue.message);
                        expect(messages.some((msg) => msg.toLowerCase().includes('at least one document'))).toBe(true);
                }
        });

        it('applies default ingestion options', () => {
                const parsed = ragDocumentIngestionTool.inputSchema.parse({
                        documents: [sampleDocument],
                });

                expect(parsed.options.mode).toBe('upsert');
                expect(parsed.options.deduplicate).toBe(true);
                expect(parsed.options.chunking.maxChars).toBeGreaterThan(0);
                expect(parsed.options.chunking.overlap).toBeGreaterThanOrEqual(0);
        });

        it('enforces non-empty search queries and default settings', () => {
                const failure = ragSearchTool.inputSchema.safeParse({ query: '' });
                expect(failure.success).toBe(false);

                const parsed = ragSearchTool.inputSchema.parse({ query: 'what is cortex rag?' });
                expect(parsed.topK).toBeGreaterThan(0);
                expect(parsed.mode).toBe('hybrid');
                expect(parsed.includeMetadata).toBe(true);
        });

        it('limits search result size to prevent runaway requests', () => {
                const result = ragSearchTool.inputSchema.safeParse({ query: 'a', topK: 500 });
                expect(result.success).toBe(false);
        });

        it('requires document identifiers for retrieval requests', () => {
                const failure = ragRetrievalTool.inputSchema.safeParse({ documentIds: [] });
                expect(failure.success).toBe(false);
                if (!failure.success) {
                        expect(
                                failure.error.issues.some((issue) =>
                                        issue.message.toLowerCase().includes('at least one document id'),
                                ),
                        ).toBe(true);
                }
        });

        it('defaults retrieval options for content and metadata inclusion', () => {
                const parsed = ragRetrievalTool.inputSchema.parse({
                        documentIds: ['doc-1'],
                });

                expect(parsed.includeContent).toBe(true);
                expect(parsed.includeMetadata).toBe(true);
                expect(parsed.includeChunks).toBe(false);
        });
});
