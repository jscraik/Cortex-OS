import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/diff/generator.js', () => ({
	createDiffGenerator: vi.fn(),
	DiffGenerator: class {},
}));

vi.mock('diff', () => ({ createTwoFilesPatch: vi.fn() }));
vi.mock('pidusage', () => ({ default: vi.fn() }));

import { ASBR_RUNTIME_SENTINEL } from '../../src/index.js';

describe('runtime sentinel export', () => {
	it('remains truthy to ensure runtime artifacts emit', () => {
		expect(ASBR_RUNTIME_SENTINEL).toBe(true);
	});
});
