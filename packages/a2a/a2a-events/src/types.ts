// Re-export the standard Envelope type from a2a-contracts

export type { Envelope as A2AEventEnvelope } from '@cortex-os/a2a-contracts';
export {
	createEnvelope as createA2AEventEnvelope,
	Envelope as A2AEventEnvelopeSchema,
} from '@cortex-os/a2a-contracts';

import { Envelope } from '@cortex-os/a2a-contracts';

// Validation functions for compatibility
export function validateA2AEventEnvelope(data: unknown) {
	return Envelope.parse(data);
}

export function isA2AEventEnvelope(data: unknown): boolean {
	return Envelope.safeParse(data).success;
}
