import type { Envelope } from '@cortex-os/a2a-contracts';

/**
 * A lightweight bridge exposing common convenience accessors for envelopes
 * without altering the underlying contract shape.
 */
export interface A2AEnvelopeBridge extends Envelope {
	readonly eventType: string;
	readonly authToken: string | null;
	readonly routingTopic: string;
	readonly correlationIdSafe: string;
}

const extractAuthToken = (headers?: Record<string, string>): string | null => {
	if (!headers) return null;
	const h = headers.authorization || headers.Authorization || headers['auth-token'];
	if (!h) return null;
	const m = /^Bearer (.+)$/.exec(h);
	return m ? m[1] : h;
};

export const createEnvelopeBridge = (envelope: Envelope): A2AEnvelopeBridge => {
	return {
		...envelope,
		get eventType() {
			return this.type;
		},
		get authToken() {
			return extractAuthToken(this.headers);
		},
		get routingTopic() {
			return this.subject || this.type;
		},
		get correlationIdSafe() {
			return this.correlationId || this.id;
		},
	} as A2AEnvelopeBridge;
};

export const getRoutingTopic = (envelope: Envelope): string => {
	return envelope.subject || envelope.type;
};
