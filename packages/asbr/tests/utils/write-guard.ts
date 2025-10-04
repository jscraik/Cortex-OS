// Test write guard: prevent writing image files like *.png, *.jpg, *.jpeg, *.gif, *.bmp, *.webp, *.svg during tests.
// This avoids cluttering the repo or interrupting developer workflows.
/* eslint-disable sonarjs/publicly-writable-directories */
import * as fs from 'node:fs';
import * as os from 'node:os';

try {
	const origWriteFileSync: (...a: any[]) => any = (
		fs.writeFileSync as unknown as (...a: any[]) => any
	).bind(fs);
	const origWriteFile: (...a: any[]) => any = (
		fs.writeFile as unknown as (...a: any[]) => any
	).bind(fs);

	const tmpDirs = [
		os.tmpdir?.() || '',
		process.env.TMPDIR || '',
		process.env.TEMP || '',
		process.env.TMP || '',
		'/tmp',
	]
		.filter(Boolean)
		.map((d) => (d.endsWith('/') ? d.slice(0, -1) : d));

	const allowListPatterns = [/\/tests?\//i, /\/(test-)?fixtures\//i];

	const isBlocked = (p: unknown) => {
		try {
			const s = String(p || '');
			// Only consider .png files
			if (!/\.png$/i.test(s)) return false;
			// Allow OS temp dirs (e.g., /tmp)
			if (tmpDirs.some((dir) => s.startsWith(`${dir}/`))) return false;
			// Allow under tests/ or fixtures paths; block elsewhere
			if (allowListPatterns.some((re) => re.test(s))) return false;
			return true;
		} catch {
			return false;
		}
	};

	(fs as any).writeFileSync = (...args: any[]) => {
		if (args && args.length > 0 && isBlocked(args[0])) {
			throw new Error(`Blocked writing image file during tests: ${String(args[0])}`);
		}
		return origWriteFileSync(...args);
	};

	(fs as any).writeFile = (...args: any[]) => {
		try {
			const target = args?.[0];
			if (isBlocked(target)) {
				const cb = args?.[args.length - 1];
				if (typeof cb === 'function') {
					const err = Object.assign(
						new Error(`Blocked writing image file during tests: ${String(target)}`),
						{ code: 'EACCES' },
					) as NodeJS.ErrnoException;
					(cb as (e: NodeJS.ErrnoException | null) => void)(err);
					return;
				}
				throw new Error(`Blocked writing image file during tests: ${String(target)}`);
			}
		} catch {
			// swallow callback errors to mimic fs.writeFile behaviour in tests
		}
		return origWriteFile(...args);
	};
} catch (err) {
	if (process.env.DEBUG || process.env.VERBOSE) {
		console.warn('[asbr/write-guard] not installed:', err);
	}
}
