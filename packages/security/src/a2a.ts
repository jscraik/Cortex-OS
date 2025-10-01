import type { TopicACL } from '@cortex-os/a2a-contracts';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts';
import { type BusOptions, createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
	SECURITY_EVENT_SOURCE,
	SecurityAccessEventSchema,
	SecurityAuditEventSchema,
	SecurityPolicyViolationEventSchema,
	SecurityThreatDetectionEventSchema,
} from './events/security-events.js';

const DEFAULT_SECURITY_ACL: TopicACL = {
	'security.access.evaluated': { publish: true, subscribe: true },
	'security.policy.violation': { publish: true, subscribe: true },
	'security.threat.detected': { publish: true, subscribe: true },
	'security.audit.logged': { publish: true, subscribe: true },
};

function registerSecuritySchema(
	registry: SchemaRegistry,
	eventType: string,
	schema: ZodTypeAny,
	description: string,
	tags: string[],
	examples: unknown[],
) {
	registry.register({
		eventType,
		version: '1.0.0',
		schema,
		description,
		compatibility: SchemaCompatibility.BACKWARD,
		tags,
		examples,
		metadata: {
			package: '@cortex-os/security',
			source: SECURITY_EVENT_SOURCE,
		},
	});
}

export function createSecuritySchemaRegistry(): SchemaRegistry {
	const registry = new SchemaRegistry({
		strictValidation: true,
		validateOnRegistration: true,
		enableCache: true,
	});

	registerSecuritySchema(
		registry,
		'security.access.evaluated',
		SecurityAccessEventSchema,
		'Emitted when an access control decision is evaluated',
		['security', 'access-control'],
		[
			{
				accessId: 'access-001',
				subjectId: 'user:admin',
				resourceId: 'resource:critical-data',
				action: 'read',
				decision: 'allow',
				riskScore: 15,
				environment: 'production',
				evaluatedAt: new Date('2024-01-01T08:00:00Z').toISOString(),
			},
		],
	);

	registerSecuritySchema(
		registry,
		'security.policy.violation',
		SecurityPolicyViolationEventSchema,
		'Alerts when security policies are violated',
		['security', 'policy'],
		[
			{
				violationId: 'violation-001',
				policyId: 'data-access-policy',
				violationType: 'access',
				severity: 'high',
				subjectId: 'user:guest',
				resourceId: 'resource:sensitive-data',
				description: 'Unauthorized access attempt to sensitive data',
				detectedAt: new Date('2024-01-01T08:05:00Z').toISOString(),
			},
		],
	);

	registerSecuritySchema(
		registry,
		'security.threat.detected',
		SecurityThreatDetectionEventSchema,
		'Reports detected security threats and anomalies',
		['security', 'threat'],
		[
			{
				threatId: 'threat-001',
				threatType: 'anomaly',
				severity: 'medium',
				confidence: 0.75,
				sourceIp: '192.168.1.100',
				targetResource: 'api:auth-endpoint',
				indicators: ['unusual-access-pattern', 'off-hours-activity'],
				detectedAt: new Date('2024-01-01T08:10:00Z').toISOString(),
			},
		],
	);

	registerSecuritySchema(
		registry,
		'security.audit.logged',
		SecurityAuditEventSchema,
		'Records security audit events for compliance',
		['security', 'audit'],
		[
			{
				auditId: 'audit-001',
				auditType: 'access',
				actor: 'user:security-admin',
				action: 'policy-update',
				result: 'success',
				resourceId: 'policy:access-control',
				timestamp: new Date('2024-01-01T08:15:00Z').toISOString(),
			},
		],
	);

	return registry;
}

export interface SecurityBusConfig {
	transport?: Transport;
	schemaRegistry?: SchemaRegistry;
	acl?: TopicACL;
	busOptions?: BusOptions;
}

export function createSecurityBus(config: SecurityBusConfig = {}) {
	const registry = config.schemaRegistry ?? createSecuritySchemaRegistry();
	const acl: TopicACL = {
		...DEFAULT_SECURITY_ACL,
		...(config.acl ?? {}),
	};
	const transport = config.transport ?? inproc();
	const bus = createBus(transport, undefined, registry, acl, config.busOptions);
	return { bus, schemaRegistry: registry, transport };
}
