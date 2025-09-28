import { describe, expect, it, vi } from 'vitest';
import { run, type Workflow } from '../executor.js';

const recordOperation = vi.fn();
const recordLatency = vi.fn();
const generateRunId = vi.fn(() => 'retry-run');

vi.mock('@cortex-os/observability', () => ({
	generateRunId,
	recordLatency,
	recordOperation,
}));

describe('executor retry telemetry', () => {
	it('records retry metrics for failed and successful attempts', async () => {
		const attempts: number[] = [];
		const workflow: Workflow = {
			graph: { step: [] },
			steps: {
				step: async () => {
					attempts.push(Date.now());
					if (attempts.length === 1) {
						throw new Error('transient failure');
					}
				},
			},
		};

		await run(workflow, {
			retry: {
				step: { maxRetries: 2, backoffMs: 0 },
			},
			workflowId: 'wf-telemetry',
		});

		expect(recordOperation).toHaveBeenCalledWith(
			'services.orchestration.retry',
			false,
			'retry-run',
			expect.objectContaining({
				step: 'step',
				attempt: '1',
				outcome: 'failure',
			}),
		);
		expect(recordOperation).toHaveBeenCalledWith(
			'services.orchestration.retry',
			true,
			'retry-run',
			expect.objectContaining({
				step: 'step',
				attempt: '2',
				outcome: 'success',
			}),
		);
		expect(recordLatency).toHaveBeenCalledTimes(2);
	});
});
