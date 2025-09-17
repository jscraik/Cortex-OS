import { describe, expect, it, vi } from 'vitest';

import { requiresApproval } from '../src/lib/hitl.js';

describe('HITL heuristics', () => {
	it('requires approval for sensitive data classifications', () => {
		expect(requiresApproval({ dataClass: 'sensitive' })).toBe(true);
	});

	it('treats workspace relative paths as safe by default', () => {
		const cwd = process.cwd();
		expect(requiresApproval({ path: `${cwd}/logs/output.txt` })).toBe(false);
	});

	it('flags paths outside the workspace', () => {
		const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/workspace/app');
		expect(requiresApproval({ path: '/tmp/data.txt' })).toBe(true);
		cwdSpy.mockRestore();
	});
});
