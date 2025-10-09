import { resolveTransport } from '@cortex-os/mcp-bridge/runtime/transport';
import { describe, expect, it } from 'vitest';

describe('resolveTransport', () => {
	it('returns HTTP when override is undefined', () => {
		const decision = resolveTransport(undefined);
		expect(decision.selected).toBe('http');
		expect(decision.warnings).toHaveLength(0);
	});

	it('respects explicit stdio override', () => {
		const decision = resolveTransport('stdio');
		expect(decision.selected).toBe('stdio');
		expect(decision.warnings).toHaveLength(0);
	});

	it('treats MCP_TRANSPORT=all as HTTP with warning', () => {
		const decision = resolveTransport('all');
		expect(decision.selected).toBe('http');
		expect(decision.warnings).toContain('preferAll');
	});

	it('warns and defaults to HTTP for unknown overrides', () => {
		const decision = resolveTransport('serial');
		expect(decision.selected).toBe('http');
		expect(decision.warnings).toContain('unknownOverride');
	});
});
