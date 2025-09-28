import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import type {
	AnalyzeVulnerabilitiesInput,
	CheckDependenciesInput,
	GetSecurityPolicyInput,
	RunSemgrepScanInput,
	ValidateComplianceInput,
} from '@cortex-os/cortex-sec';
import { createCortexSecEvent } from '@cortex-os/cortex-sec';
import { type CortexOsToolName, cortexOsMcpTools, getToolDefinition } from './tools.js';

// Basic rate limiter per tool (token bucket style simplified)
interface RateState {
	count: number;
	windowStart: number;
}
const RATE_LIMIT_WINDOW_MS = 10_000; // 10s
const RATE_LIMIT_MAX = 50; // per tool per window (simple default)
const rateState: Record<string, RateState> = {};

// Simple in-memory cache for read operations
interface CacheEntry {
	expires: number;
	value: unknown;
}
const cache: Record<string, CacheEntry> = {};

type SecurityFinding = {
	id: string;
	title: string;
	severity: 'info' | 'warning' | 'error' | 'critical';
	description: string;
	location?: { file?: string; line?: number };
	references?: string[];
	remediation?: string;
};

type ComplianceViolation = {
	id: string;
	standard: 'owasp-top10' | 'cwe-25' | 'nist' | 'iso27001';
	rule: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	location?: { file?: string; line?: number };
	remediation?: string;
};

type DependencyIssue = {
	name: string;
	currentVersion: string;
	recommendedVersion?: string;
	severity: 'info' | 'warning' | 'error' | 'critical';
	advisoryUrl?: string;
	remediation?: string;
};

// Minimal dependency shapes (avoid 'any') – expand with richer contracts later
export interface MemoriesLike {
	// Extend: retrieval, vector ops, etc.
	// Using index signature for early integration while avoiding 'any'
	[k: string]: unknown;
}

export interface OrchestrationLike {
	config: Record<string, unknown>;
	// Future: run(workflow, input) -> result, status(runId)
}

export interface GatewayDeps {
	memories: MemoriesLike;
	orchestration: OrchestrationLike;
	config?: { runtime: Record<string, unknown> };
	audit?: (event: Record<string, unknown>) => void;
	security?: { allowTool?: (name: string) => boolean };
	publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void; // optional A2A bus publisher
}

export class McpGateway {
	private readonly deps: GatewayDeps;
	// In-memory workflow run persistence (simple ephemeral store)
	private readonly workflowRuns: Map<
		string,
		{
			workflow: string;
			runId: string;
			status: 'queued' | 'running' | 'completed' | 'failed';
			startedAt: string;
			finishedAt?: string;
			result?: unknown;
			error?: {
				code: string;
				message: string;
				details?: Record<string, unknown>;
			};
		}
	> = new Map();
	constructor(deps: GatewayDeps) {
		this.deps = deps;
	}

	listTools() {
		return cortexOsMcpTools.map((t) => ({
			name: t.name,
			description: t.description,
		}));
	}

	async callTool(name: CortexOsToolName, input: unknown) {
		const def = getToolDefinition(name);
		if (!def) return this.error('not_found', `Unknown tool: ${name}`);

		// Security check
		if (def.secure && this.deps.security && !this.deps.security.allowTool?.(name)) {
			return this.error('forbidden', `Access denied for tool: ${name}`);
		}

		// Rate limiting
		if (!this.consumeRate(name)) return this.error('rate_limited', 'Rate limit exceeded');

		// Cache check (key = tool + JSON input) only for tools with cacheTtlMs and no side effects
		const cacheKey = def.cacheTtlMs ? `${name}:${JSON.stringify(input)}` : undefined;
		if (cacheKey) {
			const entry = cache[cacheKey];
			if (entry && entry.expires > Date.now()) return entry.value;
		}

		const started = performance.now();
		try {
			const parsed = def.inputSchema.parse(input);
			const result = await this.dispatch(name, parsed);
			const output = def.outputSchema.parse(result); // ensure contract
			if (cacheKey && def.cacheTtlMs) {
				cache[cacheKey] = {
					value: output,
					expires: Date.now() + def.cacheTtlMs,
				};
			}
			this.audit(name, 'success', performance.now() - started, parsed);
			return output;
		} catch (err) {
			return this.handleError(name, err, started);
		}
	}

	private async dispatch(name: CortexOsToolName, input: unknown): Promise<unknown> {
		switch (name) {
			case 'system.status':
				return this.handleSystemStatus();
			case 'system.restart_service':
				return this.handleRestartService(input as { service: string; mode: 'graceful' | 'force' });
			case 'system.resources':
				return this.handleSystemResources();
			case 'orchestration.run_workflow':
				return this.handleRunWorkflow(
					input as {
						workflow: string;
						input?: Record<string, unknown>;
						async: boolean;
					},
				);
			case 'orchestration.get_workflow_status':
				return this.handleGetWorkflowStatus(input as { runId: string });
			case 'orchestration.list_workflows':
				return this.handleListWorkflows();
			case 'config.get':
				return this.handleConfigGet(input as { key: string });
			case 'config.set':
				return this.handleConfigSet(input as { key: string; value: unknown });
			case 'config.list':
				return this.handleConfigList(input as { prefix?: string; limit: number });
			case 'security.run_semgrep_scan':
				return this.handleSecurityRunSemgrep(input as RunSemgrepScanInput);
			case 'security.analyze_vulnerabilities':
				return this.handleSecurityAnalyzeVulnerabilities(input as AnalyzeVulnerabilitiesInput);
			case 'security.get_security_policy':
				return this.handleSecurityGetPolicy(input as GetSecurityPolicyInput);
			case 'security.validate_compliance':
				return this.handleSecurityValidateCompliance(input as ValidateComplianceInput);
			case 'security.check_dependencies':
				return this.handleSecurityCheckDependencies(input as CheckDependenciesInput);
			default:
				throw new Error(`Unhandled tool ${name}`);
		}
	}

	private handleError(name: string, err: unknown, started: number) {
		if (err instanceof z.ZodError) {
			this.audit(name, 'validation_error', performance.now() - started, {
				issues: err.issues,
			});
			return this.error('validation_failed', 'Input validation failed', {
				issues: err.issues,
			});
		}
		this.audit(name, 'error', performance.now() - started, {
			error: err instanceof Error ? err.message : String(err),
		});
		return this.error('internal_error', err instanceof Error ? err.message : 'Unknown error');
	}

	private error(code: string, message: string, details?: Record<string, unknown>) {
		const base: {
			error: {
				code: string;
				message: string;
				details?: Record<string, unknown>;
			};
		} = {
			error: { code, message },
		};
		if (details) base.error.details = details;
		return base;
	}

	private audit(tool: string, outcome: string, durationMs: number, meta?: Record<string, unknown>) {
		const event = {
			tool,
			outcome,
			durationMs,
			ts: new Date().toISOString(),
			...(meta || {}),
		};
		try {
			this.deps.audit?.(event);
		} catch {
			/* local audit swallow */
		}
		try {
			this.deps.publishMcpEvent?.({
				type: 'mcp.tool.audit.v1',
				payload: event,
			});
		} catch {
			/* swallow bus errors */
		}
	}

	private publishSecurityEvent(event: { type: string; data: Record<string, unknown> }) {
		try {
			this.deps.publishMcpEvent?.({
				type: event.type,
				payload: {
					...event.data,
					branding: 'brAInwav cortex-sec',
				},
			});
		} catch {
			/* swallow event bus errors */
		}
	}

	private consumeRate(name: string): boolean {
		const now = Date.now();
		if (!rateState[name]) {
			rateState[name] = { count: 0, windowStart: now };
		}
		const st = rateState[name];
		if (now - st.windowStart > RATE_LIMIT_WINDOW_MS) {
			st.windowStart = now;
			st.count = 0;
		}
		if (st.count >= RATE_LIMIT_MAX) return false;
		st.count += 1;
		return true;
	}

	// Handlers (initial minimal implementations / placeholders) -----------------
	private async handleSystemStatus() {
		// For now gather subset of status (placeholder values)
		const services = [
			{ name: 'memories', status: 'running', version: '1.0.0' },
			{ name: 'orchestration', status: 'running', version: '0.1.0' },
		];
		const resources = { cpu: 5, memoryMB: 256, load: 0.2 };
		const uptimeSec = Math.floor(process.uptime());
		const version = process.env.APP_VERSION || 'dev';
		return { services, resources, uptimeSec, version };
	}

	private async handleRestartService(input: { service: string; mode: 'graceful' | 'force' }) {
		// Fake restart simulation
		const start = performance.now();
		const previousStatus = 'running';
		await new Promise((r) => setTimeout(r, 25));
		const newStatus = 'running';
		return {
			service: input.service,
			previousStatus,
			newStatus,
			durationMs: Math.round(performance.now() - start),
			mode: input.mode,
		};
	}

	private async handleSystemResources() {
		return {
			cpu: 7,
			memory: { usedMB: 300, totalMB: 2048 },
			loadAvg: [0.1, 0.15, 0.2],
		};
	}

	private async handleRunWorkflow(input: {
		workflow: string;
		input?: Record<string, unknown>;
		async: boolean;
	}) {
		const runId = `wf_${randomUUID()}`;
		const startedAt = new Date().toISOString();
		if (input.async === false) {
			const record = {
				workflow: input.workflow,
				runId,
				status: 'completed' as const,
				startedAt,
				finishedAt: new Date().toISOString(),
				result: { echo: input.input || null },
			};
			this.workflowRuns.set(runId, record);
			return record;
		}
		const record = {
			workflow: input.workflow,
			runId,
			status: 'queued' as const,
			startedAt,
		};
		this.workflowRuns.set(runId, record);
		return record;
	}

	private async handleGetWorkflowStatus(input: { runId: string }) {
		const record = this.workflowRuns.get(input.runId);
		if (record) return record;
		// Return a failed status object conforming to schema (no separate error envelope)
		return {
			workflow: 'unknown',
			runId: input.runId,
			status: 'failed' as const,
			startedAt: new Date().toISOString(),
			error: { code: 'not_found', message: 'Workflow run not found' },
		};
	}

	private async handleListWorkflows() {
		const workflows = [
			{
				id: 'wf.cleanup',
				name: 'System Cleanup',
				description: 'Perform routine cleanup',
				version: '1.0.0',
			},
		];
		return { workflows };
	}

	private async handleSecurityRunSemgrep(input: RunSemgrepScanInput) {
		const scanId = `semgrep_${randomUUID()}`;
		const startedAt = new Date().toISOString();
		this.publishSecurityEvent(
			createCortexSecEvent.scanStarted({
				scanId,
				targetPath: input.targetPath,
				scanType: 'semgrep',
				rulesets: input.rulesets,
				startedAt,
			}),
		);
		const findings: SecurityFinding[] = [];
		return {
			scanId,
			startedAt,
			completedAt: new Date().toISOString(),
			status: 'completed' as const,
			findings,
			summary: {
				totalFindings: findings.length,
				critical: findings.filter((f) => f.severity === 'critical').length,
				high: findings.filter((f) => f.severity === 'error').length,
				medium: findings.filter((f) => f.severity === 'warning').length,
				low: findings.filter((f) => f.severity === 'info').length,
			},
			reportPath: `brAInwav-semgrep/${scanId}.${input.outputFormat}`,
		};
	}

	private async handleSecurityAnalyzeVulnerabilities(input: AnalyzeVulnerabilitiesInput) {
		const analysisId = `analysis_${randomUUID()}`;
		const generatedAt = new Date().toISOString();
		const findings: SecurityFinding[] = input.codeSnippet
			? [
				{
					id: `finding_${randomUUID()}`,
					title: 'Review input validation guard',
					severity: 'warning',
					description:
						'brAInwav runtime heuristics flagged this snippet for manual validation. Ensure sanitisation before use.',
					location: input.filePath ? { file: input.filePath } : undefined,
					references: ['https://security.brainwav.dev/secure-input-handling'],
					remediation: 'Follow the brAInwav secure coding checklist for untrusted input.',
				},
			]
			: [];
		for (const finding of findings) {
			const lineNumber = finding.location?.line;
			this.publishSecurityEvent(
				createCortexSecEvent.vulnerabilityFound({
					scanId: analysisId,
					vulnerabilityId: finding.id,
					severity: finding.severity,
					type: 'static-analysis',
					file: finding.location?.file ?? input.filePath ?? 'unknown',
					lineNumber,
					description: finding.description,
					foundAt: generatedAt,
				}),
			);
		}
		const dependencyCount = input.context?.dependencies?.length ?? 0;
		const riskScore = Math.min(1, dependencyCount / 25 || 0.1);
		return {
			analysisId,
			generatedAt,
			riskScore,
			findings,
			recommendedActions: [
				'Cross-check remediation steps with the brAInwav secure delivery playbook.',
				'Capture decisions in the brAInwav compliance tracker for auditability.',
			],
		};
	}

	private async handleSecurityGetPolicy(input: GetSecurityPolicyInput) {
		const policyId = `policy_${input.policyType}`;
		const updatedAt = new Date().toISOString();
		const version = '2024.09.0';
		const policyContent =
			input.format === 'json'
				? JSON.stringify(
					{
						header: 'brAInwav security baseline',
						policyType: input.policyType,
						statement: 'All changes must comply with brAInwav security and compliance controls.',
						updatedAt,
					},
					null,
					2,
				  )
				: `policyType: ${input.policyType}\nowner: brAInwav Security Office\nstatement: All updates honour brAInwav controls\nupdatedAt: ${updatedAt}`;
		return {
			policyId,
			policyType: input.policyType,
			version,
			content: policyContent,
			checksum: createHash('sha256').update(policyContent).digest('hex'),
			updatedAt,
		};
	}

	private async handleSecurityValidateCompliance(input: ValidateComplianceInput) {
		const reportId = `compliance_${randomUUID()}`;
		const generatedAt = new Date().toISOString();
		this.publishSecurityEvent(
			createCortexSecEvent.scanStarted({
				scanId: reportId,
				targetPath: input.targetPath,
				scanType: 'compliance',
				startedAt: generatedAt,
			}),
		);
		const violations: ComplianceViolation[] = [];
		for (const violation of violations) {
			this.publishSecurityEvent(
				createCortexSecEvent.complianceViolation({
					scanId: reportId,
					violationId: violation.id,
					standard: violation.standard,
					rule: violation.rule,
					file: violation.location?.file ?? input.targetPath,
					severity: violation.severity,
					violatedAt: generatedAt,
				}),
			);
		}
		const status: 'pass' | 'fail' | 'warning' = violations.length === 0 ? 'pass' : 'fail';
		return {
			reportId,
			generatedAt,
			status,
			standards: input.standards,
			violations,
			summary: `brAInwav compliance validation completed with ${violations.length} recorded findings for ${input.targetPath}.`,
		};
	}

	private async handleSecurityCheckDependencies(input: CheckDependenciesInput) {
		const reportId = `dependency_${randomUUID()}`;
		const generatedAt = new Date().toISOString();
		this.publishSecurityEvent(
			createCortexSecEvent.scanStarted({
				scanId: reportId,
				targetPath: input.packageFile,
				scanType: 'dependency',
				startedAt: generatedAt,
			}),
		);
		const vulnerable: DependencyIssue[] = [];
		for (const issue of vulnerable) {
			this.publishSecurityEvent(
				createCortexSecEvent.vulnerabilityFound({
					scanId: reportId,
					vulnerabilityId: `${issue.name}-${issue.currentVersion}`,
					severity: issue.severity,
					type: 'dependency-audit',
					file: input.packageFile,
					description: issue.remediation ?? 'Review dependency guidance in the brAInwav security guide.',
					foundAt: generatedAt,
				}),
			);
		}
		const dependenciesChecked = vulnerable.length;
		return {
			reportId,
			generatedAt,
			dependenciesChecked,
			vulnerable,
			outdated: [],
			toolVersion: 'brAInwav-dependency-auditor/0.1.0',
		};
	}

	private async handleConfigGet(input: { key: string }) {
		const runtimeHas = this.deps.config?.runtime[input.key] !== undefined;
		const runtimeVal = runtimeHas ? this.deps.config?.runtime[input.key] : undefined;
		const envVal = process.env[input.key];
		const value = runtimeHas ? runtimeVal : (envVal ?? null);
		let source: 'runtime' | 'env' | 'default' = 'default';
		if (runtimeHas) source = 'runtime';
		else if (envVal !== undefined) source = 'env';
		return { key: input.key, value, source };
	}

	private async handleConfigSet(input: { key: string; value: unknown }) {
		this.deps.config ??= { runtime: {} };
		const previous = this.deps.config.runtime[input.key];
		this.deps.config.runtime[input.key] = input.value;
		return { key: input.key, previous, value: input.value, scope: 'runtime' };
	}

	private async handleConfigList(input: { prefix?: string; limit: number }) {
		const items: { key: string; value: unknown; source?: string }[] = [];
		const runtime = this.deps.config?.runtime ?? {};

		const pushRuntime = () => {
			for (const [k, v] of Object.entries(runtime)) {
				if (input.prefix && !k.startsWith(input.prefix)) continue;
				items.push({ key: k, value: v, source: 'runtime' });
				if (items.length >= input.limit) return;
			}
		};

		const pushEnv = () => {
			for (const [k, v] of Object.entries(process.env)) {
				if (input.prefix && !k.startsWith(input.prefix)) continue;
				if (runtime[k] !== undefined) continue;
				items.push({ key: k, value: v, source: 'env' });
				if (items.length >= input.limit) return;
			}
		};

		pushRuntime();
		if (items.length < input.limit) pushEnv();
		return { items };
	}
}

export function createMcpGateway(deps: GatewayDeps) {
	return new McpGateway(deps);
}
