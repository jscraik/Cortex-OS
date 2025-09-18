import { describe, expect, it } from 'vitest';

// Import types and implementation
import type { AuditEvent } from './audit-event-validator-impl.js';
import { createAuditEventValidator } from './audit-event-validator-impl.js';

describe('Audit Event Schema Validation', () => {
	describe('Schema validation', () => {
		it('should validate a complete audit event schema', () => {
			const validEvent = {
				id: 'audit-123',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'access.control',
				actor: {
					id: 'user-456',
					type: 'user' as const,
					name: 'John Doe',
				},
				action: 'tool.access.attempt',
				resource: {
					type: 'mcp.tool',
					id: 'file_operations',
					name: 'File Operations Tool',
				},
				outcome: 'success' as const,
				severity: 'medium' as const,
				details: {
					requestedScopes: ['filesystem:read'],
					grantedScopes: ['filesystem:read'],
					reason: 'User has required permissions',
				},
				metadata: {
					userAgent: 'cortex-os/1.0',
					ip: '10.0.0.100', // Test IP
					sessionId: 'sess-789',
					requestId: 'req-012',
					traceId: 'trace-345',
				},
				redacted: [],
			};

			expect(() => {
				const validator = createAuditEventValidator();
				validator.validateSchema(validEvent);
			}).not.toThrow();
		});

		it('should reject event with invalid actor type', () => {
			const invalidEvent = {
				id: 'audit-123',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'access.control',
				actor: {
					id: 'user-456',
					type: 'invalid', // Invalid actor type
					name: 'John Doe',
				},
				action: 'tool.access.attempt',
				resource: {
					type: 'mcp.tool',
					id: 'file_operations',
				},
				outcome: 'success',
				severity: 'medium',
			};

			expect(() => {
				const validator = createAuditEventValidator();
				validator.validateSchema(invalidEvent);
			}).toThrow('Invalid actor type');
		});

		it('should require mandatory fields', () => {
			const invalidEvent = {
				// Missing id, timestamp, etc.
				type: 'access.control',
				actor: {
					id: 'user-456',
					type: 'user',
				},
				action: 'tool.access.attempt',
				resource: {
					type: 'mcp.tool',
					id: 'file_operations',
				},
				outcome: 'success',
				severity: 'medium',
			};

			expect(() => {
				const validator = createAuditEventValidator();
				validator.validateSchema(invalidEvent);
			}).toThrow('id');
		});

		it('should validate timestamp format', () => {
			const invalidEvent = {
				id: 'audit-123',
				timestamp: 'invalid-timestamp',
				type: 'access.control',
				actor: {
					id: 'user-456',
					type: 'user' as const,
				},
				action: 'tool.access.attempt',
				resource: {
					type: 'mcp.tool',
					id: 'file_operations',
				},
				outcome: 'success' as const,
				severity: 'medium' as const,
			};

			expect(() => {
				const validator = createAuditEventValidator();
				validator.validateSchema(invalidEvent);
			}).toThrow('Invalid timestamp format');
		});

		it('should validate outcome enum values', () => {
			const invalidEvent = {
				id: 'audit-123',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'access.control',
				actor: {
					id: 'user-456',
					type: 'user' as const,
				},
				action: 'tool.access.attempt',
				resource: {
					type: 'mcp.tool',
					id: 'file_operations',
				},
				outcome: 'maybe', // Invalid outcome
				severity: 'medium' as const,
			};

			expect(() => {
				const validator = createAuditEventValidator();
				validator.validateSchema(invalidEvent);
			}).toThrow('Invalid outcome');
		});
	});

	describe('Event creation', () => {
		it('should create audit event with generated id and timestamp', () => {
			const validator = createAuditEventValidator();

			const eventParams = {
				type: 'security.violation',
				actor: {
					id: 'system',
					type: 'system' as const,
				},
				action: 'policy.violation.detected',
				resource: {
					type: 'egress.request',
					id: 'req-456',
				},
				outcome: 'failure' as const,
				severity: 'high' as const,
			};

			const event = validator.createEvent(eventParams);

			expect(event.id).toBeDefined();
			expect(event.timestamp).toBeDefined();
			expect(event.type).toBe('security.violation');
			expect(event.severity).toBe('high');
			expect(() => new Date(event.timestamp)).not.toThrow();
		});

		it('should create event with optional metadata', () => {
			const validator = createAuditEventValidator();

			const eventParams = {
				type: 'access.granted',
				actor: {
					id: 'agent-789',
					type: 'agent' as const,
					name: 'Content Agent',
				},
				action: 'mcp.tool.invoke',
				resource: {
					type: 'mcp.tool',
					id: 'web_search',
					name: 'Web Search Tool',
				},
				outcome: 'success' as const,
				severity: 'low' as const,
				details: {
					query: 'latest news',
					resultCount: 10,
				},
				metadata: {
					sessionId: 'sess-999',
					traceId: 'trace-888',
				},
			};

			const event = validator.createEvent(eventParams);

			expect(event.details?.query).toBe('latest news');
			expect(event.metadata?.sessionId).toBe('sess-999');
			expect(event.metadata?.traceId).toBe('trace-888');
		});
	});

	describe('Data redaction', () => {
		it('should redact sensitive fields from event details', () => {
			const validator = createAuditEventValidator();

			const event: AuditEvent = {
				id: 'audit-456',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'authentication.attempt',
				actor: {
					id: 'user-123',
					type: 'user',
				},
				action: 'login.attempt',
				resource: {
					type: 'auth.endpoint',
					id: '/api/auth/login',
				},
				outcome: 'failure',
				severity: 'medium',
				details: {
					username: 'john.doe',
					password: 'secret123', // Should be redacted
					apiKey: 'key_abc123', // Should be redacted
					reason: 'Invalid credentials',
				},
				metadata: {
					ip: '10.0.0.100', // Test IP
				},
			};

			const redactedEvent = validator.redactSensitiveData(event, [
				'password',
				'apiKey',
			]);

			expect(redactedEvent.details?.password).toBe('[REDACTED]');
			expect(redactedEvent.details?.apiKey).toBe('[REDACTED]');
			expect(redactedEvent.details?.username).toBe('john.doe'); // Should not be redacted
			expect(redactedEvent.redacted).toContain('password');
			expect(redactedEvent.redacted).toContain('apiKey');
		});

		it('should handle nested field redaction', () => {
			const validator = createAuditEventValidator();

			const event: AuditEvent = {
				id: 'audit-789',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'data.access',
				actor: {
					id: 'system',
					type: 'system',
				},
				action: 'database.query',
				resource: {
					type: 'database.table',
					id: 'users',
				},
				outcome: 'success',
				severity: 'low',
				details: {
					query: 'SELECT * FROM users WHERE id = ?',
					params: ['user-123'],
					user: {
						id: 'user-123',
						email: 'john@example.com', // Should be redacted
						ssn: '123-45-6789', // Should be redacted
					},
				},
			};

			const redactedEvent = validator.redactSensitiveData(event, [
				'user.email',
				'user.ssn',
			]);

			const userDetails = redactedEvent.details?.user as Record<
				string,
				unknown
			>;
			expect(userDetails?.email).toBe('[REDACTED]');
			expect(userDetails?.ssn).toBe('[REDACTED]');
			expect(userDetails?.id).toBe('user-123'); // Should not be redacted
			expect(redactedEvent.redacted).toContain('user.email');
			expect(redactedEvent.redacted).toContain('user.ssn');
		});
	});

	describe('Event formatting and utilities', () => {
		it('should format event for structured logging', () => {
			const validator = createAuditEventValidator();

			const event: AuditEvent = {
				id: 'audit-999',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'access.denied',
				actor: {
					id: 'user-777',
					type: 'user',
					name: 'Jane Smith',
				},
				action: 'resource.access.denied',
				resource: {
					type: 'secure.file',
					id: 'classified.txt',
				},
				outcome: 'failure',
				severity: 'high',
				details: {
					reason: 'Insufficient permissions',
				},
			};

			const formatted = validator.formatForLogging(event);

			expect(formatted).toContain('audit-999');
			expect(formatted).toContain('access.denied');
			expect(formatted).toContain('user-777');
			expect(formatted).toContain('Jane Smith');
			expect(formatted).toContain('high');
			expect(formatted).toContain('failure');
		});

		it('should identify high severity events', () => {
			const validator = createAuditEventValidator();

			const highSeverityEvent: AuditEvent = {
				id: 'audit-critical',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'security.breach',
				actor: { id: 'unknown', type: 'system' },
				action: 'unauthorized.access',
				resource: { type: 'secure.vault', id: 'vault-001' },
				outcome: 'failure',
				severity: 'critical',
			};

			const lowSeverityEvent: AuditEvent = {
				id: 'audit-normal',
				timestamp: '2025-09-15T10:00:00.000Z',
				type: 'routine.operation',
				actor: { id: 'user-123', type: 'user' },
				action: 'data.read',
				resource: { type: 'public.document', id: 'doc-001' },
				outcome: 'success',
				severity: 'low',
			};

			expect(validator.isHighSeverity(highSeverityEvent)).toBe(true);
			expect(validator.isHighSeverity(lowSeverityEvent)).toBe(false);
		});
	});

	describe('Integration with CloudEvents', () => {
		it('should be compatible with CloudEvents format', () => {
			const validator = createAuditEventValidator();

			const event = validator.createEvent({
				type: 'audit.event.created',
				actor: {
					id: 'system',
					type: 'system',
				},
				action: 'audit.log.write',
				resource: {
					type: 'audit.log',
					id: 'log-001',
				},
				outcome: 'success',
				severity: 'low',
			});

			// Should be able to wrap in CloudEvent envelope
			const cloudEvent = {
				specversion: '1.0',
				type: 'audit.event.created',
				source: 'urn:cortex:audit-system',
				id: event.id,
				time: event.timestamp,
				datacontenttype: 'application/json',
				data: event,
			};

			expect(cloudEvent.id).toBe(event.id);
			expect(cloudEvent.time).toBe(event.timestamp);
			expect(cloudEvent.data).toBe(event);
		});
	});
});
