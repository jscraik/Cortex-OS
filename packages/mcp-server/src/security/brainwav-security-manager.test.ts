import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import { CapabilityTokenIssuer } from '@cortex-os/security';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BrainwavMcpSecurityManager,
	DEFAULT_BRAINWAV_MCP_CONFIG,
	type BrainwavToolInvocationContext,
} from './brainwav-security-manager.js';

const TEST_CAPABILITY_SECRET = 'brainwav-integration-secret';
const TEST_TENANT = 'brainwav-test-tenant';
const TEST_BUDGET_PROFILE = 'brainwav-test-budget';

function createContext(overrides: Partial<BrainwavToolInvocationContext> = {}): BrainwavToolInvocationContext {
	return {
		toolName: overrides.toolName ?? 'memory.store',
		endpoint: overrides.endpoint ?? 'https://security.brainwav.io/memory/store',
		requestData: overrides.requestData ?? { input: 'hello' },
		sessionId: overrides.sessionId ?? randomUUID(),
		userId: overrides.userId ?? 'user-1',
		traceId: overrides.traceId ?? randomUUID(),
		transport: overrides.transport ?? 'http',
		tenant: overrides.tenant ?? TEST_TENANT,
		capabilityTokens: overrides.capabilityTokens,
		budgetProfile: overrides.budgetProfile,
		requestCost: overrides.requestCost,
		requestDurationMs: overrides.requestDurationMs,
	};
}

describe('BrainwavMcpSecurityManager', () => {
	let manager: BrainwavMcpSecurityManager;
	let issuer: CapabilityTokenIssuer;
	let budgetDir: string;
	let budgetFile: string;

	beforeEach(() => {
		budgetDir = mkdtempSync(path.join(tmpdir(), 'brainwav-mcp-security-'));
		budgetFile = path.join(budgetDir, 'budget.yml');
		writeFileSync(
			budgetFile,
			`budgets:\n  ${TEST_BUDGET_PROFILE}:\n    max_total_req: 1\n`,
		);

		const config = {
			...DEFAULT_BRAINWAV_MCP_CONFIG,
			capabilitySecret: TEST_CAPABILITY_SECRET,
			budgetFilePath: budgetFile,
			budgetProfile: TEST_BUDGET_PROFILE,
			blockOnViolation: true,
			auditMode: false,
		};

		manager = new BrainwavMcpSecurityManager(config, pino({ level: 'silent' }));
		issuer = new CapabilityTokenIssuer(TEST_CAPABILITY_SECRET);
	});

	afterEach(() => {
		vi.useRealTimers();
		rmSync(budgetDir, { recursive: true, force: true });
	});

	function issueToken(overrides: { ttlSeconds?: number; budgetProfile?: string } = {}) {
		const budgetProfile = overrides.budgetProfile ?? TEST_BUDGET_PROFILE;
		return issuer.issue({
			tenant: TEST_TENANT,
			action: 'tool.execute.memory.store',
			resourcePrefix: 'https://security.brainwav.io/memory/store',
			budgetProfile,
			ttlSeconds: overrides.ttlSeconds ?? 300,
		}).token;
	}

	it('allows execution with valid capability token', async () => {
		const context = createContext({
			capabilityTokens: [issueToken()],
			budgetProfile: TEST_BUDGET_PROFILE,
		});

		const result = await manager.validateToolInvocation(context);
		expect(result.allowed).toBe(true);
		expect(result.reason).toBeUndefined();
	});

	it('rejects missing capability tokens', async () => {
		const context = createContext({ capabilityTokens: [] });
		const result = await manager.validateToolInvocation(context);

		expect(result.allowed).toBe(false);
		expect(result.reason).toMatch(/Capability token/i);
	});

	it('rejects expired capability tokens', async () => {
		vi.useFakeTimers();
		const base = new Date('2025-01-01T00:00:00Z');
		vi.setSystemTime(base);
		const expired = issueToken({ ttlSeconds: 1 });
		vi.setSystemTime(new Date(base.getTime() + 120_000));

		const context = createContext({
			capabilityTokens: [expired],
			budgetProfile: TEST_BUDGET_PROFILE,
		});
		const result = await manager.validateToolInvocation(context);

		expect(result.allowed).toBe(false);
		expect(result.reason).toMatch(/Policy/i);
	});

	it('enforces budget limits when blockOnViolation is true', async () => {
		const token = issueToken();
		const context = createContext({
			capabilityTokens: [token],
			budgetProfile: TEST_BUDGET_PROFILE,
		});

		const first = await manager.validateToolInvocation(context);
		expect(first.allowed).toBe(true);

		const second = await manager.validateToolInvocation(context);
		expect(second.allowed).toBe(false);
		expect(second.reason).toMatch(/Budget/);
	});
});
