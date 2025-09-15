import { describe, expect, it } from 'vitest';

import { SimplePRPGraph } from './index.js';

describe('mvp public API', () => {
	it('exposes SimplePRPGraph implementation', () => {
		expect(SimplePRPGraph).toBeTruthy();
	});
});
