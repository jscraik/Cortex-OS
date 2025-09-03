import {
	createEnvelope,
	type Envelope,
} from "@cortex-os/a2a-contracts/envelope";
import axios from "axios";
// Local minimal type to avoid needing @types/opossum on Node 22 env
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CircuitBreaker: any = require("opossum");

const options = {
	timeout: 3000, // If our service takes longer than 3 seconds, trigger a failure
	errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
	resetTimeout: 30000, // After 30 seconds, try again.
};
const breaker: any = new CircuitBreaker(axios.post, options);

export async function send(params: {
	type: string;
	source: string;
	data: unknown;
	outboxUrl: string;
}): Promise<Envelope> {
	const envelope = createEnvelope({
		type: params.type,
		source: params.source,
		data: params.data,
	});

	await breaker.fire(params.outboxUrl, envelope);
	return envelope;
}
