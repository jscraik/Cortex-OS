import { promises as fs, mkdirSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import type { Transport } from '@cortex-os/a2a-core/transport';

export function fsQueue(queueName = 'default'): Transport {
	const dir = join(os.homedir(), '.cortex', 'a2a', queueName);
	try {
		mkdirSync(dir, { recursive: true });
	} catch (err) {
		console.error(
			`Failed to create A2A transport directory ${dir}. Transport will not function properly.`,
			err,
		);
		throw err;
	}
	let listeners: ((m: Envelope) => Promise<void>)[] = [];

	return {
		async publish(m) {
			await fs.appendFile(join(dir, 'queue.jsonl'), `${JSON.stringify(m)}\n`);
			for (const h of listeners) await h(m);
		},
		async subscribe(types, onMsg) {
			listeners.push(async (m) => {
				if (types.includes(m.type)) await onMsg(m);
			});
			return async () => {
				listeners = listeners.filter((l) => l !== onMsg);
			};
		},
	};
}
