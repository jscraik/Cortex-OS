import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const pathFromRepo = (...segments: string[]): string => join(repoRoot, ...segments);

describe('RAG legacy adapters', () => {
	it('packages/rag/src/adapters should not exist', () => {
		const adaptersPath = pathFromRepo('packages', 'rag', 'src', 'adapters');
		expect(existsSync(adaptersPath)).toBe(false);
	});
});
