import { describe, expect, it } from 'vitest';

import { loadPersona } from '../src/persona/persona-loader.js';

describe('Persona loader', () => {
	it('loads cerebrum persona YAML with required sections', async () => {
		const p = await loadPersona();
		expect(p.name?.toLowerCase()).toContain('cerebrum');
		expect(p.policies?.length).toBeGreaterThan(0);
	});
});
