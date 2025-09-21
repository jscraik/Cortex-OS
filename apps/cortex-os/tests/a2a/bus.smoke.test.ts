import { createEnvelope, type Envelope } from '@cortex-os/a2a-contracts/envelope';
import { describe, expect, it } from 'vitest';
import { CORTEX_OS_EVENT_SOURCE, createCortexOsBus } from '../../src/a2a';

/**
 * Minimal smoke test for A2A bus with ACL + schema registry
 */

describe('A2A bus (inproc) with schema registry + ACL', () => {
	it('publishes and subscribes to a health event with valid envelope', async () => {
		const { bus, schemaRegistry } = createCortexOsBus();
		const observed: Envelope[] = [];

		const unbind = await bus.bind([
			{
				type: 'cortex.health.check',
				handle: async (env) => {
					observed.push(env);
				},
			},
		]);

		// Build a valid envelope via helper (ensures id/time/spec fields)
		const env = createEnvelope({
			type: 'cortex.health.check',
			source: CORTEX_OS_EVENT_SOURCE,
			data: { status: 'ok', timestamp: Date.now(), version: 'test' },
		});
		await bus.publish(env);

		await new Promise((r) => setTimeout(r, 10));

		expect(observed.length).toBe(1);
		// schema-registry should resolve the event schema
		const schema = schemaRegistry.getSchemaByVersion('cortex.health.check', '1.0.0');
		expect(schema).toBeTruthy();

		await unbind();
	});
});
