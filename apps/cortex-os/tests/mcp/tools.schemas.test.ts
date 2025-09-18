import { describe, expect, it } from 'vitest';
import {
	ConfigSetInputSchema,
	RestartServiceInputSchema,
	RunWorkflowInputSchema,
	SystemStatusInputSchema,
} from '../../src/mcp/tools';

describe('MCP Tool Schemas', () => {
	it('validates system.status defaults', () => {
		const parsed = SystemStatusInputSchema.parse({});
		expect(parsed.include).toContain('services');
	});
	it('rejects invalid restart_service timeout', () => {
		expect(() => RestartServiceInputSchema.parse({ service: 'x', timeoutMs: 0 })).toThrow();
	});
	it('accepts run_workflow async default', () => {
		const parsed = RunWorkflowInputSchema.parse({ workflow: 'wf' });
		expect(parsed.async).toBe(true);
	});
	it('parses config.set with runtime scope default', () => {
		const parsed = ConfigSetInputSchema.parse({ key: 'A', value: 1 });
		expect(parsed.scope).toBe('runtime');
	});
});
