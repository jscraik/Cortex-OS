import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'yaml';
import {
	BudgetError,
	type BudgetProfile,
	BudgetProfileSchema,
	type BudgetReconciliationResult,
	type BudgetUsage,
	BudgetUsageSchema,
} from '../types.js';

const DEFAULT_BUDGET_PATH = resolve(process.cwd(), '.budget.yml');

type RawBudgetProfile = {
	max_total_req?: number;
	max_total_duration_ms?: number;
	max_total_cost?: number;
};

type RawBudgetFile = {
	budgets?: Record<string, RawBudgetProfile>;
};

export interface BudgetManagerOptions {
	budgetFilePath?: string;
	clock?: () => number;
}

export interface BudgetEvaluationInput {
	profileName: string;
	currentUsage: BudgetUsage;
	requestUnits?: number;
	requestCost?: number;
	requestDurationMs?: number;
}

function normalizeProfile(name: string, raw: RawBudgetProfile): BudgetProfile {
	return BudgetProfileSchema.parse({
		name,
		maxTotalReq: raw.max_total_req,
		maxTotalDurationMs: raw.max_total_duration_ms,
		maxTotalCost: raw.max_total_cost ?? raw.max_total_duration_ms,
	});
}

function createEmptyUsage(nowIso: string): BudgetUsage {
	return BudgetUsageSchema.parse({
		totalReq: 0,
		totalDurationMs: 0,
		totalCost: 0,
		updatedAt: nowIso,
	});
}

export class BudgetManager {
	private readonly budgetFilePath: string;
	private readonly clock: () => number;
	private profiles = new Map<string, BudgetProfile>();

	constructor(options: BudgetManagerOptions = {}) {
		this.budgetFilePath = options.budgetFilePath ?? DEFAULT_BUDGET_PATH;
		this.clock = options.clock ?? (() => Date.now());
		this.refresh();
	}

	refresh(): void {
		if (!existsSync(this.budgetFilePath)) {
			throw new BudgetError('Budget configuration file not found', {
				budgetFilePath: this.budgetFilePath,
			});
		}

		try {
			const fileContents = readFileSync(this.budgetFilePath, 'utf8');
			const parsed = yaml.parse(fileContents) as RawBudgetFile;
			const budgets = parsed?.budgets ?? {};

			this.profiles = new Map<string, BudgetProfile>(
				Object.entries(budgets).map(([name, raw]) => [name, normalizeProfile(name, raw ?? {})]),
			);
		} catch (error) {
			throw new BudgetError('Failed to parse budget configuration', {
				budgetFilePath: this.budgetFilePath,
				error,
			});
		}
	}

	getProfile(name: string): BudgetProfile {
		const profile = this.profiles.get(name);
		if (!profile) {
			throw new BudgetError('Budget profile not found', { profile: name });
		}
		return profile;
	}

	listProfiles(): BudgetProfile[] {
		return Array.from(this.profiles.values());
	}

	evaluate(input: BudgetEvaluationInput): BudgetReconciliationResult {
		const profile = this.getProfile(input.profileName);
		const requestUnits = input.requestUnits ?? 1;
		const nowIso = new Date(this.clock()).toISOString();

		const projected: BudgetUsage = {
			totalReq: input.currentUsage.totalReq + requestUnits,
			totalDurationMs:
				input.currentUsage.totalDurationMs !== undefined || input.requestDurationMs !== undefined
					? (input.currentUsage.totalDurationMs ?? 0) + (input.requestDurationMs ?? 0)
					: undefined,
			totalCost:
				input.currentUsage.totalCost !== undefined || input.requestCost !== undefined
					? (input.currentUsage.totalCost ?? 0) + (input.requestCost ?? 0)
					: undefined,
			updatedAt: nowIso,
		};

		let reason: BudgetReconciliationResult['reason'];

		if (profile.maxTotalReq !== undefined && projected.totalReq > profile.maxTotalReq) {
			reason = 'max_total_req_exceeded';
		}

		if (
			!reason &&
			profile.maxTotalDurationMs !== undefined &&
			projected.totalDurationMs !== undefined
		) {
			if (projected.totalDurationMs > profile.maxTotalDurationMs) {
				reason = 'max_total_duration_exceeded';
			}
		}

		if (!reason && profile.maxTotalCost !== undefined && projected.totalCost !== undefined) {
			if (projected.totalCost > profile.maxTotalCost) {
				reason = 'max_total_cost_exceeded';
			}
		}

		return {
			withinLimits: !reason,
			reason,
			projectedUsage: BudgetUsageSchema.parse(projected),
		};
	}

	createEmptyUsage(): BudgetUsage {
		return createEmptyUsage(new Date(this.clock()).toISOString());
	}
}

export interface BudgetLedgerRecordOptions {
	profileName: string;
	tenantKey: string;
	requestUnits?: number;
	requestCost?: number;
	requestDurationMs?: number;
}

export class BudgetLedger {
	private readonly usageByTenant = new Map<string, BudgetUsage>();

	constructor(
		private readonly manager: BudgetManager,
		private readonly clock: () => number = () => Date.now(),
	) {}

	getUsage(tenantKey: string): BudgetUsage {
		const usage = this.usageByTenant.get(tenantKey);
		return usage ?? this.manager.createEmptyUsage();
	}

	record(options: BudgetLedgerRecordOptions): BudgetReconciliationResult {
		const current = this.getUsage(options.tenantKey);
		const evaluation = this.manager.evaluate({
			profileName: options.profileName,
			currentUsage: current,
			requestUnits: options.requestUnits,
			requestCost: options.requestCost,
			requestDurationMs: options.requestDurationMs,
		});

		if (evaluation.withinLimits) {
			this.usageByTenant.set(options.tenantKey, {
				...evaluation.projectedUsage,
				updatedAt: new Date(this.clock()).toISOString(),
			});
		}

		return evaluation;
	}

	reset(tenantKey: string): void {
		this.usageByTenant.delete(tenantKey);
	}

	resetAll(): void {
		this.usageByTenant.clear();
	}
}
