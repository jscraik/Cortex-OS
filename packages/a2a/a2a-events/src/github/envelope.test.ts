import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
        calculateNextRetryDelay,
        cloneEnvelope,
        createA2AEventEnvelope,
        updateProcessingState,
} from './envelope';

const baseErrorEvent = {
        event_id: randomUUID(),
        event_type: 'github.error' as const,
        source: 'github-client' as const,
        timestamp: new Date().toISOString(),
        error: {
                id: randomUUID(),
                message: 'network failure',
                category: 'network' as const,
                severity: 'medium' as const,
                is_retryable: true,
                context: {
                        operation: 'list-repos',
                        retry_count: 1,
                },
                timestamp: new Date().toISOString(),
        },
};

afterEach(() => {
        vi.restoreAllMocks();
});

describe('createA2AEventEnvelope', () => {
        it('builds an envelope with defaults applied', () => {
                const envelope = createA2AEventEnvelope(baseErrorEvent);

                expect(envelope.event.event_type).toBe('github.error');
                expect(envelope.routing.topic).toBe('github.error');
                expect(envelope.retry_policy.max_attempts).toBe(3);
                expect(envelope.priority).toBe('normal');
        });

        it('cloneEnvelope preserves undefined optional fields', () => {
                const envelope = createA2AEventEnvelope(baseErrorEvent, {
                        sourceInfo: { process_id: undefined },
                });

                const cloned = cloneEnvelope(envelope);

                expect(cloned).not.toBe(envelope);
                expect(Object.hasOwn(cloned.source_info, 'process_id')).toBe(true);
                expect(cloned.source_info.process_id).toBeUndefined();
        });
});

describe('calculateNextRetryDelay', () => {
        it('returns the initial delay when there is no processing state', () => {
                const envelope = createA2AEventEnvelope(baseErrorEvent, {
                        retryPolicy: {
                                max_attempts: 5,
                                initial_delay_ms: 500,
                                max_delay_ms: 5000,
                                backoff_multiplier: 3,
                                jitter: false,
                        },
                });

                expect(calculateNextRetryDelay(envelope)).toBe(500);
        });

        it('applies exponential backoff with jitter when attempts have been recorded', () => {
                const baseEnvelope = createA2AEventEnvelope(baseErrorEvent, {
                        retryPolicy: {
                                max_attempts: 5,
                                initial_delay_ms: 1000,
                                max_delay_ms: 5000,
                                backoff_multiplier: 2,
                                jitter: true,
                        },
                });
                const envelope = updateProcessingState(baseEnvelope, { attempt_count: 1 });
                const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

                const delay = calculateNextRetryDelay(envelope);

                expect(randomSpy).toHaveBeenCalledTimes(1);
                expect(delay).toBe(2100);
        });
});
