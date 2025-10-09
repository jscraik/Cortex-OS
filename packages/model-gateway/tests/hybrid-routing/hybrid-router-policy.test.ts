/**
 * Hybrid Router Policy Tests - TDD RED Phase
 *
 * These tests define the expected behavior of the Hybrid Model Router policy system.
 * All tests should initially FAIL (RED) before implementation.
 *
 * Tests cover:
 * - MLX-first routing policy decisions
 * - Cloud burst trigger conditions
 * - Privacy mode enforcement
 * - Thermal-aware routing decisions
 * - Evidence compliance validation
 * - Performance optimization and SLA monitoring
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	HybridRoutingEngine,
	type ModelAdapter,
} from '../../src/hybrid-router/HybridRoutingEngine.js';
import { PrivacyModeEnforcer } from '../../src/hybrid-router/PrivacyModeEnforcer.js';

// Mock dependencies
vi.mock('@cortex-os/memory-core/src/context-graph/evidence/EvidenceGate.js', () => ({
	EvidenceGate: vi.fn().mockImplementation(() => ({
		validateAccess: vi.fn().mockResolvedValue({
			granted: true,
			policiesApplied: ['evidence-required'],
			evidence: { evidenceValid: true },
		}),
	})),
}));

vi.mock('@cortex-os/memory-core/src/context-graph/thermal/ThermalMonitor.js', () => ({
	ThermalMonitor: vi.fn().mockImplementation(() => ({
		getCurrentTemperature: vi.fn().mockResolvedValue({
			currentTemp: 65,
			trend: 'stable',
			zone: 'optimal',
			critical: false,
		}),
	})),
}));

describe('HybridRoutingEngine', () => {
	let hybridRouter: HybridRoutingEngine;
	let mockEvidenceGate: any;
	let mockThermalMonitor: any;
	let privacyEnforcer: PrivacyModeEnforcer;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEvidenceGate = {
			validateAccess: vi.fn(),
		};
		mockThermalMonitor = {
			getCurrentTemperature: vi.fn(),
		};
		privacyEnforcer = new PrivacyModeEnforcer();
		hybridRouter = new HybridRoutingEngine(mockEvidenceGate, mockThermalMonitor, privacyEnforcer);

		// Register mock model adapters
		hybridRouter.registerModelAdapter(createMockAdapter('mlx-local', 'local'));
		hybridRouter.registerModelAdapter(createMockAdapter('gpt-4-cloud', 'cloud'));
		hybridRouter.registerModelAdapter(createMockAdapter('claude-cloud', 'cloud'));
	});

	describe('MLX-First Routing Policy', () => {
		it('should prefer local MLX model for small requests', async () => {
			// Given
			const request = {
				prompt: 'Simple question',
				modelPreferences: {
					preferLocal: true,
					allowCloud: true,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.decision.routingReason).toContain('MLX-first');
			expect(result.decision.confidence).toBeGreaterThan(0.8);
			expect(result.decision.estimatedCost).toBe(0);
			expect(result.metadata.fallbackUsed).toBe(false);
			expect(result.audit.routingPath).toEqual(['local']);
		});

		it('should prefer local MLX model when explicitly requested', async () => {
			// Given
			const request = {
				prompt: 'Another simple question',
				modelPreferences: {
					preferLocal: true,
					allowCloud: false,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.decision.routingReason).toContain('MLX-first');
			expect(result.decision.estimatedCost).toBe(0);
			expect(result.metadata.brainwavRouted).toBe(true);
		});

		it('should use local MLX model for privacy mode requests', async () => {
			// Given
			const request = {
				prompt: 'Sensitive question',
				privacyMode: true,
				evidenceRequired: true,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.decision.privacyEnforced).toBe(true);
			expect(result.decision.routingReason).toContain('privacy');
			expect(result.audit.policiesApplied).toContain('privacy-mode');
		});

		it('should fall back to local MLX when cloud is not preferred', async () => {
			// Given
			const request = {
				prompt: 'Fallback test question',
				modelPreferences: {
					preferLocal: false,
					allowCloud: true,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.decision.routingReason).toContain('Fallback');
			expect(result.metadata.fallbackUsed).toBe(false);
		});
	});

	describe('Cloud Burst Logic', () => {
		it('should burst to cloud for large context (>20k tokens)', async () => {
			// Given
			const largePrompt = 'A'.repeat(25000); // Approximately 25k tokens
			const request = {
				prompt: largePrompt,
				modelPreferences: {
					preferLocal: true,
					allowCloud: true,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('cloud');
			expect(result.decision.routingReason).toContain('Large context');
			expect(result.decision.estimatedCost).toBeGreaterThan(0);
			expect(result.metadata.fallbackUsed).toBe(true);
			expect(result.audit.routingPath).toEqual(['cloud']);
		});

		it('should burst to cloud for low latency requirements (<1500ms)', async () => {
			// Given
			const request = {
				prompt: 'Fast response needed',
				modelPreferences: {
					preferLocal: true,
					allowCloud: true,
					maxLatencyMs: 1000,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('cloud');
			expect(result.decision.routingReason).toContain('Low latency');
			expect(result.decision.estimatedLatencyMs).toBeLessThan(1500);
			expect(result.metadata.fallbackUsed).toBe(true);
		});

		it('should not burst to cloud when cloud is disabled', async () => {
			// Given
			const largePrompt = 'A'.repeat(25000);
			const request = {
				prompt: largePrompt,
				modelPreferences: {
					preferLocal: true,
					allowCloud: false,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.metadata.fallbackUsed).toBe(false);
		});

		it('should select optimal cloud model when bursting', async () => {
			// Given
			const request = {
				prompt: 'A'.repeat(25000),
				modelPreferences: {
					preferLocal: true,
					allowCloud: true,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('cloud');
			expect(['gpt-4-cloud', 'claude-cloud']).toContain(result.decision.modelId);
			expect(result.decision.confidence).toBeGreaterThan(0.7);
			expect(result.performance.slaMet).toBe(true);
		});
	});

	describe('Privacy Mode Enforcement', () => {
		it('should enforce local-only routing in privacy mode', async () => {
			// Given
			const request = {
				prompt: 'Private data question',
				privacyMode: true,
				modelPreferences: {
					preferLocal: false,
					allowCloud: true,
				},
				evidenceRequired: true,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.modelId).toBe('mlx-local');
			expect(result.decision.privacyEnforced).toBe(true);
			expect(result.audit.policiesApplied).toContain('privacy-mode');
		});

		it('should mask PII in privacy mode', async () => {
			// Given
			const request = {
				prompt: 'Contact me at user@example.com or call 555-123-4567',
				privacyMode: true,
				evidenceRequired: true,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.privacyEnforced).toBe(true);
			// Check that the prompt was masked (would need to examine the filtered request)
			expect(result.metadata.privacyCheck).toBeGreaterThan(0);
		});

		it('should block cloud access entirely in strict privacy mode', async () => {
			// Given
			const request = {
				prompt: 'A'.repeat(25000), // Large context
				privacyMode: true,
				modelPreferences: {
					allowCloud: true,
				},
				evidenceRequired: true,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.privacyEnforced).toBe(true);
			expect(result.audit.policiesApplied).toContain('privacy-mode');
			expect(result.audit.policiesApplied).toContain('cloud-access-blocked');
		});
	});

	describe('Thermal-Aware Routing', () => {
		it('should prefer local models when thermal conditions are critical', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 95,
				trend: 'rising',
				zone: 'critical',
				critical: true,
			});

			const request = {
				prompt: 'Question during thermal stress',
				modelPreferences: {
					preferLocal: false,
					allowCloud: true,
				},
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('local');
			expect(result.decision.thermalConstrained).toBe(true);
			expect(result.decision.routingReason).toContain('thermal');
			expect(result.metadata.thermalCheck).toBeGreaterThan(0);
		});

		it('should throttle operations during elevated thermal conditions', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 82,
				trend: 'stable',
				zone: 'elevated',
				critical: false,
			});

			const request = {
				prompt: 'Question in elevated thermal conditions',
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.thermalConstrained).toBe(true);
			expect(result.decision.modelType).toBe('local');
			expect(result.metadata.thermalCheck).toBeGreaterThan(0);
		});

		it('should maintain normal routing when thermal conditions are optimal', async () => {
			// Given
			mockThermalMonitor.getCurrentTemperature.mockResolvedValue({
				currentTemp: 65,
				trend: 'stable',
				zone: 'optimal',
				critical: false,
			});

			const request = {
				prompt: 'Normal thermal condition question',
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.thermalConstrained).toBe(false);
			expect(result.decision.modelType).toBe('local');
			expect(result.metadata.thermalCheck).toBeGreaterThan(0);
		});
	});

	describe('Evidence Compliance', () => {
		it('should validate evidence compliance before routing', async () => {
			// Given
			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: true,
				policiesApplied: ['evidence-required'],
				evidence: { evidenceValid: true },
			});

			const request = {
				prompt: 'Evidence-compliant question',
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.evidenceCompliant).toBe(true);
			expect(result.metadata.evidenceValidation).toBeGreaterThan(0);
			expect(mockEvidenceGate.validateAccess).toHaveBeenCalled();
		});

		it('should block routing when evidence validation fails', async () => {
			// Given
			mockEvidenceGate.validateAccess.mockResolvedValue({
				granted: false,
				reason: 'Evidence validation failed',
				policiesApplied: ['evidence-required'],
			});

			const request = {
				prompt: 'Evidence-non-compliant question',
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.metadata.errors).toBeDefined();
			expect(result.metadata.errors?.[0]).toContain('Evidence validation failed');
			expect(result.decision.evidenceCompliant).toBe(false);
		});

		it('should skip evidence validation when not required', async () => {
			// Given
			const request = {
				prompt: 'No evidence required question',
				evidenceRequired: false,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.evidenceCompliant).toBe(true);
			expect(mockEvidenceGate.validateAccess).not.toHaveBeenCalled();
		});
	});

	describe('Performance and SLA', () => {
		it('should meet SLA requirements for standard requests', async () => {
			// Given
			const request = {
				prompt: 'Standard performance test',
				evidenceRequired: true,
				privacyMode: false,
			};

			const startTime = Date.now();

			// When
			const result = await hybridRouter.route(request);

			const duration = Date.now() - startTime;

			// Then - This should FAIL until implementation
			expect(result.performance.slaMet).toBe(true);
			expect(result.performance.actualLatency).toBeLessThanOrEqual(result.performance.latencySLO);
			expect(duration).toBeLessThan(100); // Fast routing decision
		});

		it('should track costs for cloud model usage', async () => {
			// Given
			const request = {
				prompt: 'A'.repeat(25000), // Large enough to trigger cloud burst
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.decision.modelType).toBe('cloud');
			expect(result.metadata.actualCost).toBeGreaterThan(0);
			expect(result.performance.withinBudget).toBe(true);
		});

		it('should provide comprehensive audit trail', async () => {
			// Given
			const request = {
				prompt: 'Audit trail test',
				evidenceRequired: true,
				privacyMode: false,
				userId: 'user123',
			};

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.audit).toBeDefined();
			expect(result.audit.requestId).toBeDefined();
			expect(result.audit.userId).toBe('user123');
			expect(result.audit.timestamp).toBeDefined();
			expect(result.audit.modelUsed).toBeDefined();
			expect(result.audit.routingPath).toBeDefined();
			expect(result.audit.policiesApplied).toBeDefined();
			expect(result.audit.brainwavAudited).toBe(true);
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid requests gracefully', async () => {
			// Given
			const invalidRequest = {
				prompt: '', // Invalid empty prompt
				evidenceRequired: true,
				privacyMode: false,
			};

			// When
			const result = await hybridRouter.route(invalidRequest);

			// Then - This should FAIL until implementation
			expect(result.metadata.errors).toBeDefined();
			expect(result.metadata.errors?.length).toBeGreaterThan(0);
		});

		it('should handle model adapter unavailability', async () => {
			// Given
			const request = {
				prompt: 'Test with no available models',
				evidenceRequired: true,
				privacyMode: false,
			};

			// Mock no available adapters
			hybridRouter.registerModelAdapter(createMockAdapter('unavailable', 'local', false));

			// When
			const result = await hybridRouter.route(request);

			// Then - This should FAIL until implementation
			expect(result.metadata.errors).toBeDefined();
			expect(result.metadata.errors?.[0]).toContain('No available model adapters');
		});
	});
});

function createMockAdapter(
	id: string,
	type: 'local' | 'cloud',
	available: boolean = true,
): ModelAdapter {
	return {
		id,
		name: `${type} model ${id}`,
		type,
		available,
		performance: {
			avgLatencyMs: type === 'local' ? 200 : 500,
			maxTokens: type === 'local' ? 8000 : 128000,
			throughput: type === 'local' ? 5 : 15,
		},
		capabilities: {
			maxContextLength: type === 'local' ? 8000 : 128000,
			supportsStreaming: true,
			supportsFunctionCalling: type === 'cloud',
		},
		cost: {
			costPer1KTokens: type === 'local' ? 0 : 0.01,
			currency: 'USD',
		},
	};
}
