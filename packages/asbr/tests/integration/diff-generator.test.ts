/**
 * Regression test for DiffGenerator against fixtures
 */

// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/config.js';
import { createDiffGenerator } from '../../src/diff/generator.js';

describe('DiffGenerator regression', () => {
	it('produces diff matching fixture', async () => {
		const [oldContent, newContent, expectedJson] = await Promise.all([
			readFile(new URL('../fixtures/diff/simple/old.txt', import.meta.url), 'utf8'),
			readFile(new URL('../fixtures/diff/simple/new.txt', import.meta.url), 'utf8'),
			readFile(new URL('../fixtures/diff/simple/expected.json', import.meta.url), 'utf8'),
		]);

		const expected = JSON.parse(expectedJson);

		const generator = await createDiffGenerator(DEFAULT_CONFIG);
		const result = generator.generateDiff(oldContent, newContent, 'file.txt', {
			includeFileHeaders: false,
		});

		expect(result).toEqual(expected);
	});
});
