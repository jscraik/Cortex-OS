import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('build output', () => {
  it('includes compiled ASBR dist', () => {
    const distPath = resolve(__dirname, '../../dist/index.js');
    expect(existsSync(distPath)).toBe(true);
  });
});
