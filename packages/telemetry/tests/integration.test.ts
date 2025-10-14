import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRedactionFilter, Telemetry } from '../src/index';
import type { AgentEvent } from '../src/types';

describe('brAInwav Telemetry Integration Tests', () => {
	let mockBus: { publish: ReturnType<typeof vi.fn> };
	let telemetry: Telemetry;

	beforeEach(() => {
		mockBus = { publish: vi.fn() };
		telemetry = new Telemetry(mockBus, {
			topic: 'cortex.telemetry.agent.event',
			redaction: createRedactionFilter(),
		});
	});

	describe('End-to-End Workflow Tracking', () => {
		it('should track complete orchestration workflow with correlation', () => {
			const workflow = telemetry.phase('orchestration-test');

			// Start workflow
			workflow.started();

			// Emit tool events during workflow
			telemetry.emit({
				event: 'tool_invoked',
				agentId: 'brAInwav-integration-test',
				phase: 'execution',
				labels: {
					tool: 'search-service',
					brAInwav: 'integration-test',
				},
			});

			telemetry.emit({
				event: 'tool_result',
				agentId: 'brAInwav-integration-test',
				phase: 'execution',
				metrics: {
					duration_ms: 250,
					results_count: 5,
				},
			});

			// Finish workflow
			workflow.finished({
				status: 'success',
				total_duration_ms: 500,
				brAInwav: 'integration-complete',
			});

			// Verify all events published
			expect(mockBus.publish).toHaveBeenCalledTimes(4);

			// Verify workflow correlation
			const calls = mockBus.publish.mock.calls;
			const startEvent = calls[0][1] as AgentEvent;
			const finishEvent = calls[3][1] as AgentEvent;

			expect(startEvent.correlationId).toBe(finishEvent.correlationId);
			expect(startEvent.event).toBe('run_started');
			expect(finishEvent.event).toBe('run_finished');
		});

		it('should maintain privacy through redaction pipeline', () => {
			telemetry.emit({
				event: 'tool_invoked',
				agentId: 'brAInwav-privacy-test',
				phase: 'execution',
				labels: {
					tool: 'search',
					prompt: 'sensitive user query',
					query: 'confidential data',
					brAInwav: 'privacy-test',
				},
			});

			const publishedEvent = mockBus.publish.mock.calls[0][1] as AgentEvent;

			// Verify sensitive data redacted
			expect(publishedEvent.labels?.prompt).toBe('[brAInwav-REDACTED]');
			expect(publishedEvent.labels?.query).toBe('[brAInwav-REDACTED]');

			// Verify operational data preserved
			expect(publishedEvent.labels?.tool).toBe('search');
			expect(publishedEvent.labels?.brAInwav).toBe('privacy-test');
		});
	});

	describe('A2A Integration Simulation', () => {
		it('should emit events compatible with A2A schema', () => {
			telemetry.emit({
				event: 'run_started',
				agentId: 'brAInwav-a2a-test',
				phase: 'planning',
				correlationId: 'brAInwav-a2a-123',
				labels: {
					workflow: 'test-planning',
					brAInwav: 'a2a-integration',
				},
				metrics: {
					planning_start: Date.now(),
				},
			});

			expect(mockBus.publish).toHaveBeenCalledWith(
				'cortex.telemetry.agent.event',
				expect.objectContaining({
					timestamp: expect.any(String),
					agentId: 'brAInwav-a2a-test',
					phase: 'planning',
					event: 'run_started',
					correlationId: 'brAInwav-a2a-123',
				}),
			);
		});
	});

	describe('Error Resilience', () => {
		it('should handle bus publish failures gracefully', () => {
			const errorBus = {
				publish: vi.fn().mockImplementation(() => {
					throw new Error('Bus connection failed');
				}),
			};

			const resilientTelemetry = new Telemetry(errorBus);

			// Should not throw despite bus failure
			expect(() => {
				resilientTelemetry.emit({
					event: 'tool_invoked',
					agentId: 'brAInwav-error-test',
				});
			}).not.toThrow();
		});

		it('should handle invalid event data gracefully', () => {
			expect(() => {
				telemetry.emit({
					// Invalid: missing required fields
					event: undefined as unknown as 'run_started',
					agentId: null as unknown as string,
				});
			}).not.toThrow();
		});
	});

	describe('Performance Characteristics', () => {
		it('should emit events within performance budget', () => {
			const startTime = performance.now();

			// Emit multiple events
			for (let i = 0; i < 10; i++) {
				telemetry.emit({
					event: 'tool_invoked',
					agentId: `brAInwav-perf-test-${i}`,
					phase: 'execution',
				});
			}

			const duration = performance.now() - startTime;

			// Should complete within 50ms for 10 events
			expect(duration).toBeLessThan(50);
		});
	});
});
