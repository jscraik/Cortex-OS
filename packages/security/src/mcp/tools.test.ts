import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	securityAccessControlTool,
	securityAuditTool,
	securityEncryptionTool,
	securityMcpTools,
	securityPolicyValidationTool,
	securityThreatDetectionTool,
} from './tools.js';

type ToolResponse = Awaited<ReturnType<typeof securityAccessControlTool.handler>>;

function parsePayload(result: ToolResponse): unknown {
	const first = result.content[0];
	if (!first) return undefined;
	return JSON.parse(first.text);
}

describe('securityAccessControlTool', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('allows privileged administrators to perform sensitive actions', async () => {
		const response = await securityAccessControlTool.handler({
			subject: {
				id: 'user-1',
				roles: ['security-admin'],
				attributes: { department: 'security' },
			},
			resource: {
				id: 'resource-123',
				type: 'dataset',
				ownerId: 'user-42',
			},
			action: 'delete',
			context: {
				environment: 'production',
				timestamp: new Date().toISOString(),
			},
		});

		expect(response.isError).toBeFalsy();
		expect(response.metadata.tool).toBe('security_access_control');
		expect(response.metadata.correlationId).toMatch(/^sec-/);

		const payload = parsePayload(response);
		expect(payload).toMatchObject({
			allowed: true,
			effect: 'allow',
			reasons: expect.arrayContaining([expect.stringContaining('security-admin')]),
		});
	});

	it('denies unauthorized actions with detailed reasons', async () => {
		const response = await securityAccessControlTool.handler({
			subject: {
				id: 'user-2',
				roles: ['viewer'],
			},
			resource: {
				id: 'resource-999',
				type: 'dataset',
				ownerId: 'user-100',
			},
			action: 'write',
		});

		expect(response.isError).toBeFalsy();
		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({
			allowed: false,
			effect: 'deny',
		});
		expect(Array.isArray((payload as any).reasons)).toBe(true);
	});

	it('returns structured validation errors for malformed requests', async () => {
		const response = await securityAccessControlTool.handler({});

		expect(response.isError).toBe(true);
		expect(response.error?.code).toBe('validation_error');
		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({
			code: 'validation_error',
		});
	});
});

describe('securityPolicyValidationTool', () => {
	it('accepts well-formed JSON policies and normalizes output', async () => {
		const response = await securityPolicyValidationTool.handler({
			policy: JSON.stringify({
				version: '2024-01-01',
				rules: [
					{
						id: 'allow-read',
						effect: 'allow',
						condition: { action: 'read', resource: 'dataset' },
					},
				],
			}),
			format: 'json',
			metadata: {
				name: 'dataset-access-policy',
				version: '1.2.0',
			},
		});

		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({
			valid: true,
			issues: [],
		});
	});

	it('flags insecure wildcard rules', async () => {
		const response = await securityPolicyValidationTool.handler({
			policy: JSON.stringify({
				version: '2024-01-01',
				rules: [
					{
						id: 'allow-all',
						effect: 'allow',
						condition: { action: '*' },
					},
				],
			}),
			format: 'json',
		});

		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({ valid: false });
		expect((payload.issues as string[])[0]).toContain('wildcard');
	});

	it('returns validation error for invalid JSON content', async () => {
		const response = await securityPolicyValidationTool.handler({
			policy: '{not-json}',
			format: 'json',
		});

		expect(response.isError).toBe(true);
		expect(response.error?.code).toBe('validation_error');
	});
});

describe('securityAuditTool', () => {
	it('summarizes audit events and preserves evidence details', async () => {
		const timestamp = new Date().toISOString();
		const response = await securityAuditTool.handler({
			resourceId: 'resource-777',
			auditType: 'access',
			timeRange: { start: timestamp, end: timestamp },
			events: [
				{
					id: 'evt-1',
					actor: 'user-1',
					action: 'read',
					result: 'success',
					severity: 'low',
					timestamp,
				},
				{
					id: 'evt-2',
					actor: 'user-2',
					action: 'delete',
					result: 'denied',
					severity: 'high',
					timestamp,
				},
			],
			includeEvidence: true,
		});

		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({
			summary: {
				totalEvents: 2,
				denied: 1,
				highSeverity: 1,
			},
		});
	});
});

describe('securityEncryptionTool', () => {
	it('encrypts and decrypts payloads symmetrically', async () => {
		const secret = 'my-strong-shared-secret';
		const plaintext = 'defense-in-depth';

		const encrypted = await securityEncryptionTool.handler({
			operation: 'encrypt',
			data: plaintext,
			secret,
		});

		expect(encrypted.isError).toBeFalsy();
		const encryptedPayload = parsePayload(encrypted) as Record<string, unknown>;
		expect(encryptedPayload).toMatchObject({
			operation: 'encrypt',
			algorithm: 'aes-256-gcm',
		});
		expect(typeof encryptedPayload.output).toBe('string');
		expect(typeof encryptedPayload.iv).toBe('string');
		expect(typeof encryptedPayload.authTag).toBe('string');

		const decrypted = await securityEncryptionTool.handler({
			operation: 'decrypt',
			data: encryptedPayload.output,
			secret,
			iv: encryptedPayload.iv as string,
			authTag: encryptedPayload.authTag as string,
		});

		const decryptedPayload = parsePayload(decrypted) as Record<string, unknown>;
		expect(decryptedPayload).toMatchObject({
			operation: 'decrypt',
			output: plaintext,
		});
	});

	it('returns error when decrypting with missing parameters', async () => {
		const response = await securityEncryptionTool.handler({
			operation: 'decrypt',
			data: 'deadbeef',
			secret: 'secret',
		});

		expect(response.isError).toBe(true);
		expect(response.error?.code).toBe('validation_error');
	});
});

describe('securityThreatDetectionTool', () => {
	it('scores events and flags suspicious activity', async () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const response = await securityThreatDetectionTool.handler({
			context: { environment: 'production' },
			events: [
				{
					id: 'evt-10',
					actor: 'user-10',
					action: 'download',
					severity: 'medium',
					location: 'us-east-1',
				},
				{
					id: 'evt-11',
					actor: 'user-11',
					action: 'privilege-escalation',
					severity: 'high',
					location: 'unknown',
				},
			],
			thresholds: {
				criticalScore: 70,
			},
		});

		expect(consoleSpy).toHaveBeenCalled();
		const payload = parsePayload(response) as Record<string, unknown>;
		expect(payload).toMatchObject({
			suspiciousEvents: expect.arrayContaining([expect.objectContaining({ id: 'evt-11' })]),
		});
	});
});

describe('securityMcpTools', () => {
	it('exposes all security tools for registration', () => {
		const names = securityMcpTools.map((tool) => tool.name);
		expect(names).toEqual([
			'security_access_control',
			'security_policy_validation',
			'security_audit',
			'security_encryption',
			'security_threat_detection',
		]);

		for (const tool of securityMcpTools) {
			expect(typeof tool.description).toBe('string');
			expect(tool.inputSchema).toBeTruthy();
			expect(typeof tool.handler).toBe('function');
		}
	});
});
