/**
 * @fileoverview Graceful Shutdown Manager Tests - TDD Implementation
 * @company brAInwav
 * @version 1.0.0
 *
 * TDD Test Suite for Graceful Shutdown Manager Component
 * Co-authored-by: brAInwav Development Team
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ShutdownHandler,
    ShutdownOptions
} from '../../operations/graceful-shutdown.js';
import { GracefulShutdownManager } from '../../operations/graceful-shutdown.js';

describe('GracefulShutdownManager - TDD Implementation', () => {
    let shutdownManager: GracefulShutdownManager;
    let mockHandler: ShutdownHandler;

    beforeEach(() => {
        const config: ShutdownOptions = {
            gracePeriod: 30000,
            forceExitDelay: 5000,
        };
        shutdownManager = new GracefulShutdownManager(config);

        mockHandler = {
            name: 'test-handler',
            priority: 100,
            timeout: 5000,
            handler: vi.fn().mockResolvedValue(undefined),
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Handler Registration', () => {
        it('should register shutdown handler successfully', () => {
            // Act
            shutdownManager.register(mockHandler);

            // Assert
            const handlers = shutdownManager.getHandlers();
            expect(handlers).toHaveLength(1);
            expect(handlers[0]).toBe('test-handler');
        });

        it('should prevent duplicate handler registration', () => {
            // Arrange
            shutdownManager.register(mockHandler);

            // Act & Assert
            expect(() => shutdownManager.register(mockHandler)).toThrow(
                'Shutdown handler "test-handler" already registered',
            );
        });

        it('should validate handler configuration on registration', () => {
            // Arrange
            const invalidHandler = {
                ...mockHandler,
                name: '',
            };

            // Act & Assert
            expect(() => shutdownManager.register(invalidHandler)).toThrow('Handler name is required');
        });

        it('should sort handlers by priority on registration', () => {
            // Arrange
            const highPriorityHandler: ShutdownHandler = {
                name: 'high-priority',
                priority: 200,
                timeout: 5000,
                handler: vi.fn().mockResolvedValue(undefined),
            };

            const lowPriorityHandler: ShutdownHandler = {
                name: 'low-priority',
                priority: 50,
                timeout: 5000,
                handler: vi.fn().mockResolvedValue(undefined),
            };

            // Act
            shutdownManager.register(mockHandler); // priority 100
            shutdownManager.register(lowPriorityHandler); // priority 50
            shutdownManager.register(highPriorityHandler); // priority 200

            // Assert
            const handlers = shutdownManager.getHandlers();
            expect(handlers).toEqual(['high-priority', 'test-handler', 'low-priority']);
        });
    });

    describe('Shutdown Process', () => {
        beforeEach(() => {
            shutdownManager.register(mockHandler);
        });

        it('should execute shutdown process successfully', async () => {
            // Act
            const results = await shutdownManager.shutdown('Test shutdown');

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                name: 'test-handler',
                success: true,
                duration: expect.any(Number),
            });
            expect(mockHandler.handler).toHaveBeenCalledOnce();
        });

        it('should handle handler timeouts during shutdown', async () => {
            // Arrange
            const slowHandler: ShutdownHandler = {
                name: 'slow-handler',
                priority: 100,
                timeout: 100,
                handler: vi
                    .fn()
                    .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 200))),
            };
            shutdownManager.register(slowHandler);

            // Act
            const results = await shutdownManager.shutdown('Timeout test');

            // Assert
            const slowResult = results.find((r) => r.name === 'slow-handler');
            expect(slowResult).toMatchObject({
                name: 'slow-handler',
                success: false,
                error: expect.stringContaining('timeout'),
            });
        });

        it('should handle handler errors gracefully during shutdown', async () => {
            // Arrange
            const failingHandler: ShutdownHandler = {
                name: 'failing-handler',
                priority: 100,
                timeout: 5000,
                handler: vi.fn().mockRejectedValue(new Error('Handler failed')),
            };
            shutdownManager.register(failingHandler);

            // Act
            const results = await shutdownManager.shutdown('Error test');

            // Assert
            const failingResult = results.find((r) => r.name === 'failing-handler');
            expect(failingResult).toMatchObject({
                name: 'failing-handler',
                success: false,
                error: 'Handler failed',
            });
        });

        it('should prevent multiple concurrent shutdowns', async () => {
            // Act
            const firstShutdown = shutdownManager.shutdown('First shutdown');
            const secondShutdown = shutdownManager.shutdown('Second shutdown');

            // Assert
            await expect(secondShutdown).rejects.toThrow('Shutdown already in progress');

            // Wait for first shutdown to complete
            await firstShutdown;
        });

        it('should track shutdown status correctly', async () => {
            // Arrange
            expect(shutdownManager.isShutdownInProgress()).toBe(false);

            // Act
            const shutdownPromise = shutdownManager.shutdown('Status test');
            expect(shutdownManager.isShutdownInProgress()).toBe(true);

            await shutdownPromise;
            expect(shutdownManager.isShutdownInProgress()).toBe(false);
        });
    });

    describe('Event Handling', () => {
        it('should emit shutdown-started event', async () => {
            // Arrange
            const startedHandler = vi.fn();
            shutdownManager.on('shutdown-started', startedHandler);
            shutdownManager.register(mockHandler);

            // Act
            await shutdownManager.shutdown('Event test');

            // Assert
            expect(startedHandler).toHaveBeenCalledWith('Event test');
        });

        it('should emit shutdown-completed event with results', async () => {
            // Arrange
            const completedHandler = vi.fn();
            shutdownManager.on('shutdown-completed', completedHandler);
            shutdownManager.register(mockHandler);

            // Act
            await shutdownManager.shutdown('Event test');

            // Assert
            expect(completedHandler).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'test-handler',
                        success: true,
                    }),
                ]),
            );
        });

        it('should emit handler-completed events for each handler', async () => {
            // Arrange
            const handlerCompletedListener = vi.fn();
            shutdownManager.on('handler-completed', handlerCompletedListener);
            shutdownManager.register(mockHandler);

            // Act
            await shutdownManager.shutdown('Handler event test');

            // Assert
            expect(handlerCompletedListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test-handler',
                    success: true,
                }),
            );
        });
    });

    describe('Standard Handlers', () => {
        it('should provide HTTP server shutdown handler', () => {
            // Arrange
            const mockServer = {
                close: vi.fn().mockImplementation((callback) => callback()),
            };

            // Act
            const handler = StandardShutdownHandlers.httpServer(mockServer);

            // Assert
            expect(handler).toMatchObject({
                name: 'http-server',
                priority: 10,
                timeout: expect.any(Number),
            });
        });

        it('should provide cleanup handler', () => {
            // Arrange
            const cleanupFn = vi.fn().mockResolvedValue(undefined);

            // Act
            const handler = StandardShutdownHandlers.cleanup(cleanupFn);

            // Assert
            expect(handler).toMatchObject({
                name: 'cleanup',
                priority: 90,
                timeout: expect.any(Number),
            });
        });

        it('should execute HTTP server shutdown handler correctly', async () => {
            // Arrange
            const mockServer = {
                close: vi.fn().mockImplementation((callback) => callback()),
            };
            const handler = StandardShutdownHandlers.httpServer(mockServer);

            // Act
            await handler.handler();

            // Assert
            expect(mockServer.close).toHaveBeenCalledOnce();
        });

        it('should execute cleanup handler correctly', async () => {
            // Arrange
            const cleanupFn = vi.fn().mockResolvedValue(undefined);
            const handler = StandardShutdownHandlers.cleanup(cleanupFn);

            // Act
            await handler.handler();

            // Assert
            expect(cleanupFn).toHaveBeenCalledOnce();
        });
    });

    describe('Process Signal Handling', () => {
        it('should listen for SIGTERM signals', () => {
            // Arrange
            const originalListeners = process.listeners('SIGTERM');

            // Act
            shutdownManager.listenForSignals();

            // Assert
            const newListeners = process.listeners('SIGTERM');
            expect(newListeners.length).toBeGreaterThan(originalListeners.length);

            // Cleanup
            shutdownManager.removeSignalListeners();
        });

        it('should listen for SIGINT signals', () => {
            // Arrange
            const originalListeners = process.listeners('SIGINT');

            // Act
            shutdownManager.listenForSignals();

            // Assert
            const newListeners = process.listeners('SIGINT');
            expect(newListeners.length).toBeGreaterThan(originalListeners.length);

            // Cleanup
            shutdownManager.removeSignalListeners();
        });

        it('should remove signal listeners properly', () => {
            // Arrange
            const originalSigtermListeners = process.listeners('SIGTERM');
            const originalSigintListeners = process.listeners('SIGINT');

            shutdownManager.listenForSignals();

            // Act
            shutdownManager.removeSignalListeners();

            // Assert
            expect(process.listeners('SIGTERM')).toEqual(originalSigtermListeners);
            expect(process.listeners('SIGINT')).toEqual(originalSigintListeners);
        });
    });

    describe('Configuration and Timeouts', () => {
        it('should respect configured grace period', async () => {
            // Arrange
            const config: ShutdownOptions = {
                gracePeriod: 1000, // 1 second
                forceExitDelay: 500,
            };
            const fastShutdownManager = new GracefulShutdownManager(config);

            const quickHandler: ShutdownHandler = {
                name: 'quick-handler',
                priority: 100,
                timeout: 100,
                handler: vi.fn().mockResolvedValue(undefined),
            };

            fastShutdownManager.register(quickHandler);

            // Act
            const startTime = Date.now();
            await fastShutdownManager.shutdown('Grace period test');
            const duration = Date.now() - startTime;

            // Assert
            expect(duration).toBeLessThan(1000); // Should complete quickly
            expect(quickHandler.handler).toHaveBeenCalledOnce();
        });

        it('should provide shutdown statistics', async () => {
            // Arrange
            shutdownManager.register(mockHandler);

            // Act
            const results = await shutdownManager.shutdown('Stats test');

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                name: 'test-handler',
                success: true,
                duration: expect.any(Number),
                timestamp: expect.any(Date),
            });
        });
    });

    describe('Integration with brAInwav Standards', () => {
        it('should include brAInwav branding in shutdown logs', async () => {
            // Arrange
            const consoleSpy = vi.spyOn(console, 'log');
            shutdownManager.register(mockHandler);

            // Act
            await shutdownManager.shutdown('brAInwav shutdown test');

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('brAInwav'));

            consoleSpy.mockRestore();
        });

        it('should follow brAInwav error handling patterns', async () => {
            // Arrange
            const errorHandler: ShutdownHandler = {
                name: 'error-handler',
                priority: 100,
                timeout: 5000,
                handler: vi.fn().mockRejectedValue(new Error('brAInwav test error')),
            };
            shutdownManager.register(errorHandler);

            // Act
            const results = await shutdownManager.shutdown('Error handling test');

            // Assert
            const errorResult = results.find((r) => r.name === 'error-handler');
            expect(errorResult).toMatchObject({
                success: false,
                error: 'brAInwav test error',
                timestamp: expect.any(Date),
            });
        });

        it('should handle unregistration of handlers', () => {
            // Arrange
            shutdownManager.register(mockHandler);
            expect(shutdownManager.getHandlers()).toHaveLength(1);

            // Act
            shutdownManager.unregister('test-handler');

            // Assert
            expect(shutdownManager.getHandlers()).toHaveLength(0);
        });

        it('should handle unregistering non-existent handlers gracefully', () => {
            // Act & Assert
            expect(() => shutdownManager.unregister('non-existent')).not.toThrow();
        });
    });
});
