import type { Envelope } from '../../a2a-contracts/src/envelope.js';

export interface Transport {
	publish: (msg: Envelope) => Promise<void>;
	subscribe: (
		types: string[],
		onMsg: (msg: Envelope) => Promise<void>,
	) => Promise<() => Promise<void>>;
	terminate?: () => Promise<void>;
	pid?: number;
}
