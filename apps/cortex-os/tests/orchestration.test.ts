import { describe, expect, test } from 'vitest';
import { provideOrchestration } from '../src/services.js';

describe('orchestration service', () => {
	test('creates engine', () => {
		const engine = provideOrchestration();
		expect(engine).toHaveProperty('config');
	});
});
