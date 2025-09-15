import { describe, expect, it } from 'vitest';
import { diagnosticsResultSchema } from '../src/diagnostics';

describe('contract: diagnosticsResultSchema', () => {
	it('validates a minimal ok result', () => {
		const sample = {
			timestamp: new Date().toISOString(),
			port_guard: { status: 'ok' },
			health: { status: 'ok', latencyMs: 12 },
			tunnel: { status: 'ok' },
			summary: { overall: 'ok' },
		};
		const parsed = diagnosticsResultSchema.parse(sample);
		expect(parsed.summary.overall).toBe('ok');
	});

	it('rejects invalid overall value', () => {
		const bad: unknown = {
			timestamp: new Date().toISOString(),
			port_guard: { status: 'ok' },
			health: { status: 'ok' },
			tunnel: { status: 'ok' },
			summary: { overall: 'great' },
		};
		expect(() => diagnosticsResultSchema.parse(bad)).toThrow();
	});

	it('allows degraded summary when a component errored', () => {
		const sample = {
			timestamp: new Date().toISOString(),
			port_guard: { status: 'freed', details: 'Killed PID 1234' },
			health: { status: 'error', details: 'Timeout' },
			tunnel: { status: 'ok' },
			summary: { overall: 'degraded' },
		};
		const parsed = diagnosticsResultSchema.parse(sample);
		expect(parsed.port_guard.status).toBe('freed');
	});
});
