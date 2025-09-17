import { createTool } from '@voltagent/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CortexAgent } from '../src/CortexAgent';

describe('IToolRegistry lifecycle', () => {
	let agent: CortexAgent;

	beforeAll(() => {
		agent = new CortexAgent({ name: 'TestAgent' });
	});

	it('registers, retrieves, lists and unregisters tools', () => {
		const demo = createTool({
			id: 'demo.echo',
			name: 'demo.echo',
			description: 'Echo a message',
			parameters: z.object({ message: z.string() }),
			async execute(p) {
				return { content: p.message };
			},
		});

		expect(agent.has('demo.echo')).toBe(false);
		agent.register(demo);
		expect(agent.has('demo.echo')).toBe(true);
		expect(agent.get('demo.echo')?.name).toBe('demo.echo');
		expect(agent.list().some((t) => t.name === 'demo.echo')).toBe(true);

		const removed = agent.unregister('demo.echo');
		expect(removed).toBe(true);
		expect(agent.has('demo.echo')).toBe(false);
	});
});
