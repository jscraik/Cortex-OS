import {
    pipelineRunCompletedEventDataSchema,
    TOOLING_EVENT_TYPES,
    toolRunCompletedEventDataSchema,
    validateToolingEvent,
} from '@cortex-os/contracts';
import { describe, expect, it } from 'vitest';

describe('contract: tool.run.completed', () => {
    it('validates minimal success payload', () => {
        const data = {
            toolName: 'code.search',
            durationMs: 123,
            success: true,
        };
        const parsed = toolRunCompletedEventDataSchema.parse(data);
        expect(parsed.toolName).toBe('code.search');
    });

    it('accepts optional contextSummary and error', () => {
        const data = {
            toolName: 'context.build',
            durationMs: 456,
            success: false,
            error: 'Timeout',
            contextSummary: 'Partial summary',
        };
        const parsed = validateToolingEvent(TOOLING_EVENT_TYPES.TOOL_RUN_COMPLETED, data);
        // Narrow to tool run shape by checking discriminant presence
        if ('toolName' in parsed) {
            expect(parsed.error).toBe('Timeout');
        } else {
            throw new Error('Expected tool run completed shape');
        }
    });

    it('rejects negative duration', () => {
        const bad = {
            toolName: 'x',
            durationMs: -1,
            success: true,
        };
        expect(() => toolRunCompletedEventDataSchema.parse(bad)).toThrow();
    });
});

describe('contract: pipeline.run.completed', () => {
    it('validates success payload with digest', () => {
        const data = {
            runId: 'run-123',
            status: 'success',
            contextDigest: 'abc123',
            artifactRefs: ['mem://artifact1'],
        };
        const parsed = pipelineRunCompletedEventDataSchema.parse(data);
        expect(parsed.runId).toBe('run-123');
    });

    it('defaults artifactRefs to empty array', () => {
        const data = {
            runId: 'run-456',
            status: 'failed',
        };
        const parsed = pipelineRunCompletedEventDataSchema.parse(data);
        expect(parsed.artifactRefs).toEqual([]);
    });

    it('rejects invalid status', () => {
        const bad = { runId: 'r', status: 'partial' } as unknown;
        expect(() => pipelineRunCompletedEventDataSchema.parse(bad)).toThrow();
    });
});
