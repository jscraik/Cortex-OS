import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('nx-smart telemetry optional', () => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'nx-smart.mjs');
    beforeEach(() => { vi.resetModules(); });
    it('runs without telemetry when NX_SMART_OTEL not set', async () => {
        vi.doMock('node:child_process', () => ({
            execSync: (cmd) => {
                if (cmd.startsWith('git rev-parse --is-inside-work-tree')) return '';
                if (cmd.startsWith('git rev-parse HEAD')) return 'HEADSHA';
                if (cmd.startsWith('git --no-pager diff')) return 'a.js';
                if (cmd.includes('nx show projects --affected')) return JSON.stringify(['pkg-a']);
                return '';
            },
            spawnSync: () => ({ status: 0 })
        }));
        process.argv = ['node', 'nx-smart.mjs', 'lint', '--dry-run'];
        const logs = [];
        const origLog = console.log;
        const origExit = process.exit;
        // @ts-ignore
        process.exit = (c) => { throw new Error('__exit_' + c); };
        console.log = (m) => { logs.push(String(m)); };
        try {
            await import(scriptPath + '?cacheBust=' + Date.now()).catch(e => { if (!e.message.startsWith('__exit_')) throw e; });
        } finally {
            console.log = origLog; process.exit = origExit;
        }
        expect(logs.some(l => l.includes('Affected Projects Summary'))).toBe(true);
    });
});
