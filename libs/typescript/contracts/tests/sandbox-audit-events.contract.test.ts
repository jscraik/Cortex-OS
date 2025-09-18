import { describe, expect, it } from 'vitest';
import { SandboxAuditEventSchema, ViolationCodeEnum } from '../src/sandbox-audit-events.js';

describe('contract: sandbox audit events', () => {
	it('validates a full audit event with code + meta', () => {
		const sample = {
			type: 'sandbox.fs.denied',
			severity: 'medium',
			message: 'Access denied',
			meta: { path: '/blocked/secret.env' },
			code: 'FS_DENIED' as const,
		};
		const parsed = SandboxAuditEventSchema.parse(sample);
		expect(parsed.code).toBe('FS_DENIED');
	});

	it('accepts event without optional fields', () => {
		const sample = {
			type: 'sandbox.timeout',
			severity: 'high',
			message: 'Execution exceeded 50ms',
		};
		const parsed = SandboxAuditEventSchema.parse(sample);
		expect(parsed.type).toBe('sandbox.timeout');
	});

	it('rejects invalid type prefix', () => {
		expect(() =>
			SandboxAuditEventSchema.parse({
				type: 'invalid.prefix',
				severity: 'low',
				message: 'x',
			}),
		).toThrow();
	});

	it('enforces violation code enum', () => {
		const good = SandboxAuditEventSchema.parse({
			type: 'sandbox.dynamic-code',
			severity: 'high',
			message: 'dyn',
			code: 'DYNAMIC_CODE',
		});
		expect(good.code).toBe('DYNAMIC_CODE');
		expect(ViolationCodeEnum.options).toContain('TIMEOUT');
		expect(() =>
			SandboxAuditEventSchema.parse({
				type: 'sandbox.dynamic-code',
				severity: 'high',
				message: 'bad',
				code: 'NOT_A_CODE',
			}),
		).toThrow();
	});
});
