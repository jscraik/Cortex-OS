import type { Envelope } from '@cortex-os/a2a-contracts/envelope';
import {
	type ComplianceViolationEvent,
	createCortexSecEvent,
	type SecurityPolicyUpdatedEvent,
	type SecurityScanStartedEvent,
	type VulnerabilityFoundEvent,
} from './cortex-sec-events.ts';

export interface SecurityEventPublisher {
	publishScanStarted: (event: SecurityScanStartedEvent) => Promise<void>;
	publishVulnerabilityFound: (event: VulnerabilityFoundEvent) => Promise<void>;
	publishComplianceViolation: (event: ComplianceViolationEvent) => Promise<void>;
	publishPolicyUpdated: (event: SecurityPolicyUpdatedEvent) => Promise<void>;
}

export type PublishEnvelope = (envelope: Envelope) => Promise<void>;

export function createSecurityEventPublisher(publish: PublishEnvelope): SecurityEventPublisher {
	async function publishEnvelope(envelope: Envelope): Promise<void> {
		await publish({
			...envelope,
			headers: {
				...envelope.headers,
				'x-brainwav-brand': 'brAInwav Cortex Security',
			},
		});
	}

	return {
		publishScanStarted: async (event) => {
			await publishEnvelope(createCortexSecEvent.scanStarted(event));
		},
		publishVulnerabilityFound: async (event) => {
			await publishEnvelope(createCortexSecEvent.vulnerabilityFound(event));
		},
		publishComplianceViolation: async (event) => {
			await publishEnvelope(createCortexSecEvent.complianceViolation(event));
		},
		publishPolicyUpdated: async (event) => {
			await publishEnvelope(createCortexSecEvent.policyUpdated(event));
		},
	};
}
