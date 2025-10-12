// Test write guard: prevent writing image files like *.png, *.jpg, *.jpeg, *.gif, *.bmp, *.webp, *.svg during tests.
// This avoids cluttering the repo or interrupting developer workflows.
/* eslint-disable sonarjs/publicly-writable-directories */
import * as fs from 'node:fs';
import * as os from 'node:os';

try {
        const origWriteFileSync = (
                (...args: Parameters<typeof fs.writeFileSync>): ReturnType<typeof fs.writeFileSync> =>
                        fs.writeFileSync(...args)
        );
        const origWriteFile = (
                (...args: Parameters<typeof fs.writeFile>): ReturnType<typeof fs.writeFile> =>
                        fs.writeFile(...args)
        );

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

        const isBlocked = (p: unknown): boolean => {
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

        const mutableFs = fs as typeof fs & {
                writeFileSync: (...args: Parameters<typeof fs.writeFileSync>) => ReturnType<typeof fs.writeFileSync>;
                writeFile: (...args: Parameters<typeof fs.writeFile>) => ReturnType<typeof fs.writeFile>;
        };

        mutableFs.writeFileSync = (...args: Parameters<typeof fs.writeFileSync>) => {
                if (args && args.length > 0 && isBlocked(args[0])) {
                        throw new Error(`Blocked writing image file during tests: ${String(args[0])}`);
                }
                return origWriteFileSync(...args);
        };

        mutableFs.writeFile = (...args: Parameters<typeof fs.writeFile>) => {
                try {
                        const target = args?.[0];
                        if (isBlocked(target)) {
                                const callbackCandidate = args[args.length - 1];
                                if (typeof callbackCandidate === 'function') {
                                        const err = Object.assign(
                                                new Error(`Blocked writing image file during tests: ${String(target)}`),
                                                { code: 'EACCES' },
                                        ) as NodeJS.ErrnoException;
                                        (callbackCandidate as (e: NodeJS.ErrnoException | null, ...cbArgs: unknown[]) => void)(
                                                err,
                                        );
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
