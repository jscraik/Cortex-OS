/**
 * Error Handling Tests
 * Following TDD plan requirements for error boundary protection
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AgentError,
    ErrorCategory,
    ErrorSeverity,
    ProductionErrorHandler,
    ResourceManager,
    setupErrorBoundary
} from '../../src/lib/error-handling.js';

describe('Error Boundary Protection', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
    let processExitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('AgentError', () => {
        it('should create error with proper structure', () => {
            const error = new AgentError(
                'Test error',
                ErrorCategory.VALIDATION,
                ErrorSeverity.HIGH
            );

            expect(error.message).toBe('Test error');
            expect(error.category).toBe(ErrorCategory.VALIDATION);
            expect(error.severity).toBe(ErrorSeverity.HIGH);
            expect(error.id).toBeDefined();
            expect(error.timestamp).toBeDefined();
            expect(error.handled).toBe(false);
        });

        it('should create error from unknown input', () => {
            const originalError = new Error('Original error');
            const agentError = AgentError.fromUnknown(originalError);

            expect(agentError).toBeInstanceOf(AgentError);
            expect(agentError.message).toBe('Original error');
            expect(agentError.category).toBe(ErrorCategory.UNKNOWN);
        });

        it('should create error from string', () => {
            const agentError = AgentError.fromUnknown('String error');

            expect(agentError.message).toBe('String error');
            expect(agentError.category).toBe(ErrorCategory.UNKNOWN);
        });

        it('should handle unknown error types', () => {
            const agentError = AgentError.fromUnknown({ custom: 'object' });

            expect(agentError.message).toBe('Unknown error occurred');
            expect(agentError.context?.originalError).toEqual({ custom: 'object' });
        });

        it('should serialize to JSON correctly', () => {
            const error = new AgentError(
                'Test error',
                ErrorCategory.SECURITY,
                ErrorSeverity.CRITICAL,
                { userId: '123' }
            );

            const json = error.toJSON();

            expect(json.id).toBe(error.id);
            expect(json.message).toBe('Test error');
            expect(json.category).toBe(ErrorCategory.SECURITY);
            expect(json.severity).toBe(ErrorSeverity.CRITICAL);
            expect(json.context).toEqual({ userId: '123' });
        });
    });

    describe('ProductionErrorHandler', () => {
        let errorHandler: ProductionErrorHandler;

        beforeEach(() => {
            errorHandler = new ProductionErrorHandler({
                maxRetries: 2,
                exitOnCritical: false // Disable for testing
            });
        });

        it('should handle error and mark as handled', async () => {
            const error = new AgentError('Test error', ErrorCategory.NETWORK, ErrorSeverity.MEDIUM);

            await errorHandler.handleError(error, 'test-source');

            expect(error.handled).toBe(true);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Agent Error:',
                expect.objectContaining({
                    message: 'Test error',
                    source: 'test-source',
                    retryCount: 0
                })
            );
        });

        it('should respect retry limits', async () => {
            const error = new AgentError(
                'Retryable error',
                ErrorCategory.TIMEOUT,
                ErrorSeverity.MEDIUM,
                {},
                true // retryable
            );

            // First retry should be allowed
            expect(errorHandler.isRetryable(error)).toBe(true);
            await errorHandler.handleError(error, 'test');

            // Second retry should be allowed
            expect(errorHandler.isRetryable(error)).toBe(true);
            await errorHandler.handleError(error, 'test');

            // Third retry should not be allowed (maxRetries = 2)
            expect(errorHandler.isRetryable(error)).toBe(false);
        });

        it('should not retry non-retryable errors', async () => {
            const error = new AgentError(
                'Non-retryable error',
                ErrorCategory.VALIDATION,
                ErrorSeverity.HIGH,
                {},
                false // not retryable
            );

            expect(errorHandler.isRetryable(error)).toBe(false);
        });

        it('should call notification callback for critical errors', async () => {
            const notificationCallback = vi.fn();
            const handler = new ProductionErrorHandler({
                notificationCallback
            });

            const criticalError = new AgentError(
                'Critical error',
                ErrorCategory.SECURITY,
                ErrorSeverity.CRITICAL
            );

            await handler.handleError(criticalError, 'test');

            expect(notificationCallback).toHaveBeenCalledWith(criticalError);
        });

        it('should determine exit condition correctly', () => {
            const exitHandler = new ProductionErrorHandler({
                exitOnCritical: true
            });

            const criticalError = new AgentError(
                'Critical error',
                ErrorCategory.MEMORY,
                ErrorSeverity.CRITICAL
            );

            const mediumError = new AgentError(
                'Medium error',
                ErrorCategory.NETWORK,
                ErrorSeverity.MEDIUM
            );

            expect(exitHandler.shouldExit(criticalError)).toBe(true);
            expect(exitHandler.shouldExit(mediumError)).toBe(false);
        });
    });

    describe('ResourceManager', () => {
        let resourceManager: ResourceManager;

        beforeEach(() => {
            resourceManager = new ResourceManager();
        });

        it('should register and cleanup resources', async () => {
            const cleanup1 = vi.fn().mockResolvedValue(undefined);
            const cleanup2 = vi.fn().mockResolvedValue(undefined);

            resourceManager.register('resource1', cleanup1);
            resourceManager.register('resource2', cleanup2);

            await resourceManager.cleanup();

            expect(cleanup1).toHaveBeenCalled();
            expect(cleanup2).toHaveBeenCalled();
        });

        it('should handle cleanup errors gracefully', async () => {
            const failingCleanup = vi.fn().mockRejectedValue(new Error('Cleanup failed'));
            const successCleanup = vi.fn().mockResolvedValue(undefined);

            resourceManager.register('failing', failingCleanup);
            resourceManager.register('success', successCleanup);

            await resourceManager.cleanup();

            expect(failingCleanup).toHaveBeenCalled();
            expect(successCleanup).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to cleanup failing:',
                expect.any(Error)
            );
        });

        it('should not cleanup twice', async () => {
            const cleanup = vi.fn().mockResolvedValue(undefined);
            resourceManager.register('resource', cleanup);

            await resourceManager.cleanup();
            await resourceManager.cleanup(); // Second call

            expect(cleanup).toHaveBeenCalledTimes(1);
        });
    });

    describe('Global Error Boundary', () => {
        let errorHandler: ProductionErrorHandler;
        let resourceManager: ResourceManager;
        let originalListeners: {
            unhandledRejection: NodeJS.UnhandledRejectionListener[];
            uncaughtException: NodeJS.UncaughtExceptionListener[];
        };

        beforeEach(() => {
            // Store original listeners
            originalListeners = {
                unhandledRejection: process.listeners('unhandledRejection') as NodeJS.UnhandledRejectionListener[],
                uncaughtException: process.listeners('uncaughtException') as NodeJS.UncaughtExceptionListener[],
            };

            // Remove existing listeners
            process.removeAllListeners('unhandledRejection');
            process.removeAllListeners('uncaughtException');

            errorHandler = new ProductionErrorHandler({ exitOnCritical: false });
            resourceManager = new ResourceManager();
        });

        afterEach(() => {
            // Restore original listeners
            process.removeAllListeners('unhandledRejection');
            process.removeAllListeners('uncaughtException');

            originalListeners.unhandledRejection.forEach(listener => {
                process.on('unhandledRejection', listener);
            });
            originalListeners.uncaughtException.forEach(listener => {
                process.on('uncaughtException', listener);
            });
        });

        it('should setup global error handlers', () => {
            setupErrorBoundary(errorHandler, resourceManager);

            const unhandledRejectionListeners = process.listenerCount('unhandledRejection');
            const uncaughtExceptionListeners = process.listenerCount('uncaughtException');

            expect(unhandledRejectionListeners).toBeGreaterThan(0);
            expect(uncaughtExceptionListeners).toBeGreaterThan(0);
        });

        it('should handle unhandled promise rejections', async () => {
            setupErrorBoundary(errorHandler, resourceManager);

            // Simulate unhandled rejection
            const promise = Promise.reject(new Error('Unhandled rejection'));

            // Wait for the handler to process
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Agent High Severity Error:',
                expect.objectContaining({
                    message: 'Unhandled rejection',
                    source: 'unhandled-rejection',
                    category: 'unknown',
                    severity: 'high'
                })
            );

            // Prevent unhandled rejection warning
            promise.catch(() => { });
        });
    });

    describe('Error Categories and Severities', () => {
        it('should validate error categories', () => {
            const categories = Object.values(ErrorCategory);
            expect(categories).toContain('validation');
            expect(categories).toContain('network');
            expect(categories).toContain('timeout');
            expect(categories).toContain('security');
            expect(categories).toContain('memory');
            expect(categories).toContain('unknown');
        });

        it('should validate error severities', () => {
            const severities = Object.values(ErrorSeverity);
            expect(severities).toContain('low');
            expect(severities).toContain('medium');
            expect(severities).toContain('high');
            expect(severities).toContain('critical');
        });

        it('should create errors with different severity levels', () => {
            const lowError = new AgentError('Low severity', ErrorCategory.VALIDATION, ErrorSeverity.LOW);
            const mediumError = new AgentError('Medium severity', ErrorCategory.NETWORK, ErrorSeverity.MEDIUM);
            const highError = new AgentError('High severity', ErrorCategory.SECURITY, ErrorSeverity.HIGH);
            const criticalError = new AgentError('Critical severity', ErrorCategory.MEMORY, ErrorSeverity.CRITICAL);

            expect(lowError.severity).toBe(ErrorSeverity.LOW);
            expect(mediumError.severity).toBe(ErrorSeverity.MEDIUM);
            expect(highError.severity).toBe(ErrorSeverity.HIGH);
            expect(criticalError.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });
});
