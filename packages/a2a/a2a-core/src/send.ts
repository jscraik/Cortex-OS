import axios from 'axios';
import {
	createEnvelope,
	type Envelope,
} from '../../a2a-contracts/src/envelope.js';
import { SimpleCircuitBreaker } from './circuitBreaker.js';

const options = {
	timeout: 3000, // If our service takes longer than 3 seconds, trigger a failure
	errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
	resetTimeout: 30000, // After 30 seconds, try again.
};
const breaker = new SimpleCircuitBreaker(axios.post as any, options);

export async function send(params: {
	type: string;
	source: string;
	data: unknown;
	outboxUrl: string;
	// Test-only hint to simulate failures in downstream test services
	simulateFailure?: boolean;
}): Promise<Envelope> {
	const envelope = createEnvelope({
		type: params.type,
		source: params.source,
		data: params.data,
	});

	// Pass simulateFailure as a query param hint for cooperating test servers
	const url = new URL(params.outboxUrl);
	if (params.simulateFailure) {
		url.searchParams.set('simulateFailure', 'true');
	}
	await breaker.fire(url.toString(), envelope);
	return envelope;
}
