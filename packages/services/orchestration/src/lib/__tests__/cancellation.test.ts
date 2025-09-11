import { beforeEach, describe, expect, it } from 'vitest';
import {
    CancellationController,
    CancellationError,
    isCancellationError,
    withCancellation,
} from '../cancellation';

describe('cancellation system', () => {
    describe('CancellationController', () => {
        let controller: CancellationController;

        beforeEach(() => {
            controller = new CancellationController();
        });

        it('provides an AbortSignal', () => {
            expect(controller.signal).toBeInstanceOf(AbortSignal);
            expect(controller.signal.aborted).toBe(false);
        });

        it('cancels and aborts the signal', () => {
            expect(controller.isCancelled).toBe(false);

            controller.cancel('Test reason');

            expect(controller.isCancelled).toBe(true);
            expect(controller.signal.aborted).toBe(true);
            expect(controller.reason).toBe('Test reason');
            expect(controller.cancelledAt).toBeInstanceOf(Date);
        });

        it('prevents duplicate cancellation', () => {
            controller.cancel('First reason');
            const firstReason = controller.reason;
            const firstCancelledAt = controller.cancelledAt;

            controller.cancel('Second reason');

            expect(controller.reason).toBe(firstReason);
            expect(controller.cancelledAt).toBe(firstCancelledAt);
        });

        it('supports timeout-based cancellation', async () => {
            const controller = CancellationController.withTimeout(50, 'Timeout test');

            expect(controller.isCancelled).toBe(false);

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(controller.isCancelled).toBe(true);
            expect(controller.reason).toBe('Timeout test');
        });

        it('can be created from an existing signal', () => {
            const parentController = new AbortController();
            const controller = CancellationController.fromSignal(
                parentController.signal,
            );

            expect(controller.isCancelled).toBe(false);

            parentController.abort();

            expect(controller.isCancelled).toBe(true);
            expect(controller.reason).toBe('Parent signal aborted');
        });

        it('handles pre-aborted signal', () => {
            const parentController = new AbortController();
            parentController.abort();

            const controller = CancellationController.fromSignal(
                parentController.signal,
            );

            expect(controller.isCancelled).toBe(true);
            expect(controller.reason).toBe('Parent signal aborted');
        });

        it('tracks cleanup errors and rolled back steps', () => {
            const error1 = new Error('Cleanup error 1');
            const error2 = new Error('Cleanup error 2');

            controller.addCleanupError(error1);
            controller.addCleanupError(error2);
            controller.addRolledBackStep('step1');
            controller.addRolledBackStep('step2');

            const result = controller.getResult();
            expect(result.cleanupErrors).toHaveLength(2);
            expect(result.cleanupErrors[0]).toBe(error1);
            expect(result.cleanupErrors[1]).toBe(error2);
            expect(result.rolledBackSteps).toEqual(['step1', 'step2']);
        });

        it('returns complete cancellation result', () => {
            controller.cancel('Test cancellation');
            controller.addCleanupError(new Error('Test error'));
            controller.addRolledBackStep('test-step');

            const result = controller.getResult();

            expect(result.cancelled).toBe(true);
            expect(result.reason).toBe('Test cancellation');
            expect(result.cancelledAt).toBeInstanceOf(Date);
            expect(result.cleanupErrors).toHaveLength(1);
            expect(result.rolledBackSteps).toEqual(['test-step']);
        });
    });

    describe('CancellationError', () => {
        it('creates a proper error with cancellation info', () => {
            const cancelledAt = new Date();
            const error = new CancellationError('Test reason', cancelledAt);

            expect(error.name).toBe('CancellationError');
            expect(error.message).toBe('Workflow cancelled: Test reason');
            expect(error.cancelled).toBe(true);
            expect(error.reason).toBe('Test reason');
            expect(error.cancelledAt).toBe(cancelledAt);
        });

        it('defaults to current time if not provided', () => {
            const beforeError = Date.now();
            const error = new CancellationError('Test reason');
            const afterError = Date.now();

            expect(error.cancelledAt.getTime()).toBeGreaterThanOrEqual(beforeError);
            expect(error.cancelledAt.getTime()).toBeLessThanOrEqual(afterError);
        });
    });

    describe('isCancellationError', () => {
        it('detects CancellationError instances', () => {
            const error = new CancellationError('Test');
            expect(isCancellationError(error)).toBe(true);
        });

        it('detects abort-related errors', () => {
            const abortError = new Error('Aborted');
            expect(isCancellationError(abortError)).toBe(true);
        });

        it('rejects non-cancellation errors', () => {
            const regularError = new Error('Regular error');
            expect(isCancellationError(regularError)).toBe(false);
            expect(isCancellationError('string error')).toBe(false);
            expect(isCancellationError(null)).toBe(false);
            expect(isCancellationError(undefined)).toBe(false);
        });
    });

    describe('withCancellation', () => {
        it('executes operation successfully when not cancelled', async () => {
            const result = await withCancellation(async (signal) => {
                expect(signal).toBeInstanceOf(AbortSignal);
                return 'success';
            });

            expect(result).toBe('success');
        });

        it('throws CancellationError when operation is cancelled', async () => {
            await expect(
                withCancellation(
                    async (signal) => {
                        // Simulate some work then check for cancellation
                        await new Promise((resolve) => setTimeout(resolve, 10));
                        if (signal.aborted) {
                            throw new Error('Operation cancelled');
                        }
                        // Simulate more work that gets interrupted
                        await new Promise((resolve, reject) => {
                            const timer = setTimeout(resolve, 200);
                            signal.addEventListener('abort', () => {
                                clearTimeout(timer);
                                reject(new Error('Operation cancelled'));
                            });
                        });
                        return 'should not reach';
                    },
                    { timeoutMs: 50 },
                ),
            ).rejects.toThrow(CancellationError);
        });

        it('propagates non-cancellation errors', async () => {
            const testError = new Error('Test error');

            await expect(
                withCancellation(async () => {
                    throw testError;
                }),
            ).rejects.toThrow(testError);
        });

        it('respects timeout option', async () => {
            const start = Date.now();

            await expect(
                withCancellation(
                    async (signal) => {
                        // Use signal to properly handle cancellation
                        await new Promise((resolve, reject) => {
                            const timer = setTimeout(resolve, 200);
                            signal.addEventListener('abort', () => {
                                clearTimeout(timer);
                                reject(new Error('Timeout'));
                            });
                        });
                        return 'should timeout';
                    },
                    { timeoutMs: 50 },
                ),
            ).rejects.toThrow(CancellationError);

            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(150); // Should timeout before 200ms
        });
    });
});
