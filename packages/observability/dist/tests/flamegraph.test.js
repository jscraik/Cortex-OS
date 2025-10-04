import { describe, expect, it, vi } from 'vitest';
vi.mock('node:child_process', () => {
    return { spawn: vi.fn() };
});
import { spawn } from 'node:child_process';
import { generateFlamegraph } from '../src/flamegraph.js';
const mockedSpawn = vi.mocked(spawn);
describe('generateFlamegraph', () => {
    it('spawns 0x with correct arguments', async () => {
        const on = vi.fn(function (event, cb) {
            if (event === 'exit')
                cb(0);
            return this; // ChildProcess#on returns `this`
        });
        // Return an object whose `on` method matches the ChildProcess signature
        const child = { on: on };
        mockedSpawn.mockReturnValue(child);
        await generateFlamegraph('app.js', 'out');
        expect(mockedSpawn).toHaveBeenCalledWith('npx', ['0x', '--output', 'out', 'app.js'], {
            stdio: 'inherit',
        });
    });
});
//# sourceMappingURL=flamegraph.test.js.map