import { byChars } from '@cortex-os/rag/chunk';
import { expect, it } from 'vitest';

it('chunks with overlap', () => {
	const out = byChars('a'.repeat(1000), 300, 50);
	expect(out[0].length).toBe(300);
	expect(out.length).toBeGreaterThan(3);
});
