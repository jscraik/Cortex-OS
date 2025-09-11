import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { fsQueue } from '../../../packages/a2a/a2a-transport/src/fsq';

it('fsq publishes and notifies subscribers', async () => {
	const t = fsQueue(`test-${Date.now()}`);
	let seen = false;
	await t.subscribe(['event.x'], async () => {
		seen = true;
	});
	await t.publish({
		id: randomUUID(),
		type: 'event.x',
		occurredAt: new Date().toISOString(),
		headers: {},
		payload: {},
	} as any);
	expect(seen).toBe(true);
});

it('publishes immediately after creation', async () => {
	const name = `test-${Date.now()}`;
	const dir = join(os.homedir(), '.cortex', 'a2a', name);
	const t = fsQueue(name);
	await t.publish({
		id: randomUUID(),
		type: 'event.y',
		occurredAt: new Date().toISOString(),
		headers: {},
		payload: {},
	} as any);
	await expect(fs.stat(dir)).resolves.toBeDefined();
});
