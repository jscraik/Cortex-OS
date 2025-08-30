import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';

vi.mock('child_process', () => {
  const mockProc = {
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      if (event === 'spawn') cb();
      return mockProc as any;
    }),
  } as any;
  return { spawn: vi.fn(() => mockProc) };
});

import { spawn } from 'child_process';
import { PythonAgentBridge } from './python-agent-bridge.js';

describe('PythonAgentBridge startup', () => {
  beforeEach(() => {
    (spawn as any).mockClear();
  });

  it('sets PYTHONPATH to bridge module directory only', async () => {
    const originalPyPath = process.env.PYTHONPATH;
    process.env.PYTHONPATH = '/legacy/path';

    const bridge = new PythonAgentBridge();
    await (bridge as any).startPythonProcess();

    const env = (spawn as any).mock.calls[0][2].env;
    const expectedPath = path.resolve(process.cwd(), 'packages/python-agents');
    expect(env.PYTHONPATH).toBe(expectedPath);
    expect(env.PYTHONPATH).not.toContain('python-agents/src');
    expect(env.PYTHONPATH).not.toContain('/legacy/path');

    process.env.PYTHONPATH = originalPyPath;
  });
});
