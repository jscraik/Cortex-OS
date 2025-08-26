import { expect, test } from 'vitest';
import cfg from '../../.mcp.config.json';

test('network is off by default', () => {
  expect(cfg.network).toBe('off');
});

test('no server grants shell', () => {
  for (const s of cfg.servers) expect(s.shell).not.toBe(true);
});
