import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
        MAX_MEMORY_TEXT_LENGTH,
        memoryRetrieveTool,
        memoryStoreTool,
        memoryUpdateTool,
} from '../src/mcp/tools.js';

type ToolResponse = Awaited<ReturnType<typeof memoryStoreTool.handler>>;

type ToolPayload =
        | {
                  success: true;
                  correlationId: string;
                  data: Record<string, unknown>;
          }
        | {
                  success: false;
                  correlationId: string;
                  error: {
                          code: string;
                          message: string;
                          details: string[];
                  };
          };

function isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null;
}

function assertRecord(value: unknown, message: string): Record<string, unknown> {
        if (!isRecord(value)) {
                throw new Error(message);
        }
        return value;
}

function assertString(value: unknown, message: string): string {
        if (typeof value !== 'string') {
                throw new Error(message);
        }
        return value;
}

function assertStringArray(value: unknown, message: string): string[] {
        if (!Array.isArray(value)) {
                throw new Error(message);
        }
        return value.map((item) => assertString(item, message));
}

function parsePayload(response: ToolResponse): ToolPayload {
        const [first] = response.content ?? [];
        if (!first) {
                throw new Error('Tool payload must include content');
        }

        let raw: unknown = null;
        if (first.text) {
                try {
                        raw = JSON.parse(first.text);
                } catch (err) {
                        throw new Error(`Tool payload could not be parsed as JSON: ${(err as Error).message}`);
                }
        }
        const base = assertRecord(raw, 'Tool payload must be a JSON object');
        const successValue = base.success;
        if (typeof successValue !== 'boolean') {
                throw new Error('Tool payload success flag must be boolean');
        }
        const correlationId = assertString(base.correlationId, 'Tool payload correlationId missing');

        if (successValue) {
                const data = assertRecord(base.data, 'Tool payload data missing for successful response');
                return {
                        success: true,
                        correlationId,
                        data,
                };
        }

        const errorRecord = assertRecord(base.error, 'Tool payload error missing for failure response');
        const code = assertString(errorRecord.code, 'Tool payload error code missing');
        const message = assertString(errorRecord.message, 'Tool payload error message missing');
        const details = assertStringArray(
                errorRecord.details,
                'Tool payload error details must be string[]',
        );

        return {
                success: false,
                correlationId,
                error: { code, message, details },
        };
}

function expectFailure(payload: ToolPayload): Extract<ToolPayload, { success: false }> {
        if (payload.success) {
                throw new Error('Expected tool payload to be a failure');
        }
        return payload;
}

function expectSuccess(payload: ToolPayload): Extract<ToolPayload, { success: true }> {
        if (!payload.success) {
                throw new Error('Expected tool payload to be successful');
        }
        return payload;
}

describe('memories MCP tools validation and error handling', () => {
        let errorSpy: ReturnType<typeof vi.spyOn>;
        let debugSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
                errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
                debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        });

        afterEach(() => {
                errorSpy.mockRestore();
                debugSpy.mockRestore();
        });

        it('rejects memory_store requests when text exceeds configured length', async () => {
                const response = await memoryStoreTool.handler({
                        kind: 'note',
                        text: 'a'.repeat(MAX_MEMORY_TEXT_LENGTH + 1),
                        tags: [],
                });

                expect(response.isError).toBe(true);
                expect(response.metadata?.tool).toBe('memory_store');

                const payload = expectFailure(parsePayload(response));
                expect(payload.error.code).toBe('validation_error');
                expect(
                        payload.error.details.some((detail) =>
                                detail.toLowerCase().includes('text') &&
                                detail.toLowerCase().includes('length'),
                        ),
                ).toBe(true);
                expect(payload.correlationId).toBe(response.metadata?.correlationId);
                expect(errorSpy).toHaveBeenCalled();
        });

        it('rejects metadata containing unsafe keys for memory_store', async () => {
                const response = await memoryStoreTool.handler({
                        kind: 'note',
                        text: 'safe text',
                        metadata: { __proto__: { polluted: true } },
                });

                expect(response.isError).toBe(true);
                const payload = expectFailure(parsePayload(response));
                expect(payload.error.code).toBe('security_error');
                expect(payload.error.message).toMatch(/unsafe metadata/i);
                expect(errorSpy).toHaveBeenCalledWith(
                        expect.stringContaining('memory_store'),
                        expect.objectContaining({ correlationId: payload.correlationId }),
                );
        });

        it('requires at least one update field for memory_update', async () => {
                const response = await memoryUpdateTool.handler({ id: 'mem-safe' });

                expect(response.isError).toBe(true);
                const payload = expectFailure(parsePayload(response));
                expect(payload.error.code).toBe('validation_error');
                expect(payload.error.message).toMatch(/at least one/i);
        });

        it('sanitizes tags on successful memory_store execution', async () => {
                const response = await memoryStoreTool.handler({
                        kind: 'note',
                        text: 'hello world',
                        tags: ['  spaced ', 'duplicate', 'duplicate'],
                });

                expect(response.isError).toBeFalsy();
                expect(response.metadata?.tool).toBe('memory_store');
                const payload = expectSuccess(parsePayload(response));
                const tags = assertStringArray(
                        payload.data.tags,
                        'Tool payload tags must be a list of strings',
                );
                expect(tags).toEqual(['spaced', 'duplicate']);
                expect(debugSpy).toHaveBeenCalledWith(
                        expect.stringContaining('memory_store'),
                        expect.objectContaining({ correlationId: response.metadata?.correlationId }),
                );
        });

        it('returns validation error for memory_retrieve when limit is less than 1', async () => {
                const response = await memoryRetrieveTool.handler({
                        query: 'notes',
                        limit: 0,
                });

                expect(response.isError).toBe(true);
                const payload = expectFailure(parsePayload(response));
                expect(payload.error.code).toBe('validation_error');
                expect(
                        payload.error.details.some((detail) =>
                                detail.toLowerCase().includes('limit'),
                        ),
                ).toBe(true);
        });
});
