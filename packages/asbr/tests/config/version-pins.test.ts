import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadVersionPins } from '../../src/core/config.js';
import { ValidationError } from '../../src/types/index.js';

describe('loadVersionPins', () => {
	it('throws ValidationError for malformed version pins', async () => {
		const original = process.env.XDG_CONFIG_HOME;
		const tmp = await mkdtemp(join(tmpdir(), 'asbr-test-'));
		process.env.XDG_CONFIG_HOME = tmp;
		try {
			const configDir = join(tmp, 'cortex', 'asbr');
			await mkdir(configDir, { recursive: true });
			await writeFile(join(configDir, 'version-pins.yaml'), 'foo: 1.0\n', 'utf-8');
			await expect(loadVersionPins()).rejects.toBeInstanceOf(ValidationError);
		} finally {
			if (original !== undefined) {
				process.env.XDG_CONFIG_HOME = original;
			} else {
				delete process.env.XDG_CONFIG_HOME;
			}
		}
	});
});
