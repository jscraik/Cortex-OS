import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runProcess } from '../src/lib/run-process.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures', 'long-running.js');

describe('runProcess', () => {
	it('parses JSON output', async () => {
		const res = await runProcess('node', ['-e', 'console.log(JSON.stringify({ a: 1 }))']);
		expect(res).toEqual({ a: 1 });
	});

	it('rejects on non-zero exit', async () => {
		await expect(
			runProcess('node', ['-e', 'process.stderr.write("fail"); process.exit(1)'], {
				parseJson: false,
			}),
		).rejects.toThrow(/fail/);
	});

	it('terminates after timeout', async () => {
		const start = Date.now();
		await expect(
			runProcess('node', [fixture], { timeoutMs: 100, parseJson: false }),
		).rejects.toThrow(/timed out/i);
		expect(Date.now() - start).toBeLessThan(2000);
	});
});
