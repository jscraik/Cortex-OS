/**
 * @fileoverview TDD tests for Agent Isolation Sandbox
 * Goal: Provide restricted execution environment enforcing:
 *  - Allowed filesystem read paths only
 *  - Deny write operations (for now) unless explicitly enabled
 *  - Network egress allowlist integration (reuse egress semantics)
 *  - CPU/time budget (simulate by enforcing max execution time)
 *  - Memory budget (simulate via configurable soft limit callback)
 *  - Prevention of dynamic eval / new Function
 *  - Audit events emitted on policy violations
 */

import { describe, expect, it } from 'vitest';

// Import types lazily (implementation will be added)
interface SandboxOptions {
	allowedReadPaths: string[];
	networkAllowlist: string[];
	maxExecutionMs: number;
	onAuditEvent?: (evt: AuditEvent) => void;
	memorySoftLimitBytes?: number;
	virtualFiles?: Record<string, string>;
}

interface AuditEvent {
	type: string;
	severity: 'low' | 'medium' | 'high';
	message: string;
	meta?: Record<string, unknown>;
	code?: string;
}

interface SandboxResult {
	success: boolean;
	error?: Error;
	stdout?: string;
	violations: AuditEvent[];
	durationMs: number;
}

interface SandboxApi {
	readFile(path: string): string;
	listFiles(prefix: string): string[];
	fetch(url: string): Promise<{ status: number }>;
	alloc(bytes: number): void; // simulate memory allocation
}

interface AgentSandbox {
	run<T = unknown>(
		code: (api: SandboxApi) => T | Promise<T>,
	): Promise<SandboxResult & { returnValue?: T }>;
	dispose(): Promise<void>;
}

declare function createAgentSandbox(options: SandboxOptions): AgentSandbox; // placeholder for type

// Helper to conditionally import after we create implementation file
async function loadSandbox() {
	const mod = await import('./agent-isolation-sandbox-impl');
	return mod.createAgentSandbox as typeof createAgentSandbox;
}

// Fake filesystem (we simulate rather than touch real FS for safety)
const virtualFiles: Record<string, string> = {
	'/allowed/config.json': '{"ok":true}',
	'/allowed/nested/data.txt': 'secret-data',
	'/blocked/secret.env': 'SHOULD_NOT_READ=1',
};
// The sandbox will provide a restricted API via the run callback parameter.

describe('Agent Isolation Sandbox TDD', () => {
	it('should allow reading files only from allowed paths', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run((api) =>
			api.readFile('/allowed/config.json'),
		);

		expect(result.success).toBe(true);
		expect(result.returnValue).toContain('ok');
		expect(result.violations).toHaveLength(0);
	});

	it('should block reading files outside allowed paths and emit audit event', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run((api) =>
			api.readFile('/blocked/secret.env'),
		);

		expect(result.success).toBe(false);
		expect(result.error?.message).toMatch(/access denied/i);
		expect(auditEvents.some((a) => a.type === 'sandbox.fs.denied')).toBe(true);
		expect(result.violations.some((v) => v.type === 'sandbox.fs.denied')).toBe(
			true,
		);
	});

	it('should allow network requests to allowlisted domains and block others', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: ['api.example.com'],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		// The sandbox should expose a limited fetch; we simulate network by pattern
		const resultAllowed = await sandbox.run(
			async (api) => (await api.fetch('https://api.example.com/data')).status,
		);
		const resultBlocked = await sandbox.run(
			async (api) => (await api.fetch('https://evil.com/steal')).status,
		);

		expect(resultAllowed.success).toBe(true);
		expect(resultAllowed.returnValue).toBe(200);
		expect(resultBlocked.success).toBe(false);
		expect(auditEvents.some((a) => a.type === 'sandbox.net.denied')).toBe(true);
	});

	it('should enforce max execution time and terminate long-running code', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 1, // very small to force timeout
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run(async () => {
			let _x = 0;
			while (true) {
				_x++;
			}
		});

		expect(result.success).toBe(false);
		expect(result.error?.message).toMatch(/timeout/i);
		expect(auditEvents.some((a) => a.type === 'sandbox.timeout')).toBe(true);
	});

	it('should prevent dynamic evaluation (eval, Function) and audit', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run(() => {
			// Attempt dynamic code (will cause violation inside worker)
			// The worker's guard will throw; we just invoke and ignore subsequent code
			eval('1 + 2');
			return 'after-eval';
		});

		expect(result.success).toBe(false);
		expect(auditEvents.some((a) => a.type === 'sandbox.dynamic-code')).toBe(
			true,
		);
	});

	it('should soft-fail when memory soft limit callback triggers', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			memorySoftLimitBytes: 1024 * 10, // 10KB
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run((api) => {
			for (let i = 0; i < 500; i++) {
				api.alloc(1024 * 5); // 5KB each iteration => exceed 10KB quickly
			}
			return 'alloc-done';
		});

		expect(result.success).toBe(false);
		expect(result.error?.message).toMatch(/memory limit/i);
		expect(auditEvents.some((a) => a.type === 'sandbox.memory.softlimit')).toBe(
			true,
		);
	});

	it('should aggregate violations in sandbox result', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run((api) => {
			let fsErr: unknown = null;
			try {
				api.readFile('/blocked/secret.env');
			} catch (e) {
				fsErr = e;
			}
			let dynErr: unknown = null;
			try {
				eval('2+2');
			} catch (e) {
				dynErr = e;
			}
			if (!fsErr || !dynErr) throw new Error('Expected both errors');
			return 'multi';
		});

		expect(result.violations.length).toBeGreaterThanOrEqual(2);
		const types = result.violations.map((v) => v.type);
		expect(types).toContain('sandbox.fs.denied');
		expect(types).toContain('sandbox.dynamic-code');
	});

	it('should include violation codes for each recorded violation', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const result = await sandbox.run((api) => {
			let fsErr: unknown = null;
			try {
				api.readFile('/blocked/secret.env');
			} catch (e) {
				fsErr = e;
			}
			let dynErr: unknown = null;
			try {
				eval('2+2');
			} catch (e) {
				dynErr = e;
			}
			if (!fsErr || !dynErr) throw new Error('Expected both errors');
			return 'codes';
		});

		// ensure at least two violations and each has code
		expect(result.violations.length).toBeGreaterThanOrEqual(2);
		for (const v of result.violations) {
			if (v.code) {
				expect(typeof v.code).toBe('string');
				expect(v.code.length).toBeGreaterThan(0);
			}
		}
		const codes = result.violations.map((v) => v.code);
		expect(codes).toContain('FS_DENIED');
		expect(codes).toContain('DYNAMIC_CODE');
	});

	it('should abort when violation threshold reached', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			maxViolations: 1,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		} as any); // cast to any to allow new field in local interface

		const result = await sandbox.run((api) => {
			let firstErr: unknown = null;
			try {
				api.readFile('/blocked/secret.env');
			} catch (e) {
				firstErr = e;
			}
			// second attempt (dynamic eval) may or may not execute depending on early termination
			eval('40+2');
			if (!firstErr) throw new Error('Expected first violation');
			return 'threshold';
		});

		expect(result.success).toBe(false);
		// Should have at least the original violation and threshold event
		const codes = result.violations.map((v) => v.code);
		expect(codes).toContain('FS_DENIED');
		expect(codes).toContain('VIOLATION_THRESHOLD');
		// Ensure threshold event present
		expect(
			result.violations.some((v) => v.type === 'sandbox.violation.threshold'),
		).toBe(true);
	});

	it('should deny path traversal attempts and audit', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles: {
				'/allowed/ok.txt': 'hi',
				'/blocked/secret.txt': 'nope',
			},
		});

		const result = await sandbox.run((api) => {
			let travErr: unknown = null;
			try {
				api.readFile('/allowed/../blocked/secret.txt');
			} catch (e) {
				travErr = e;
			}
			if (!travErr) throw new Error('Traversal should error');
			return 'traversal';
		});

		expect(auditEvents.some((a) => a.type === 'sandbox.fs.traversal')).toBe(
			true,
		);
		expect(
			result.violations.some((v) => v.type === 'sandbox.fs.traversal'),
		).toBe(true);
	});

	it('should audit serialization errors when return value cannot be cloned', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});

		const cyclic: any = {};
		cyclic.self = cyclic;
		const result = await sandbox.run(() => cyclic);

		expect(result.success).toBe(false);
		expect(auditEvents.some((a) => a.type === 'sandbox.serialize.error')).toBe(
			true,
		);
	});

	it('should prevent reuse after dispose', async () => {
		const create = await loadSandbox();
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			virtualFiles,
		});
		await sandbox.run(() => 'once');
		await sandbox.dispose();
		await expect(sandbox.run(() => 'twice')).rejects.toThrow(/disposed/);
	});

	it('should capture multiple distinct violation types in one run (network + memory)', async () => {
		const create = await loadSandbox();
		const auditEvents: AuditEvent[] = [];
		const sandbox = create({
			allowedReadPaths: ['/allowed'],
			networkAllowlist: [],
			maxExecutionMs: 100,
			memorySoftLimitBytes: 1024 * 5,
			onAuditEvent: (e: AuditEvent) => auditEvents.push(e),
			virtualFiles,
		});
		const result = await sandbox.run(async (api) => {
			let netErr: unknown = null;
			try {
				await api.fetch('https://bad.com/data');
			} catch (e) {
				netErr = e;
			}
			let memErr: unknown = null;
			try {
				api.alloc(1024 * 10);
			} catch (e) {
				memErr = e;
			}
			if (!netErr || !memErr)
				throw new Error('Expected both network and memory errors');
			return 'multi-violations';
		});
		const types = result.violations.map((v) => v.type);
		expect(types).toContain('sandbox.net.denied');
		expect(types).toContain('sandbox.memory.softlimit');
	});
});
