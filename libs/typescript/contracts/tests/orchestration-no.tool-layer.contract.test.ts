import { describe, expect, it } from 'vitest';
import {
	ToolCapabilitySchema,
	ToolInvokeRequestSchema,
	ToolLayerSchema,
	ToolManifestSchema,
	ToolResultSchema,
} from '../src/orchestration-no/tool-layer.js';

describe('contract: ToolLayer', () => {
	it('declares multi-level tool layer with invocation contracts', () => {
		const manifest = { name: 'visualize-execution-graph', level: 'dashboard' };
		const request = { tool: 'visualize-execution-graph', params: { planId: 'p1' } };
		const result = { ok: true, type: 'visualization', data: {} };

		expect(
			ToolManifestSchema.safeParse({ ...manifest, capabilities: ['visualization'] }).success,
		).toBe(true);
		expect(ToolInvokeRequestSchema.safeParse(request).success).toBe(true);
		expect(ToolResultSchema.safeParse(result).success).toBe(true);
		expect(ToolLayerSchema).toBeDefined();
		expect(ToolCapabilitySchema).toBeDefined();
		expect(ToolResultSchema).toBeDefined();
	});
});
