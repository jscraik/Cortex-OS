import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import type { Logger } from 'pino';
import { loadPolicy, type Policy as OPAPolicy } from '@open-policy-agent/opa-wasm';
import {
	BudgetProfile,
	BudgetUsage,
	CapabilityDescriptor,
	CapabilityTokenError,
} from '../types.js';

const DEFAULT_BRANDING = 'brAInwav';
const DEFAULT_POLICY_VERSION = '1.0.0';

export interface PolicyEvaluationContext {
	tenant: string;
	action: string;
	resource: string;
	capabilities: CapabilityDescriptor[];
	budget?: BudgetProfile;
	currentUsage?: BudgetUsage;
	requiresAudit?: boolean;
	requestCost?: number;
	requestDurationMs?: number;
	requestUnits?: number;
	warnings?: string[];
	decisionId?: string;
}

export interface PolicyEvaluationResult {
	allowed: boolean;
	reason?: string;
	warnings: string[];
	auditRequired: boolean;
	receiptRequired: boolean;
	metadata: {
		policyVersion: string;
		policyHash: string;
		evaluationTimeMs: number;
		branding: string;
	};
}

export interface BrainwavPolicy {
	version: string;
}

export interface PolicyEngineOptions {
	logger: Logger;
	policy?: BrainwavPolicy;
	policyWasmPath?: string;
}

function resolveDefaultWasmPath(): string {
	const dir = fileURLToPath(new URL('.', import.meta.url));
	return resolve(dir, '..', '..', 'policy', 'opa', 'security_policy.wasm');
}

export class PolicyEngine {
	private readonly logger: Logger;
	private readonly policyVersion: string;
	private readonly wasmPath: string;
	private opaInstancePromise?: Promise<OPAPolicy>;
	private policyHash?: string;

	constructor(options: PolicyEngineOptions) {
		this.logger = options.logger.child({ component: 'policy-engine', branding: DEFAULT_BRANDING });
		this.policyVersion = options.policy?.version ?? DEFAULT_POLICY_VERSION;
		this.wasmPath = options.policyWasmPath ?? resolveDefaultWasmPath();
	}

	private async loadPolicy(): Promise<OPAPolicy> {
		if (!this.opaInstancePromise) {
			this.opaInstancePromise = (async () => {
				this.logger.debug({ wasmPath: this.wasmPath }, 'Loading OPA policy');
				const wasmBuffer = await readFile(this.wasmPath);
				this.policyHash = createHash('sha256').update(wasmBuffer).digest('hex');
				const policy = await loadPolicy(wasmBuffer);
				await policy.setData({});
				this.logger.info({ policyVersion: this.policyVersion, policyHash: this.policyHash }, 'OPA policy loaded');
				return policy;
			})();
		}

		return await this.opaInstancePromise;
	}

	async evaluateToolRequest(context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
		if (!context.capabilities?.length) {
			throw new CapabilityTokenError('No capabilities provided for policy evaluation');
		}

		const start = performance.now();
		const opa = await this.loadPolicy();

		const evaluationInput = this.buildInput(context);
		const evaluation = await opa.evaluate(evaluationInput);
		const decision = Array.isArray(evaluation) && evaluation.length > 0 ? evaluation[0]?.result ?? {} : {};

		const allowed = Boolean(decision?.allow);
		const reason = typeof decision?.reason === 'string' ? decision.reason : undefined;
		const auditRequired = Boolean(decision?.audit_required ?? context.requiresAudit);
		const warnings = Array.isArray(decision?.warnings) ? decision.warnings : context.warnings ?? [];
		const evaluationTimeMs = performance.now() - start;

		return {
			allowed,
			reason,
			warnings,
			auditRequired,
			receiptRequired: false,
			metadata: {
				policyVersion: this.policyVersion,
				policyHash: this.policyHash ?? 'unknown',
				evaluationTimeMs,
				branding: DEFAULT_BRANDING,
			},
		};
	}

	updatePolicy(policy: BrainwavPolicy): void {
		this.logger.info({ oldVersion: this.policyVersion, newVersion: policy.version }, 'Policy version updated');
	}

	private buildInput(context: PolicyEvaluationContext) {
		const currentUsage: BudgetUsage = context.currentUsage ?? {
			totalReq: 0,
			totalDurationMs: 0,
			totalCost: 0,
			updatedAt: new Date().toISOString(),
		};

		return {
			policy_version: this.policyVersion,
			policy_hash: this.policyHash,
			decision_id: context.decisionId ?? `decision-${Date.now()}`,
			tenant: context.tenant,
			action: context.action,
			resource: context.resource,
			capabilities: context.capabilities.map((capability) => ({
				action: capability.action,
				resource_prefix: capability.resourcePrefix,
				tenant: capability.tenant,
				max_cost: capability.maxCost,
				revoked: false,
			})),
			budget: context.budget
				? {
					max_total_req: context.budget.maxTotalReq,
					max_total_cost: context.budget.maxTotalCost,
					max_total_duration_ms: context.budget.maxTotalDurationMs,
				}
				: undefined,
			current_usage: {
				total_req: currentUsage.totalReq,
				total_cost: currentUsage.totalCost ?? 0,
				total_duration_ms: currentUsage.totalDurationMs ?? 0,
			},
			request_units: context.requestUnits ?? 1,
			requires_audit: context.requiresAudit ?? false,
			request_cost: context.requestCost ?? 0,
			request_duration_ms: context.requestDurationMs ?? 0,
			warnings: context.warnings ?? [],
		};
	}
}

export const DEFAULT_BRAINWAV_POLICY: BrainwavPolicy = {
	version: DEFAULT_POLICY_VERSION,
};
