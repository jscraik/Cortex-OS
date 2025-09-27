import { describe, expect, it } from 'vitest';
import { AgentToolkitMCPTools } from '../../src/mcp/AgentToolkitMCPTools.js';
import type { MCPEvent } from '../../src/mcp/types.js';

const makeEventBus = (sink: MCPEvent[]) => ({
	emit: (event: MCPEvent) => sink.push(event),
});

const findEvent = (events: MCPEvent[], type: string) => events.find((e) => e.type === type);

describe('AgentToolkitMCPTools emits contextSummary when available', () => {
	it('includes contextSummary in multiSearch results event when context is available', async () => {
		const events: MCPEvent[] = [];
		const tools = new AgentToolkitMCPTools(undefined, makeEventBus(events));
		const tool = tools.getTool('agent_toolkit_multi_search');
		expect(tool).toBeTruthy();
		if (!tool) throw new Error('multiSearch tool not found');

		const res = await tool.handler({ pattern: 'class', path: '.' });
		expect(res.success).toBe(true);

		const resultsEvent = findEvent(events, 'agent_toolkit.search.results');
		expect(resultsEvent).toBeTruthy();
		const data = (
			resultsEvent as MCPEvent<{
				contextSummary?: { totalTokens: number; files: Array<{ file: string; tokens: number }> };
			}>
		).data;
		// Verify optional contextSummary shape
		expect(data.contextSummary).toBeDefined();
		if (data.contextSummary) {
			expect(typeof data.contextSummary.totalTokens).toBe('number');
			expect(Array.isArray(data.contextSummary.files)).toBe(true);
			expect(data.contextSummary.files.length).toBeGreaterThan(0);
		}
	});

	it('includes contextSummary in validation report event when smart validation is available', async () => {
		const events: MCPEvent[] = [];
		const tools = new AgentToolkitMCPTools(undefined, makeEventBus(events));
		const tool = tools.getTool('agent_toolkit_validate');
		expect(tool).toBeTruthy();
		if (!tool) throw new Error('validate tool not found');

		const res = await tool.handler({ files: ['README.md'] });
		expect(typeof res.success).toBe('boolean');

		const reportEvent = findEvent(events, 'agent_toolkit.validation.report');
		expect(reportEvent).toBeTruthy();
		const data = (
			reportEvent as MCPEvent<{ contextSummary?: Array<{ file: string; tokens: number }> }>
		).data;
		expect(data.contextSummary).toBeDefined();
		expect(Array.isArray(data.contextSummary)).toBe(true);
		if (Array.isArray(data.contextSummary) && data.contextSummary.length > 0) {
			expect(typeof data.contextSummary[0].file).toBe('string');
			expect(typeof data.contextSummary[0].tokens).toBe('number');
		}
	});
});
