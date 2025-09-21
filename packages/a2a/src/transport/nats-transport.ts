import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import { connect, type NatsConnection, StringCodec } from 'nats';

export interface NatsTransportOptions {
	servers: string | string[];
	subjectPrefix?: string;
}

export interface NatsTransport {
	publish: (envelope: Envelope) => Promise<void>;
	close: () => Promise<void>;
}

export async function createNatsTransport(options: NatsTransportOptions): Promise<NatsTransport> {
	const nc = await connect({ servers: options.servers });
	const codec = StringCodec();
	const prefix = options.subjectPrefix ?? 'cortex';

	return {
		async publish(envelope: Envelope): Promise<void> {
			const subject = `${prefix}.${envelope.type}`;
			const payload = codec.encode(JSON.stringify(envelope));
			await nc.publish(subject, payload);
			await nc.flush();
		},
		async close(): Promise<void> {
			await drainSafely(nc);
			await nc.close();
		},
	};
}

async function drainSafely(nc: NatsConnection): Promise<void> {
	try {
		if (!nc.isClosed()) {
			await nc.drain();
		}
	} catch (error) {
		console.warn('NATS transport drain failed', error);
	}
}
