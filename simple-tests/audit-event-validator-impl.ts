import { randomUUID } from 'node:crypto';
import { z } from 'zod';

// Zod schemas for audit event validation
const AuditEventActorSchema = z.object({
	id: z.string(),
	type: z.enum(['user', 'system', 'agent'], {
		errorMap: () => ({ message: 'Invalid actor type' }),
	}),
	name: z.string().optional(),
});

const AuditEventResourceSchema = z.object({
	type: z.string(),
	id: z.string(),
	name: z.string().optional(),
});

const AuditEventMetadataSchema = z.object({
	userAgent: z.string().optional(),
	ip: z.string().optional(),
	sessionId: z.string().optional(),
	requestId: z.string().optional(),
	traceId: z.string().optional(),
});

const AuditEventSchema = z.object({
	id: z.string(),
	timestamp: z.string().refine(
		(timestamp) => {
			// Stricter ISO 8601 timestamp validation
			const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
			if (!isoRegex.test(timestamp)) return false;

			const date = new Date(timestamp);
			return !Number.isNaN(date.getTime()) && date.toISOString() === timestamp;
		},
		{ message: 'Invalid timestamp format' },
	),
	type: z.string(),
	actor: AuditEventActorSchema,
	action: z.string(),
	resource: AuditEventResourceSchema,
	outcome: z.enum(['success', 'failure', 'partial'], {
		errorMap: () => ({ message: 'Invalid outcome' }),
	}),
	severity: z.enum(['low', 'medium', 'high', 'critical']),
	details: z.record(z.unknown()).optional(),
	metadata: AuditEventMetadataSchema.optional(),
	redacted: z.array(z.string()).optional(),
});

// Type inference from schemas
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type AuditEventActor = z.infer<typeof AuditEventActorSchema>;
export type AuditEventResource = z.infer<typeof AuditEventResourceSchema>;
export type AuditEventMetadata = z.infer<typeof AuditEventMetadataSchema>;

export interface AuditEventValidator {
	validateSchema(event: unknown): AuditEvent;
	createEvent(params: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent;
	redactSensitiveData(event: AuditEvent, sensitiveFields: string[]): AuditEvent;
	formatForLogging(event: AuditEvent): string;
	isHighSeverity(event: AuditEvent): boolean;
}

class AuditEventValidatorImpl implements AuditEventValidator {
	validateSchema(event: unknown): AuditEvent {
		return AuditEventSchema.parse(event);
	}

	createEvent(params: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
		return {
			id: randomUUID(),
			timestamp: new Date().toISOString(),
			...params,
		};
	}

	redactSensitiveData(event: AuditEvent, sensitiveFields: string[]): AuditEvent {
		const redactedEvent = JSON.parse(JSON.stringify(event)); // Deep clone
		const redactedFieldsList = [...(event.redacted || [])];

		for (const fieldPath of sensitiveFields) {
			let found = false;

			// Try redacting in event.details first
			if (redactedEvent.details && this.redactField(redactedEvent.details, fieldPath)) {
				found = true;
			}

			// Try redacting at root level if not found in details
			if (!found && this.redactField(redactedEvent, fieldPath)) {
				found = true;
			}

			if (found) {
				redactedFieldsList.push(fieldPath);
			}
		}

		redactedEvent.redacted = redactedFieldsList;
		return redactedEvent;
	}

	formatForLogging(event: AuditEvent): string {
		const actorName = event.actor.name ? ` (${event.actor.name})` : '';
		const parts = [
			`id=${event.id}`,
			`type=${event.type}`,
			`actor=${event.actor.id}${actorName}`,
			`action=${event.action}`,
			`resource=${event.resource.type}:${event.resource.id}`,
			`outcome=${event.outcome}`,
			`severity=${event.severity}`,
			`timestamp=${event.timestamp}`,
		];

		if (event.details) {
			parts.push(`details=${JSON.stringify(event.details)}`);
		}

		if (event.metadata) {
			parts.push(`metadata=${JSON.stringify(event.metadata)}`);
		}

		if (event.redacted && event.redacted.length > 0) {
			parts.push(`redacted=[${event.redacted.join(', ')}]`);
		}

		return parts.join(' | ');
	}

	isHighSeverity(event: AuditEvent): boolean {
		return event.severity === 'high' || event.severity === 'critical';
	}

	private redactField(obj: Record<string, unknown>, fieldPath: string): boolean {
		const parts = fieldPath.split('.');
		let current: unknown = obj;

		// Navigate to the parent of the field to redact
		for (let i = 0; i < parts.length - 1; i++) {
			if (current && typeof current === 'object' && current !== null && parts[i] in current) {
				current = (current as Record<string, unknown>)[parts[i]];
			} else {
				return false; // Field path doesn't exist
			}
		}

		const finalKey = parts[parts.length - 1];
		if (current && typeof current === 'object' && current !== null && finalKey in current) {
			(current as Record<string, unknown>)[finalKey] = '[REDACTED]';
			return true;
		}

		return false;
	}
}

export function createAuditEventValidator(): AuditEventValidator {
	return new AuditEventValidatorImpl();
}
