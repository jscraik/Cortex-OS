import { expect, test } from 'vitest';
import { hasTty, isCi } from '../src/env.js';

test('hasTty detects TTY', () => {
  const mockProc: Pick<NodeJS.Process, 'stdin' | 'stdout'> = {
    stdin: { isTTY: true } as unknown as NodeJS.ReadStream,
    stdout: { isTTY: true } as unknown as NodeJS.WriteStream,
  };
  expect(hasTty(mockProc)).toBe(true);
});

test('isCi reads CI variable', () => {
  expect(isCi({ CI: 'true' })).toBe(true);
  expect(isCi({})).toBe(false);
});
