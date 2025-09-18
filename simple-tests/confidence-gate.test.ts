import { describe, expect, it } from 'vitest';
import { gateByConfidence } from '../src/lib/confidence-gate.js';

describe('gateByConfidence', () => {
	it('flags when confidence below threshold', () => {
		expect(gateByConfidence(0.4, 0.5)).toBe('needs escalation');
	});
	it('allows when confidence meets threshold', () => {
		expect(gateByConfidence(0.6, 0.5)).toBe('ok');
	});
});
