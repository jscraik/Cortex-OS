import { describe, expect, it } from 'vitest';
import { AgentEventSchema, EventName, Phase, validateAgentEvent } from '../src/types';

describe('brAInwav Telemetry Types', () => {
	describe('AgentEvent Schema Validation', () => {
		it('should validate complete AgentEvent with all required fields', () => {
			const validEvent = {
				timestamp: '2025-01-12T10:00:00Z',
				agentId: 'brAInwav-cortex-agent-1',
				phase: 'execution' as const,
				event: 'tool_invoked' as const,
				correlationId: 'brAInwav-session-123',
			};

			expect(() => AgentEventSchema.parse(validEvent)).not.toThrow();
			const parsed = AgentEventSchema.parse(validEvent);
			expect(parsed.agentId).toBe('brAInwav-cortex-agent-1');
		});

		it('should reject invalid AgentEvent with missing required fields and include brAInwav context', () => {
			const invalidEvent = {
				timestamp: '2025-01-12T10:00:00Z',
				// missing agentId
				phase: 'execution',
				event: 'tool_invoked',
				correlationId: 'test-123',
			};

			expect(() => validateAgentEvent(invalidEvent)).toThrow('[brAInwav]');
		});

		it('should validate all EventName enum values', () => {
			const eventNames = [
				'run_started',
				'run_finished',
				'plan_created',
				'plan_revised',
				'reroute',
				'tool_invoked',
				'tool_result',
			];

			eventNames.forEach((eventName) => {
				expect(() => EventName.parse(eventName)).not.toThrow();
			});
		});

		it('should validate all Phase enum values', () => {
			const phases = ['planning', 'execution', 'completion'];

			phases.forEach((phase) => {
				expect(() => Phase.parse(phase)).not.toThrow();
			});
		});

		it('should accept optional fields labels, metrics, outcome', () => {
			const eventWithOptionals = {
				timestamp: '2025-01-12T10:00:00Z',
				agentId: 'brAInwav-test-agent',
				phase: 'completion' as const,
				event: 'run_finished' as const,
				correlationId: 'brAInwav-run-456',
				labels: { tool: 'arxiv-search', brAInwav: 'test-execution' },
				metrics: { duration_ms: 150, cpu_usage: 0.23 },
				outcome: { status: 'success', results: 5 },
			};

			expect(() => AgentEventSchema.parse(eventWithOptionals)).not.toThrow();
		});
	});
});
