import { describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => {
	return { spawn: vi.fn() };
});

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { generateFlamegraph } from '../src/flamegraph.js';

const mockedSpawn = vi.mocked(spawn);
// Minimal ChildProcess-like interface for our mock
type MinimalChildProcess = {
	on: (event: string, cb: (...args: unknown[]) => void) => MinimalChildProcess;
};
describe('generateFlamegraph', () => {
	it('spawns 0x with correct arguments', async () => {
		const on = vi.fn(function (
			this: MinimalChildProcess,
			event: string,
			cb: (...args: unknown[]) => void,
		) {
			if (event === 'exit') cb(0);
			return this; // ChildProcess#on returns `this`
		});
		// Return an object whose `on` method matches the ChildProcess signature
		const child: MinimalChildProcess = {
			on: on as (event: string, cb: (...args: unknown[]) => void) => MinimalChildProcess,
		};
		mockedSpawn.mockReturnValue(child as unknown as ChildProcess);
		await generateFlamegraph('app.js', 'out');
		expect(mockedSpawn).toHaveBeenCalledWith('npx', ['0x', '--output', 'out', 'app.js'], {
			stdio: 'inherit',
		});
	});
});
