import { expect, test } from 'vitest';
import { hasTty, isCi } from '../src/env.js';

test('hasTty detects TTY', () => {
	const mockProc: Pick<NodeJS.Process, 'stdin' | 'stdout'> = {
		// include fd to satisfy stricter ReadStream/WriteStream types in some TS configs
		stdin: { isTTY: true, fd: 0 } as unknown as NodeJS.ReadStream & { fd: 0 },
		stdout: { isTTY: true, fd: 1 } as unknown as NodeJS.WriteStream & { fd: 1 },
	};
	expect(hasTty(mockProc)).toBe(true);
});

test('isCi reads CI variable', () => {
	expect(isCi({ CI: 'true' })).toBe(true);
	expect(isCi({})).toBe(false);
});
