import type { Envelope } from '../../a2a-contracts/src/envelope.js';
export type Route = {
	match: (e: Envelope) => boolean;
	handle: (e: Envelope) => Promise<void>;
};
export class Router {
	constructor(private routes: Route[]) {}
	async dispatch(e: Envelope) {
		for (const r of this.routes) if (r.match(e)) return r.handle(e);
	}
}
