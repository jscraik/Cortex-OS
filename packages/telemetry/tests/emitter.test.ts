import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentEvent } from '../src/types';

// Since we're writing tests first (RED phase), these imports will fail initially
// This is expected TDD behavior - tests drive implementation
describe('brAInwav Telemetry Emitter (RED PHASE - TESTS FIRST)', () => {
	let mockBus: { publish: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockBus = { publish: vi.fn() };
	});

	describe('Core Emission Functionality', () => {
		it('should emit AgentEvent to default topic when emit() called', async () => {
			// This test will fail initially - that's expected in RED phase
			const { Telemetry } = await import('../src/emitter');

			const telemetry = new Telemetry(mockBus);
			const testEvent: Partial<AgentEvent> = {
				event: 'run_started',
				agentId: 'brAInwav-test-agent',
				phase: 'execution',
				correlationId: 'test-123',
			};

			telemetry.emit(testEvent);

			expect(mockBus.publish).toHaveBeenCalledWith(
				'cortex.a2a.events',
				expect.objectContaining({
					event: 'run_started',
					agentId: 'brAInwav-test-agent',
					timestamp: expect.any(String),
				}),
			);
		});

		it('should respect custom topic configuration', async () => {
			const { Telemetry } = await import('../src/emitter');

			const customTopic = 'cortex.custom.telemetry';
			const telemetry = new Telemetry(mockBus, { topic: customTopic });

			telemetry.emit({
				event: 'tool_invoked',
				agentId: 'brAInwav-custom-agent',
				phase: 'execution',
				correlationId: 'custom-456',
			});

			expect(mockBus.publish).toHaveBeenCalledWith(customTopic, expect.any(Object));
		});

		it('should apply redaction filter to sensitive labels with brAInwav context', async () => {
			const { Telemetry } = await import('../src/emitter');

			const redactionFilter = (event: AgentEvent): AgentEvent => ({
				...event,
				labels: event.labels
					? {
							...event.labels,
							prompt: '[brAInwav-REDACTED]',
						}
					: undefined,
			});

			const telemetry = new Telemetry(mockBus, { redaction: redactionFilter });

			telemetry.emit({
				event: 'tool_invoked',
				agentId: 'brAInwav-redaction-test',
				phase: 'execution',
				correlationId: 'redact-789',
				labels: {
					prompt: 'secret sensitive data',
					tool: 'search-tool',
				},
			});

			expect(mockBus.publish).toHaveBeenCalledWith(
				'cortex.a2a.events',
				expect.objectContaining({
					labels: expect.objectContaining({
						prompt: '[brAInwav-REDACTED]',
						tool: 'search-tool',
					}),
				}),
			);
		});

		it('should return phase helper with started/finished closures', async () => {
			const { Telemetry } = await import('../src/emitter');

			const telemetry = new Telemetry(mockBus);
			const phaseHelper = telemetry.phase('test-phase');

			expect(phaseHelper).toHaveProperty('started');
			expect(phaseHelper).toHaveProperty('finished');
			expect(typeof phaseHelper.started).toBe('function');
			expect(typeof phaseHelper.finished).toBe('function');
		});

		it('should emit phase events with correlation and timing', async () => {
			const { Telemetry } = await import('../src/emitter');

			const telemetry = new Telemetry(mockBus);
			const phaseHelper = telemetry.phase('orchestration-run');

			// Call started
			phaseHelper.started();

			// Call finished with outcome
			const outcome = {
				status: 'success',
				duration_ms: 150,
				brAInwav: 'test-completion',
			};
			phaseHelper.finished(outcome);

			// Should emit two events with same correlation ID
			expect(mockBus.publish).toHaveBeenCalledTimes(2);

			// Check started event
			expect(mockBus.publish).toHaveBeenNthCalledWith(
				1,
				'cortex.a2a.events',
				expect.objectContaining({
					event: 'run_started',
					phase: 'orchestration-run',
				}),
			);

			// Check finished event
			expect(mockBus.publish).toHaveBeenNthCalledWith(
				2,
				'cortex.a2a.events',
				expect.objectContaining({
					event: 'run_finished',
					outcome: expect.objectContaining({
						status: 'success',
						brAInwav: 'test-completion',
					}),
				}),
			);

			// Verify same correlation ID
			const startedCall = mockBus.publish.mock.calls[0][1] as AgentEvent;
			const finishedCall = mockBus.publish.mock.calls[1][1] as AgentEvent;
			expect(startedCall.correlationId).toBe(finishedCall.correlationId);
		});

		it('should handle bus publish errors gracefully with brAInwav error context', async () => {
			const { Telemetry } = await import('../src/emitter');

			const errorBus = {
				publish: vi.fn().mockImplementation(() => {
					throw new Error('Bus publish failed');
				}),
			};

			const telemetry = new Telemetry(errorBus);

			// Should not throw - errors should be caught and logged
			expect(() => {
				telemetry.emit({
					event: 'tool_invoked',
					agentId: 'brAInwav-error-test',
					phase: 'execution',
					correlationId: 'error-123',
				});
			}).not.toThrow();
		});
	});

	describe('Validation and Error Handling', () => {
		it('should validate AgentEvent before emission with brAInwav error context', async () => {
			const { Telemetry } = await import('../src/emitter');

			const telemetry = new Telemetry(mockBus);

			// Invalid event missing required fields
			expect(() => {
				telemetry.emit({
					event: 'tool_invoked',
					// missing agentId, phase, correlationId
				});
			}).toThrow('[brAInwav]');
		});

		it('should include brAInwav context in all emitted events', async () => {
			const { Telemetry } = await import('../src/emitter');

			const telemetry = new Telemetry(mockBus);

			telemetry.emit({
				event: 'run_started',
				agentId: 'brAInwav-context-test',
				phase: 'planning',
				correlationId: 'context-456',
			});

			expect(mockBus.publish).toHaveBeenCalledWith(
				'cortex.a2a.events',
				expect.objectContaining({
					agentId: expect.stringContaining('brAInwav'),
				}),
			);
		});
	});
});
