import { describe, expect, it } from 'vitest';
import { createCerebrumGraph } from '../../src/langgraph/create-cerebrum-graph.js';
import { THERMAL_CTX_KEY } from '../../src/langgraph/state/thermal-history.js';
import { createThermalFixture } from './__fixtures__/mlx-telemetry.js';

describe('Thermal recovery', () => {
	it('resumes workflows with state integrity after temperatures normalize', async () => {
		const fixtures = createThermalFixture();
		let now = Date.parse(fixtures.critical.timestamp);
		const graph = createCerebrumGraph({ clock: () => now });

		const paused = await graph.invoke({
			input: 'status',
			ctx: {
				[THERMAL_CTX_KEY]: {
					pendingEvent: fixtures.critical,
				},
			},
		});

		const pausedCtx = paused.ctx?.[THERMAL_CTX_KEY] as Record<string, any> | undefined;
		expect(pausedCtx?.paused).toBe(true);

		now = Date.parse(fixtures.nominal.timestamp);
		const resumed = await graph.invoke({
			input: 'resume',
			ctx: {
				...paused.ctx,
				[THERMAL_CTX_KEY]: {
					...(pausedCtx ?? {}),
					pendingEvent: fixtures.nominal,
				},
			},
			budget: paused.budget,
			session: paused.session,
		});

		const resumedCtx = resumed.ctx?.[THERMAL_CTX_KEY] as Record<string, any> | undefined;
		expect(resumedCtx?.paused).toBe(false);
		expect(resumedCtx?.lastResponse?.action).toBe('resume');
		expect(resumed.selectedModel?.provider).toBe('mlx');
		expect(resumed.output).toBe('brAInwav routed via mlx');

		const telemetry = resumed.ctx?.telemetry as any[] | undefined;
		expect(telemetry).toBeTruthy();
	});
});
