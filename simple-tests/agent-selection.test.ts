import { describe, expect, it } from 'vitest';
import { type AgentInfo, buildAgentPrompt, parseAgentSelection } from '../src/lib/agent-selection.js';

describe('agent selection helpers', () => {
	const agents: AgentInfo[] = [
		{ id: 'agent1', capabilities: ['coding'], currentLoad: 20 },
		{ id: 'agent2', capabilities: ['testing'], currentLoad: 40 },
	];

	it('buildAgentPrompt structures task details', () => {
		const prompt = buildAgentPrompt('Implement feature', agents, 'high');
		expect(prompt).toContain('TASK: Implement feature');
		expect(prompt).toContain('URGENCY: high');
		expect(prompt).toContain('agent1: capabilities=[coding], load=20%');
		expect(prompt).toContain('agent2: capabilities=[testing], load=40%');
	});

	it('parseAgentSelection chooses mentioned agent', () => {
		const response = 'agent2 is best due to testing skills';
		const result = parseAgentSelection(response, agents);
		expect(result.agentId).toBe('agent2');
		expect(result.reasoning).toBe(response);
		expect(result.confidence).toBeCloseTo(0.7);
	});

	it('parseAgentSelection defaults to first agent when none mentioned', () => {
		const response = 'No agent mentioned';
		const result = parseAgentSelection(response, agents);
		expect(result.agentId).toBe('agent1');
	});
});
