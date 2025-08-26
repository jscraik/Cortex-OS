import { upsert, readAll } from '@cortex-os/mcp-registry/fs-store';
import { expect, it } from 'vitest';

it('adds and reads servers', async () => {
  await upsert({ name: 't1', transport: 'https', endpoint: 'https://x' } as any);
  const all = await readAll();
  expect(all.some((s) => s.name === 't1')).toBe(true);
});
