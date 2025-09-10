import { describe, expect, it } from 'vitest';
import { ExampleCaptureSystem } from '../src/teaching/example-capture.js';
import { resetIdCounter } from '../src/utils/id.js';

describe('ExampleCaptureSystem', () => {
	it('respects active capture flag', () => {
		const system = new ExampleCaptureSystem();
		system.setCapture(false);

		const blueprint = { title: 'Test', description: 'Test', requirements: [] };

		const result = system.captureExample(
			'workflow',
			{ prpPhase: 'strategy', blueprint, inputState: {} },
			{
				type: 'workflow_modification',
				description: 'noop',
				parameters: {},
				timestamp: new Date().toISOString(),
			},
			{ resultingState: {}, success: true, learningValue: 1 },
			{},
		);

		expect(result).toBeNull();
		expect(system.getExamples().length).toBe(0);
	});

	it('generates deterministic IDs when enabled', () => {
		resetIdCounter();
		const system = new ExampleCaptureSystem();
		const blueprint = { title: 'Test', description: 'Test', requirements: [] };

		const example = system.captureExample(
			'workflow',
			{ prpPhase: 'strategy', blueprint, inputState: {} },
			{
				type: 'workflow_modification',
				description: 'noop',
				parameters: {},
				timestamp: new Date().toISOString(),
			},
			{ resultingState: {}, success: true, learningValue: 1 },
			{},
			true,
		);

		expect(example?.id).toBe('example-000001');
	});
});
