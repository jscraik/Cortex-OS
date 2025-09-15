import { describe, expect, it } from 'vitest';

import {
        memoryDeleteTool,
        memoryGetTool,
        memoryListTool,
        memoryMcpTools,
        memorySearchTool,
        memoryStoreTool,
} from '../../src/mcp/tools.js';


const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
        typeof value === 'object' && value !== null;

const isRecordArray = (value: unknown): value is Array<Record<PropertyKey, unknown>> =>
        Array.isArray(value) && value.every(isRecord);

const expectIssueForPath = (details: unknown, expectedPath: string[]) => {
        if (!isRecord(details)) {
                throw new Error('Expected structured validation issues');
        }
        const issues = details.issues;
        if (!isRecordArray(issues)) {
                throw new Error('Expected issues array');
        }
        const matchFound = issues.some((issue) => {
                const path = issue.path;
                return Array.isArray(path) &&
                        path.length === expectedPath.length &&
                        path.every((segment, i) => segment === expectedPath[i]);
        });
        expect(matchFound).toBe(true);
};

const baseContext = Object.freeze({});

describe('Memory MCP tool definitions', () => {
        it('validates store input using schema before invoking handler', async () => {
                const validInput = {
                        id: 'mem-1',
                        kind: 'note',
                        text: 'hello world',
                        tags: ['demo'],
                        namespace: 'default',
                        provenance: { source: 'agent', actor: 'tester' },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                };

                const result = await memoryStoreTool.invoke(validInput, baseContext);
                if (result.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(result.error.code).toBe('NOT_IMPLEMENTED');
                expect(result.error.message).toContain('memories.store');
        });

        it('returns INVALID_INPUT error with details for malformed payloads', async () => {
                const response = await memoryStoreTool.invoke({ text: 42 } as unknown, baseContext);

                if (response.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(response.error.code).toBe('INVALID_INPUT');
                expectIssueForPath(response.error.details, ['kind']);
        });

        it('provides consistent error responses across tools', async () => {
                const response = await memoryGetTool.invoke({} as unknown, baseContext);

                if (response.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(response.error).toMatchObject({
                        code: 'INVALID_INPUT',
                        httpStatus: 400,
                        retryable: false,
                });
        });

        it('exposes documented operations in the aggregated tool list', () => {
                const toolNames = memoryMcpTools.map((tool) => tool.name).sort();
                expect(toolNames).toEqual([
                        'memories.delete',
                        'memories.get',
                        'memories.list',
                        'memories.search',
                        'memories.store',
                ]);
        });

        it('validates search filters and limits', async () => {
                const response = await memorySearchTool.invoke(
                        { query: 'hello', limit: 200 },
                        baseContext,
                );
                if (response.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(response.error.code).toBe('INVALID_INPUT');
                expectIssueForPath(response.error.details, ['limit']);
        });

        it('list tool requires namespace when cursor is provided', async () => {
                const response = await memoryListTool.invoke(
                        { cursor: 'abc123' },
                        baseContext,
                );
                if (response.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(response.error.code).toBe('INVALID_INPUT');
                expectIssueForPath(response.error.details, ['namespace']);
        });

        it('delete tool enforces identifier format', async () => {
                const response = await memoryDeleteTool.invoke(
                        { id: ' ' },
                        baseContext,
                );
                if (response.type !== 'error') {
                        throw new Error('Expected error response');
                }
                expect(response.error.code).toBe('INVALID_INPUT');
        });
});
