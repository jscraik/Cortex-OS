import { performance } from 'node:perf_hooks';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
        assertToolCall,
        setupMockServer,
        type MockServerFixture,
} from '../../../mcp-core/src/testing/mockServer.js';
import {
        MAX_MEMORY_TEXT_LENGTH,
        memoryMcpTools,
} from '../../src/mcp/tools.js';

type MemoryToolHandler = (typeof memoryMcpTools)[number]['handler'];
type MemoryToolResponse = Awaited<ReturnType<MemoryToolHandler>>;

type SuccessEnvelope = {
        readonly success: true;
        readonly tool: string;
        readonly correlationId: string;
        readonly timestamp: string;
        readonly data: Record<string, unknown>;
};

type FailureEnvelope = {
        readonly success: false;
        readonly tool: string;
        readonly correlationId: string;
        readonly timestamp: string;
        readonly error: {
                readonly code: string;
                readonly message: string;
                readonly details: string[];
        };
};

const RESPONSE_PARSE_ERROR = 'MCP tool response must include a text content payload';

import {
        isRecord,
        assertRecord,
        assertString,
        assertStringArray,
        assertNumber,
} from '../../../mcp-core/src/testing/assertions.js';
function parseEnvelope(result: unknown): SuccessEnvelope | FailureEnvelope {
        const response = assertRecord(result, 'MCP tool response must be an object');
        const metadata = assertRecord(response.metadata, 'MCP tool metadata missing');
        const tool = assertString(metadata.tool, 'MCP tool metadata requires a tool name');
        const correlationId = assertString(metadata.correlationId, 'MCP tool metadata requires correlationId');
        const timestamp = assertString(metadata.timestamp, 'MCP tool metadata requires timestamp');

        const blocks = Array.isArray(response.content) ? response.content : [];
        if (blocks.length === 0) {
                throw new Error(RESPONSE_PARSE_ERROR);
        }
        const first = blocks[0];
        if (!isRecord(first)) {
                throw new Error(RESPONSE_PARSE_ERROR);
        }

        const text = first.text;
        if (typeof text !== 'string') {
                throw new Error(RESPONSE_PARSE_ERROR);
        }

        let parsedPayload: unknown;
        try {
                parsedPayload = JSON.parse(text);
        } catch (error) {
                throw new Error(`Unable to parse MCP tool response payload: ${(error as Error).message}`);
        }

        const payload = assertRecord(parsedPayload, 'MCP tool payload must be a JSON object');
        const payloadSuccess = payload.success;
        if (typeof payloadSuccess !== 'boolean') {
                throw new Error('MCP tool payload must include a boolean success flag');
        }

        const payloadCorrelationId = assertString(
                payload.correlationId,
                'MCP tool payload must include correlationId',
        );
        const payloadTimestamp = assertString(payload.timestamp, 'MCP tool payload must include timestamp');

        if (payloadCorrelationId !== correlationId) {
                throw new Error('MCP tool payload correlationId does not match metadata');
        }
        if (payloadTimestamp !== timestamp) {
                throw new Error('MCP tool payload timestamp does not match metadata');
        }

        const isErrorResponse = Boolean(response.isError);

        if (payloadSuccess) {
                if (isErrorResponse) {
                        throw new Error('MCP tool response marked as error despite success payload');
                }
                const data = assertRecord(payload.data, 'MCP tool payload must include data for success responses');
                return {
                        success: true,
                        tool,
                        correlationId,
                        timestamp,
                        data,
                };
        }

        if (!isErrorResponse) {
                throw new Error('MCP tool response missing isError flag for failure payload');
        }

        const errorRecord = assertRecord(payload.error, 'MCP tool payload must include error details when unsuccessful');
        const code = assertString(errorRecord.code, 'MCP tool error payload must include code');
        const message = assertString(errorRecord.message, 'MCP tool error payload must include message');
        const details = 'details' in errorRecord && errorRecord.details !== undefined
                ? assertStringArray(errorRecord.details, 'MCP tool error details must be string[]')
                : [];

        return {
                success: false,
                tool,
                correlationId,
                timestamp,
                error: { code, message, details },
        };
}

function expectSuccess(result: unknown): SuccessEnvelope {
        const envelope = parseEnvelope(result);
        if (!envelope.success) {
                throw new Error('Expected MCP tool response to indicate success');
        }
        return envelope;
}

function expectFailure(result: unknown): FailureEnvelope {
        const envelope = parseEnvelope(result);
        if (envelope.success) {
                throw new Error('Expected MCP tool response to indicate failure');
        }
        return envelope;
}

describe('memories MCP integration', () => {
        let fixture!: MockServerFixture;

        beforeAll(async () => {
                fixture = await setupMockServer();
                for (const tool of memoryMcpTools) {
                        fixture.server.registerTool(tool.name, async (args): Promise<MemoryToolResponse> => {
                                return await tool.handler(args);
                        });
                }
                await fixture.client.ping();
        });

        afterAll(async () => {
                await fixture.teardown();
        });

        afterEach(() => {
                fixture.server.clearCalls();
        });

        it('executes memory_store via MCP client and sanitizes sensitive output', async () => {
                const piiText = 'Reach me at agent@example.com or 123 Main St tomorrow.';
                const response = await fixture.client.callTool('memory_store', {
                        kind: 'note',
                        text: piiText,
                        tags: [' primary ', 'primary', 'ops'],
                });

                const envelope = expectSuccess(response);
                expect(envelope.tool).toBe('memory_store');
                const tags = assertStringArray(
                        envelope.data.tags,
                        'Successful memory_store response must include string[] tags',
                );
                expect(tags).toEqual(['primary', 'ops']);
                const preview = assertString(
                        envelope.data.redactedPreview,
                        'Successful memory_store response must include a redacted preview',
                );
                expect(preview).toContain('[REDACTED]');
                expect(preview).not.toContain('agent@example.com');

                const [call] = assertToolCall(fixture.server, 'memory_store', 1);
                expect(call.args).toMatchObject({
                        kind: 'note',
                        text: piiText,
                });
        });

        it('completes maximum length memory_store payload within performance budget', async () => {
                const maxPayload = 'a'.repeat(MAX_MEMORY_TEXT_LENGTH);
                const startedAt = performance.now();
                const response = await fixture.client.callTool('memory_store', {
                        kind: 'note',
                        text: maxPayload,
                });
                const durationMs = performance.now() - startedAt;

                const envelope = expectSuccess(response);
                expect(durationMs).toBeLessThan(500);
                expect(assertNumber(envelope.data.textLength, 'Successful memory_store response must report textLength')).toBe(
                        MAX_MEMORY_TEXT_LENGTH,
                );
                // Timestamp should reflect recent execution, ensuring observability for latency tracking.
                expect(new Date(envelope.timestamp).getTime()).toBeGreaterThan(Date.now() - 2_000);
        });

        it('surfaces validation errors for invalid memory_retrieve requests', async () => {
                const response = await fixture.client.callTool('memory_retrieve', {
                        query: 'recent notes',
                        limit: 0,
                });

                const envelope = expectFailure(response);
                expect(envelope.tool).toBe('memory_retrieve');
                expect(envelope.error.code).toBe('validation_error');
                expect(envelope.error.details.some((detail) => detail.includes('limit'))).toBe(true);

                assertToolCall(fixture.server, 'memory_retrieve', 1);
        });

        it('enforces metadata security guards when invoked over MCP', async () => {
                const response = await fixture.client.callTool('memory_store', {
                        kind: 'note',
                        text: 'safe entry',
                        metadata: { constructor: { prototype: { polluted: true } } },
                });

                const envelope = expectFailure(response);
                expect(envelope.tool).toBe('memory_store');
                expect(envelope.error.code).toBe('security_error');
                expect(envelope.error.message.toLowerCase()).toContain('unsafe');

                assertToolCall(fixture.server, 'memory_store', 1);
        });
});
