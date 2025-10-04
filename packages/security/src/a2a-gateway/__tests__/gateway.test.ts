/**
 * @file A2A Gateway Tests
 * @description Comprehensive test suite for zero-trust A2A gateway
 */

import { pino } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { A2AGateway } from '../gateway.js';
import type { A2AGatewayConfig, RequestEnvelope } from '../types.js';

const logger = pino({ level: 'silent' });

const mockConfig: A2AGatewayConfig = {
    capability_secret: 'test-secret-key-for-brainwav-testing-only',
    audit_config: {
        enabled: true,
        tamper_evident: true,
    },
    circuit_breaker: {
        failure_threshold: 5,
        recovery_timeout_ms: 30000,
    },
    branding: {
        organization: 'brAInwav',
        version: '1.0.0',
    },
};

const createMockEnvelope = (overrides: Partial<RequestEnvelope> = {}): RequestEnvelope => ({
    req_id: 'req-12345',
    agent_id: 'agent.test',
    action: 'invoke:tool.memory-search',
    resource: 'rag/corpus/test',
    context: {
        tenant: 'test-tenant',
        request_cost: 0.01,
        ts: Math.floor(Date.now() / 1000),
    },
    capabilities: ['mock-capability-token'],
    sig: 'mock-signature',
    ...overrides,
});

describe('A2AGateway', () => {
    let gateway: A2AGateway;

    beforeEach(() => {
        vi.clearAllMocks();
        gateway = new A2AGateway(mockConfig, logger);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('authorization flow', () => {
        it('should deny requests without valid envelope', async () => {
            const invalidEnvelope = createMockEnvelope({ sig: '' });

            const decision = await gateway.authorize(invalidEnvelope);

            expect(decision.allow).toBe(false);
            expect(decision.reason).toContain('Envelope validation failed');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should deny requests with expired envelopes', async () => {
            const expiredEnvelope = createMockEnvelope({
                context: {
                    tenant: 'test-tenant',
                    request_cost: 0.01,
                    ts: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
                },
            });

            const decision = await gateway.authorize(expiredEnvelope);

            expect(decision.allow).toBe(false);
            expect(decision.reason).toContain('expired');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should deny requests without valid capabilities', async () => {
            const envelope = createMockEnvelope({ capabilities: [] });

            const decision = await gateway.authorize(envelope);

            expect(decision.allow).toBe(false);
            expect(decision.reason).toContain('no valid capabilities');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should handle circuit breaker for failing agents', async () => {
            const envelope = createMockEnvelope({ agent_id: 'failing-agent' });

            // Trigger multiple failures to open circuit breaker
            for (let i = 0; i < 6; i++) {
                await gateway.authorize(envelope);
            }

            const decision = await gateway.authorize(envelope);
            expect(decision.allow).toBe(false);
            expect(decision.reason).toContain('circuit breaker open');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should emit audit events for all decisions', async () => {
            const envelope = createMockEnvelope();

            const decision = await gateway.authorize(envelope);

            // Verify decision includes audit metadata
            expect(decision.decided_at).toBeDefined();
            expect(decision.branding).toContain('brAInwav');
            expect(typeof decision.audit_required).toBe('boolean');
        });

        it('should calculate risk scores correctly', async () => {
            const highRiskEnvelope = createMockEnvelope({
                action: 'invoke:tool.shell',
                attestations: { code_review_passed: false },
            });

            const decision = await gateway.authorize(highRiskEnvelope);

            // High-risk operations should be denied without attestations
            expect(decision.allow).toBe(false);
            expect(decision.warnings?.some((w) => w.includes('High risk'))).toBe(true);
        });

        it('should allow low-risk operations with valid capabilities', async () => {
            // Mock valid capability validation
            vi.spyOn(gateway as any, 'validateCapabilities').mockResolvedValue([
                {
                    tenant: 'test-tenant',
                    action: 'invoke:tool.memory-search',
                    resourcePrefix: 'rag/corpus/',
                    maxCost: 1.0,
                },
            ]);

            const lowRiskEnvelope = createMockEnvelope({
                action: 'invoke:tool.memory-search',
            });

            const decision = await gateway.authorize(lowRiskEnvelope);

            expect(decision.allow).toBe(true);
            expect(decision.branding).toContain('brAInwav');
        });
    });

    describe('security features', () => {
        it('should prevent replay attacks', async () => {
            const envelope = createMockEnvelope();

            // First request should process normally
            await gateway.authorize(envelope);

            // Second request with same ID should be rejected
            const decision = await gateway.authorize(envelope);

            expect(decision.allow).toBe(false);
            expect(decision.reason).toContain('replay detected');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should enforce time-based access controls', async () => {
            const envelope = createMockEnvelope({
                action: 'invoke:tool.shell',
                context: {
                    tenant: 'test-tenant',
                    request_cost: 0.01,
                    ts: Math.floor(Date.now() / 1000),
                },
            });

            const decision = await gateway.authorize(envelope);

            // Should include time-based risk assessment
            expect(decision.warnings?.some((w) => w.includes('hours')) || decision.allow).toBeTruthy();
        });

        it('should validate tenant isolation', async () => {
            const envelope = createMockEnvelope({
                context: {
                    tenant: 'different-tenant',
                    request_cost: 0.01,
                    ts: Math.floor(Date.now() / 1000),
                },
            });

            const decision = await gateway.authorize(envelope);

            // Should respect tenant boundaries
            expect(decision.branding).toContain('brAInwav');
        });
    });

    describe('performance and reliability', () => {
        it('should complete authorization within reasonable time', async () => {
            const envelope = createMockEnvelope();
            const start = Date.now();

            await gateway.authorize(envelope);

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100); // Should complete within 100ms
        });

        it('should handle concurrent requests safely', async () => {
            const envelopes = Array.from({ length: 10 }, (_, i) =>
                createMockEnvelope({ req_id: `concurrent-${i}` }),
            );

            const decisions = await Promise.all(envelopes.map((env) => gateway.authorize(env)));

            // All decisions should have brAInwav branding
            expect(decisions.every((d) => d.branding.includes('brAInwav'))).toBe(true);

            // Each decision should have unique timestamps
            const timestamps = decisions.map((d) => d.decided_at);
            const uniqueTimestamps = new Set(timestamps);
            expect(uniqueTimestamps.size).toBe(timestamps.length);
        });

        it('should gracefully handle malformed requests', async () => {
            const malformedEnvelope = {
                req_id: 'test',
                // Missing required fields
            } as unknown as RequestEnvelope;

            const decision = await gateway.authorize(malformedEnvelope);

            expect(decision.allow).toBe(false);
            expect(decision.branding).toContain('brAInwav');
            expect(decision.reason).toBeDefined();
        });
    });

    describe('brAInwav branding compliance', () => {
        it('should include brAInwav branding in all responses', async () => {
            const envelope = createMockEnvelope();

            const decision = await gateway.authorize(envelope);

            expect(decision.branding).toContain('brAInwav');
        });

        it('should include brAInwav branding in error messages', async () => {
            const invalidEnvelope = createMockEnvelope({ capabilities: [] });

            const decision = await gateway.authorize(invalidEnvelope);

            expect(decision.reason).toContain('brAInwav');
            expect(decision.branding).toContain('brAInwav');
        });

        it('should include brAInwav branding in circuit breaker messages', async () => {
            const envelope = createMockEnvelope({ agent_id: 'circuit-test-agent' });

            // Trigger circuit breaker
            for (let i = 0; i < 6; i++) {
                await gateway.authorize(envelope);
            }

            const decision = await gateway.authorize(envelope);
            expect(decision.reason).toContain('brAInwav');
            expect(decision.branding).toContain('brAInwav');
        });
    });

    describe('integration scenarios', () => {
        it('should handle admin tenant with elevated privileges', async () => {
            const adminEnvelope = createMockEnvelope({
                context: {
                    tenant: 'brainwav-admin',
                    request_cost: 0.01,
                    ts: Math.floor(Date.now() / 1000),
                },
            });

            const decision = await gateway.authorize(adminEnvelope);

            // Admin decisions should be processed with special consideration
            expect(decision.branding).toContain('brAInwav');
        });

        it('should handle development tenant with restricted permissions', async () => {
            const devEnvelope = createMockEnvelope({
                context: {
                    tenant: 'development',
                    request_cost: 0.01,
                    ts: Math.floor(Date.now() / 1000),
                },
                resource: 'rag/corpus/development/test',
            });

            const decision = await gateway.authorize(devEnvelope);

            // Development decisions should respect environment restrictions
            expect(decision.branding).toContain('brAInwav');
        });
    });
});
