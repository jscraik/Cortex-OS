import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCommand } from '../src/lib/runCommand.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures', 'long-running.js');

describe('runCommand', () => {
	it('terminates process after timeout', async () => {
		const start = Date.now();
		await expect(runCommand('node', [fixture], { timeoutMs: 100 })).rejects.toThrow(/timed out/i);
		expect(Date.now() - start).toBeLessThan(2000);
	});
});
