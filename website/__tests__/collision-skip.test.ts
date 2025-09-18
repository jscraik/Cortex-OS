import { describe, expect, it } from 'vitest';
import { shouldSkipBaseFile } from '../sync-docs';

describe('shouldSkipBaseFile', () => {
	it('skips base file when index.md exists in target', () => {
		const skip = shouldSkipBaseFile({
			entryName: 'security.md',
			dirBase: 'security',
			existingTargetFiles: ['index.md'],
			fileNames: ['README.md', 'security.md'],
			collision: false,
		});
		expect(skip).toBe(true);
	});

	it('does not skip base file when index.md absent', () => {
		const skip = shouldSkipBaseFile({
			entryName: 'security.md',
			dirBase: 'security',
			existingTargetFiles: [],
			fileNames: ['security.md'],
			collision: false,
		});
		expect(skip).toBe(false);
	});
});
