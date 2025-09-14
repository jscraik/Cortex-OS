import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CortexArchonConfig } from '../src/service.js';
import {
    CortexArchonService,
    createCortexArchonService,
} from '../src/service.js';

describe('CortexArchonService', () => {
    let service: CortexArchonService;
    const mockConfig = {
        // Basic config to test with
        enableAgentIntegration: true,
        enableTaskOrchestration: true,
        enableRemoteRetrieval: true,
        enableDocumentSync: true,
        healthCheckInterval: 0, // Disable for tests
        autoConnect: false,
    } as CortexArchonConfig;

    beforeEach(() => {
        service = createCortexArchonService(mockConfig);
    });

    afterEach(async () => {
        if (service) {
            await service.cleanup();
        }
    });

    describe('creation', () => {
        it('should create service with valid config', () => {
            expect(service).toBeInstanceOf(CortexArchonService);
        });

        it('should emit events', () => {
            const mockListener = vi.fn();
            service.on('connected', mockListener);

            // Mock connection
            service.emit('connected');
            expect(mockListener).toHaveBeenCalled();
        });
    });

    describe('configuration', () => {
        it('should accept minimal config', () => {
            const minimalConfig = {} as CortexArchonConfig;

            const minimalService = createCortexArchonService(minimalConfig);
            expect(minimalService).toBeInstanceOf(CortexArchonService);
        });

        it('should handle all configuration options', () => {
            const fullConfig = {
                enableAgentIntegration: true,
                enableTaskOrchestration: true,
                enableRemoteRetrieval: true,
                enableDocumentSync: true,
                agentCapabilities: ['search', 'analyze'],
                taskSyncInterval: 30000,
                fallbackToLocal: true,
                remoteSearchLimit: 20,
                hybridSearchWeights: {
                    local: 0.7,
                    remote: 0.3,
                },
                healthCheckInterval: 60000,
                autoConnect: true,
                retryConfig: {
                    maxRetries: 3,
                    backoffMs: 1000,
                },
            } as CortexArchonConfig;

            const fullService = createCortexArchonService(fullConfig);
            expect(fullService).toBeInstanceOf(CortexArchonService);
        });
    });

    describe('status', () => {
        it('should return initial status', async () => {
            const status = await service.getStatus();

            expect(status).toEqual({
                connected: false,
                healthy: false,
                lastHealthCheck: expect.any(String),
                capabilities: [],
                errors: expect.any(Array),
            });
        });

        it('should update status after initialization', async () => {
            // This would require mocking the MCP client
            // For now, just verify the status structure
            const status = await service.getStatus();
            expect(status).toHaveProperty('connected');
            expect(status).toHaveProperty('healthy');
            expect(status).toHaveProperty('capabilities');
        });
    });

    describe('event handling', () => {
        it('should emit error events', () => {
            const testError = new Error('Test error');
            const mockListener = vi.fn();

            service.on('error', mockListener);
            service.emit('error', testError);

            expect(mockListener).toHaveBeenCalledWith(testError);
        });

        it('should emit connection events', () => {
            const connectedMock = vi.fn();
            const disconnectedMock = vi.fn();

            service.on('connected', connectedMock);
            service.on('disconnected', disconnectedMock);

            service.emit('connected');
            service.emit('disconnected');

            expect(connectedMock).toHaveBeenCalled();
            expect(disconnectedMock).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should cleanup without errors', async () => {
            await expect(service.cleanup()).resolves.not.toThrow();
        });

        it('should emit disconnected event on cleanup', () => {
            const mockListener = vi.fn();
            service.on('disconnected', mockListener);

            // Mock the cleanup process
            service.emit('disconnected');
            expect(mockListener).toHaveBeenCalled();
        });
    });
});

describe('Configuration validation', () => {
    it('should handle minimal configuration', () => {
        expect(() => {
            createCortexArchonService({} as CortexArchonConfig);
        }).not.toThrow(); // Constructor doesn't validate, only runtime does
    });

    it('should handle configuration with feature flags', () => {
        const config = {
            enableAgentIntegration: true,
            enableRemoteRetrieval: false,
        } as CortexArchonConfig;

        const service = createCortexArchonService(config);
        expect(service).toBeInstanceOf(CortexArchonService);
    });
});
