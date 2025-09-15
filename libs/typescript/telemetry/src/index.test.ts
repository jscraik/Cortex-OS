/// <reference types="vitest" />
import { createCounter, meter, tracer, withSpan } from './index';

describe('telemetry basic', () => {
	it('provides tracer and meter singletons', () => {
		expect(tracer).toBeDefined();
		expect(meter).toBeDefined();
	});

	it('creates counter and records span', async () => {
		const counter = createCounter('test_counter');
		expect(counter).toBeDefined();
		const result = await withSpan('test-span', async (span) => {
			span.setAttribute('test.attr', 'value');
			counter.add(1);
			return 42;
		});
		expect(result).toBe(42);
	});
});
