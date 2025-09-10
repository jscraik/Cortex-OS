import { describe, expect, it } from 'vitest';
import { DynamicSpeculativePlanner } from '@/lib/dsp.js';

describe('DynamicSpeculativePlanner', () => {
	it('adjusts speculation step based on success feedback', () => {
		const planner = new DynamicSpeculativePlanner({
			initialStep: 1,
			maxStep: 4,
		});
		expect(planner.currentStep).toBe(1);

		planner.update(true); // success -> increase
		expect(planner.currentStep).toBe(2);

		planner.update(true);
		expect(planner.currentStep).toBe(3);

		planner.update(false); // failure -> decrease
		expect(planner.currentStep).toBe(2);
	});
});
