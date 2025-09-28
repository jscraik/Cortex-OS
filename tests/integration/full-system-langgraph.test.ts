import { beforeEach, describe, expect, it } from 'vitest';
import { bootstrapLanggraphTestHarness } from '../setup/langgraph-integration.js';
import { ensureBrandedLogs, loadFullSystemFixture } from '../utils/langgraph-integration.js';

describe('LangGraph full-system integration', () => {
	let harness = bootstrapLanggraphTestHarness();

	beforeEach(() => {
		harness = bootstrapLanggraphTestHarness();
	});

	it('executes the cerebrum graph end-to-end', async () => {
		const fixture = loadFullSystemFixture();
		harness.thermal.setState(fixture.thermalState);
		const result = await harness.run(fixture.input, { streaming: fixture.streaming });

		expect(result.output).toBe(fixture.expectedOutput);
		expect(result.summary.streaming).toBe(true);
		expect(result.summary.selectedModel?.model).toBe('placeholder');
		expect(result.events.at(-1)?.topic).toBe('brAInwav.workflow.completed');
		expect(result.websocket).toHaveLength(1);
		expect(() => ensureBrandedLogs(result.logs)).not.toThrow();
	});

	it('surfaces execution summaries through harness callbacks', async () => {
		const fixture = loadFullSystemFixture();
		let observedStreaming = false;
		const result = await harness.run(
			{ input: fixture.input, task: 'integration-telemetry' },
			{
				streaming: true,
				onSummary: (summary) => {
					observedStreaming = summary.streaming;
				},
			},
		);

		expect(observedStreaming).toBe(true);
		expect(result.summary.thermalState).toBe('nominal');
		expect(result.logs.some((entry) => entry.includes('completed'))).toBe(true);
	});
});
