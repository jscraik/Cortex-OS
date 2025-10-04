import { beforeEach, describe, expect, it, vi } from 'vitest';
const loggerSpies = vi.hoisted(() => {
    const debug = vi.fn();
    const warn = vi.fn();
    const error = vi.fn();
    return {
        debug,
        warn,
        error,
    };
});
vi.mock('../src/logging/index.js', () => ({
    createLogger: () => ({
        debug: loggerSpies.debug,
        info: vi.fn(),
        warn: loggerSpies.warn,
        error: loggerSpies.error,
    }),
}));
import { createObservabilityErrorResponse, ObservabilityToolError, validateObservabilityToolInput, } from '../src/mcp/tools.js';
describe('observability MCP tools validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('validates and sanitizes create_trace input', () => {
        const result = validateObservabilityToolInput('create_trace', {
            traceId: '0123456789abcdef0123456789abcdef',
            operationName: ' fetch-users ',
            tags: {
                ' env ': ' production ',
                component: ' api ',
            },
            startTime: '2024-01-01T00:00:00Z',
        });
        expect(result).toEqual({
            traceId: '0123456789abcdef0123456789abcdef',
            operationName: 'fetch-users',
            tags: {
                env: 'production',
                component: 'api',
            },
            startTime: '2024-01-01T00:00:00.000Z',
        });
        expect(loggerSpies.debug).toHaveBeenCalledWith(expect.objectContaining({ tool: 'create_trace' }), 'validated observability tool input');
    });
    it('throws ObservabilityToolError for invalid trace ID', () => {
        expect(() => validateObservabilityToolInput('create_trace', {
            traceId: 'bad',
            operationName: 'fetch-users',
        })).toThrowError(ObservabilityToolError);
        const error = (() => {
            try {
                validateObservabilityToolInput('create_trace', {
                    traceId: 'bad',
                    operationName: 'fetch-users',
                });
            }
            catch (err) {
                return err;
            }
            throw new Error('Expected validation to throw');
        })();
        expect(error.code).toBe('validation_error');
        expect(error.details).toEqual(expect.arrayContaining([expect.stringContaining('traceId')]));
        expect(loggerSpies.warn).toHaveBeenCalledWith(expect.objectContaining({ tool: 'create_trace' }), 'create_trace validation failed');
    });
    it('rejects unsafe tag keys', () => {
        const maliciousTags = Object.create({ polluted: 'yes' });
        maliciousTags.env = 'prod';
        expect(() => validateObservabilityToolInput('record_metric', {
            name: 'latency',
            value: 1.23,
            tags: maliciousTags,
        })).toThrowError(ObservabilityToolError);
        const error = (() => {
            try {
                validateObservabilityToolInput('record_metric', {
                    name: 'latency',
                    value: 1.23,
                    tags: maliciousTags,
                });
            }
            catch (err) {
                return err;
            }
            throw new Error('Expected validation to throw');
        })();
        expect(error.code).toBe('security_error');
        expect(loggerSpies.warn).toHaveBeenCalledWith(expect.objectContaining({ tool: 'record_metric' }), 'record_metric validation failed');
    });
    it('rejects time ranges where start is after end', () => {
        expect(() => validateObservabilityToolInput('query_traces', {
            startTime: '2024-05-02T00:00:00Z',
            endTime: '2024-05-01T00:00:00Z',
        })).toThrowError(ObservabilityToolError);
        const error = (() => {
            try {
                validateObservabilityToolInput('query_traces', {
                    startTime: '2024-05-02T00:00:00Z',
                    endTime: '2024-05-01T00:00:00Z',
                });
            }
            catch (err) {
                return err;
            }
            throw new Error('Expected validation to throw');
        })();
        expect(error.code).toBe('validation_error');
        expect(error.message).toContain('startTime');
    });
    it('creates structured error responses and logs validation issues', () => {
        const err = new ObservabilityToolError('validation_error', 'bad input', ['traceId: required']);
        const response = createObservabilityErrorResponse('get_metrics', err, 'corr-test');
        expect(response.isError).toBe(true);
        expect(response.metadata).toMatchObject({
            tool: 'get_metrics',
            correlationId: 'corr-test',
        });
        const payload = JSON.parse(response.content[0].text);
        expect(payload).toMatchObject({
            success: false,
            error: {
                code: 'validation_error',
                message: 'bad input',
                details: ['traceId: required'],
            },
            correlationId: 'corr-test',
        });
        expect(typeof payload.timestamp).toBe('string');
        expect(loggerSpies.warn).toHaveBeenCalledWith(expect.objectContaining({
            tool: 'get_metrics',
            correlationId: 'corr-test',
        }), 'get_metrics validation failed');
    });
});
//# sourceMappingURL=mcp.tools.test.js.map