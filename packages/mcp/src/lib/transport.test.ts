import commandExists from 'command-exists';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransport } from './transport.js';

vi.mock('command-exists', () => ({ default: vi.fn() }));

const commandExistsMock = commandExists as unknown as Mock;

describe('transport connect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('connects on POSIX when command exists', async () => {
    commandExistsMock.mockResolvedValue(true);
    const t = createTransport({ type: 'stdio', command: 'echo' });
    await expect(t.connect()).resolves.toBeUndefined();
    expect(t.isConnected()).toBe(true);
  });

  it('throws on POSIX when command missing', async () => {
    commandExistsMock.mockRejectedValue(new Error('not found'));
    const t = createTransport({ type: 'stdio', command: 'missing' });
    await expect(t.connect()).rejects.toThrow('Command not found');
  });

  it('connects on Windows when command exists', async () => {
    const platform = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    commandExistsMock.mockResolvedValue(true);
    const t = createTransport({ type: 'stdio', command: 'echo' });
    await expect(t.connect()).resolves.toBeUndefined();
    platform.mockRestore();
  });

  it('throws on Windows when command missing', async () => {
    const platform = vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    commandExistsMock.mockRejectedValue(new Error('not found'));
    const t = createTransport({ type: 'stdio', command: 'missing' });
    await expect(t.connect()).rejects.toThrow('Command not found');
    platform.mockRestore();
  });
});
