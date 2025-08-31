import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allowPipeline } from '../src/allowlist.js';
import { runPipeline } from '../src/runner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('runPipeline', () => {
  it('executes allowed pipeline', async () => {
    const entry = path.join(__dirname, 'fixtures', 'echo-worker.cjs');
    allowPipeline('echo');
    const result = await runPipeline({ id: 'echo', version: '0.1.0', entry, caps: { net: false, fs: false }, sha256: 'test' }, 'hi');
    expect(result).toBe('hi');
  });
});
