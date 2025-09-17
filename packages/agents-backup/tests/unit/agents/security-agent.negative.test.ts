import { describe, expect, it } from 'vitest';
import { createSecurityAgent } from '../../../src/agents/security-agent.js';
import { createEventBus } from '../../../src/lib/event-bus.js';

// Minimal mock provider implementing generate returning benign JSON
const createBenignProvider = (text: string) => ({
	generate: async () => ({ text }),
});

const BENIGN_TEXT = JSON.stringify({
	decision: 'allow',
	risk: 'low',
	categories: [],
	findings: [],
	mitigations: [],
	labels: {
		owasp_llm10: [],
		mitre_attack: [],
		mitre_atlas: [],
		cwe: [],
		capec: [],
		d3fend: [],
	},
	confidence: 0.9,
});

describe('security-agent negative heuristic path', () => {
	it('returns allow decision with low/medium risk for benign content', async () => {
		const eventBus = createEventBus({ enableLogging: false });
		const provider = createBenignProvider(BENIGN_TEXT) as any;
		const mcpClient = {
			callTool: async () => ({}),
			listTools: async () => [],
			initialize: async () => {},
			isConnected: () => true,
		} as any;

		const agent = createSecurityAgent({
			provider,
			eventBus,
			mcpClient,
		});

		const res = await agent.execute({
			content: 'Simple greeting: Hello world',
			phase: 'prompt',
			context: { capability: 'security', piiPolicy: 'allow' },
			riskThreshold: 'medium',
		});

		expect(res.decision).toBe('allow');
		expect(['low', 'medium']).toContain(res.risk);
		expect(res.findings.length).toBe(0);
		expect(res.decision).not.toBe('block');
	});
});
