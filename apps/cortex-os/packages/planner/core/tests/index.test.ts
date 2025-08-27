import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configManager } from '../src/config.js';
import { listAdapters, setCurrent, getCurrent, formatCurrent } from '../src/models.js';
import { PermissionEngine } from '../src/permission.js';

let originalConfig: any;

beforeEach(async () => {
  originalConfig = await configManager.getAll();
});

afterEach(async () => {
  await configManager.reset();
});

describe('ConfigManager', () => {
  it('sets and retrieves values', async () => {
    await configManager.set('test.value', 42);
    const val = await configManager.getValue('test.value');
    expect(val).toBe(42);
  });
});

describe('Models', () => {
  it('manages current model', async () => {
    const adapters = await listAdapters();
    expect(adapters.some(a => a.id === 'mlx')).toBe(true);
    await setCurrent('openai', 'gpt-4o-mini');
    const current = await getCurrent();
    expect(formatCurrent(current)).toBe('openai:gpt-4o-mini');
  });
});

describe('PermissionEngine', () => {
  it('skips execution in plan mode', async () => {
    const { executed } = await PermissionEngine.guardShell(
      'noop',
      () => Promise.resolve('ok'),
      { modeOverride: 'plan', logger: { info: () => {}, warn: () => {} } }
    );
    expect(executed).toBe(false);
  });

  it('executes in auto mode', async () => {
    const { executed, result } = await PermissionEngine.guardShell(
      'noop',
      () => Promise.resolve('ok'),
      { modeOverride: 'auto', logger: { info: () => {}, warn: () => {} } }
    );
    expect(executed).toBe(true);
    expect(result).toBe('ok');
  });
});
