import { describe, expect, it } from 'vitest';
import { AgentToolkitMCPTools } from '../../src/mcp/AgentToolkitMCPTools.js';
import type { MCPEvent } from '../../src/mcp/types.js';

const makeEventBus = (sink: MCPEvent[]) => ({
	emit: (event: MCPEvent) => {
		sink.push(event);
	},
});

const findEvent = (events: MCPEvent[], type: string) => events.find((e) => e.type === type);

describe('AgentToolkitMCPTools typed event emissions', () => {
	it('emits started and results for search', async () => {
		const events: MCPEvent[] = [];
		const bus = makeEventBus(events);
		const tools = new AgentToolkitMCPTools(undefined, bus);

		const tool = tools.getTool('agent_toolkit_search');
		expect(tool).toBeTruthy();
		const res = await tool?.handler({ pattern: 'TODO', path: '.' });
		expect(res.success).toBe(true);

		expect(findEvent(events, 'agent_toolkit.execution.started')).toBeTruthy();
		expect(findEvent(events, 'agent_toolkit.search.results')).toBeTruthy();
		const started = findEvent(events, 'agent_toolkit.execution.started')!;
		const results = findEvent(events, 'agent_toolkit.search.results')!;
		expect(started.timestamp).toBeInstanceOf(Date);
		expect(results.timestamp).toBeInstanceOf(Date);
	});

	it('emits started and results for multiSearch', async () => {
		const events: MCPEvent[] = [];
		const bus = makeEventBus(events);
		const tools = new AgentToolkitMCPTools(undefined, bus);

		const tool = tools.getTool('agent_toolkit_multi_search');
		expect(tool).toBeTruthy();
		const res = await tool?.handler({ pattern: 'class ', path: '.' });
		expect(res.success).toBe(true);

		expect(findEvent(events, 'agent_toolkit.execution.started')).toBeTruthy();
		expect(findEvent(events, 'agent_toolkit.search.results')).toBeTruthy();
	});

	it('emits code modification event for codemod', async () => {
		const events: MCPEvent[] = [];
		const bus = makeEventBus(events);
		const tools = new AgentToolkitMCPTools(undefined, bus);

		const tool = tools.getTool('agent_toolkit_codemod');
		expect(tool).toBeTruthy();
		const res = await tool?.handler({ find: 'foo', replace: 'bar', path: '.' });
		expect(res.success).toBe(true);

		expect(findEvent(events, 'agent_toolkit.execution.started')).toBeTruthy();
		expect(findEvent(events, 'agent_toolkit.code.modified')).toBeTruthy();
	});

	it('emits validation report for validate', async () => {
		const events: MCPEvent[] = [];
		const bus = makeEventBus(events);
		const tools = new AgentToolkitMCPTools(undefined, bus);

		const tool = tools.getTool('agent_toolkit_validate');
		expect(tool).toBeTruthy();
		const res = await tool?.handler({ files: ['packages/agents/src/mcp/AgentToolkitMCPTools.ts'] });
		expect(typeof res.success).toBe('boolean');

		expect(findEvent(events, 'agent_toolkit.execution.started')).toBeTruthy();
		expect(findEvent(events, 'agent_toolkit.validation.report')).toBeTruthy();
	});

	it('emits batchCompleted for batchSearch and batchValidate; emits batchFailed on validation error', async () => {
		const events: MCPEvent[] = [];
		const bus = makeEventBus(events);
		const tools = new AgentToolkitMCPTools(undefined, bus);

		// Completed events
		const r1 = await tools.batchSearch([{ pattern: 'TODO', path: '.' }]);
		expect(Array.isArray(r1)).toBe(true);
		expect(findEvent(events, 'agent_toolkit.batch.completed')).toBeTruthy();

		const r2 = await tools.batchValidate([['README.md']]);
		expect(Array.isArray(r2)).toBe(true);
		expect(findEvent(events, 'agent_toolkit.batch.completed')).toBeTruthy();

		// Failed event (trigger by passing a non-array to force a throw)
		const failingCall = tools.batchValidate(null as unknown as Array<string[]>);
		await expect(failingCall).rejects.toThrow();
		expect(findEvent(events, 'agent_toolkit.batch.failed')).toBeTruthy();
	});
});
