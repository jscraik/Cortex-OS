import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (!process.env.CORTEX_OS_TMP) {
	const root = mkdtempSync(join(tmpdir(), 'cortex-os-root-'));
	process.env.CORTEX_OS_TMP = root;
	process.once('exit', () => {
		try {
			rmSync(root, { recursive: true, force: true });
		} catch (error) {
			console.warn('Failed to cleanup CORTEX_OS_TMP', error);
		}
	});
}
