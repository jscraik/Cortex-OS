/**
 * REF‑RAG Budget Configuration
 *
 * Defines risk-class specific budget presets and allocation strategies
 * for tri-band context management.
 */

import type { RiskClass, RiskClassBudgets, BandBudgets } from './types.js';

/**
 * Default budget presets for each risk class
 */
export const DEFAULT_BUDGETS: RiskClassBudgets = {
	[RiskClass.LOW]: {
		bandA: 4000, // 4K tokens for full text
		bandB: 8000, // 8K virtual tokens
		bandC: 100, // 100 structured facts
		overrides: {
			maxBandAChunks: 15,
			maxBandBChunks: 30,
			maxBandCFacts: 50,
		},
	},
	[RiskClass.MEDIUM]: {
		bandA: 6000, // 6K tokens for more context
		bandB: 12000, // 12K virtual tokens
		bandC: 200, // 200 structured facts
		overrides: {
			maxBandAChunks: 25,
			maxBandBChunks: 50,
			maxBandCFacts: 100,
		},
	},
	[RiskClass.HIGH]: {
		bandA: 8000, // 8K tokens for comprehensive coverage
		bandB: 16000, // 16K virtual tokens
		bandC: 400, // 400 structured facts
		overrides: {
			maxBandAChunks: 40,
			maxBandBChunks: 80,
			maxBandCFacts: 200,
		},
	},
	[RiskClass.CRITICAL]: {
		bandA: 12000, // 12K tokens for maximum coverage
		bandB: 24000, // 24K virtual tokens
		bandC: 800, // 800 structured facts
		overrides: {
			maxBandAChunks: 60,
			maxBandBChunks: 120,
			maxBandCFacts: 400,
		},
	},
};

/**
 * Conservative budget presets for resource-constrained environments
 */
export const CONSERVATIVE_BUDGETS: RiskClassBudgets = {
	[RiskClass.LOW]: {
		bandA: 2000,
		bandB: 4000,
		bandC: 50,
		overrides: {
			maxBandAChunks: 8,
			maxBandBChunks: 15,
			maxBandCFacts: 25,
		},
	},
	[RiskClass.MEDIUM]: {
		bandA: 3000,
		bandB: 6000,
		bandC: 100,
		overrides: {
			maxBandAChunks: 12,
			maxBandBChunks: 25,
			maxBandCFacts: 50,
		},
	},
	[RiskClass.HIGH]: {
		bandA: 4000,
		bandB: 8000,
		bandC: 200,
		overrides: {
			maxBandAChunks: 20,
			maxBandBChunks: 40,
			maxBandCFacts: 100,
		},
	},
	[RiskClass.CRITICAL]: {
		bandA: 6000,
		bandB: 12000,
		bandC: 400,
		overrides: {
			maxBandAChunks: 30,
			maxBandBChunks: 60,
			maxBandCFacts: 200,
		},
	},
};

/**
 * Aggressive budget presets for high-quality applications
 */
export const AGGRESSIVE_BUDGETS: RiskClassBudgets = {
	[RiskClass.LOW]: {
		bandA: 6000,
		bandB: 12000,
		bandC: 150,
		overrides: {
			maxBandAChunks: 20,
			maxBandBChunks: 40,
			maxBandCFacts: 75,
		},
	},
	[RiskClass.MEDIUM]: {
		bandA: 8000,
		bandB: 16000,
		bandC: 300,
		overrides: {
			maxBandAChunks: 30,
			maxBandBChunks: 60,
			maxBandCFacts: 150,
		},
	},
	[RiskClass.HIGH]: {
		bandA: 10000,
		bandB: 20000,
		bandC: 600,
		overrides: {
			maxBandAChunks: 50,
			maxBandBChunks: 100,
			maxBandCFacts: 300,
		},
	},
	[RiskClass.CRITICAL]: {
		bandA: 16000,
		bandB: 32000,
		bandC: 1200,
		overrides: {
			maxBandAChunks: 80,
			maxBandBChunks: 160,
			maxBandCFacts: 600,
		},
	},
};

/**
 * Budget profile names
 */
export type BudgetProfile = 'default' | 'conservative' | 'aggressive' | 'custom';

/**
 * Predefined budget profiles
 */
export const BUDGET_PROFILES: Record<BudgetProfile, RiskClassBudgets> = {
	default: DEFAULT_BUDGETS,
	conservative: CONSERVATIVE_BUDGETS,
	aggressive: AGGRESSIVE_BUDGETS,
	custom: DEFAULT_BUDGETS, // Should be overridden by user config
};

/**
 * Get budget configuration for a specific risk class
 */
export function getBudgetForRiskClass(
	riskClass: RiskClass,
	profile: BudgetProfile = 'default',
	customBudgets?: Partial<RiskClassBudgets>,
): BandBudgets {
	const baseBudgets = BUDGET_PROFILES[profile];
	const riskBudgets = baseBudgets[riskClass];

	// Apply custom overrides if provided
	if (customBudgets?.[riskClass]) {
		const custom = customBudgets[riskClass];
		return {
			bandA: custom.bandA ?? riskBudgets.bandA,
			bandB: custom.bandB ?? riskBudgets.bandB,
			bandC: custom.bandC ?? riskBudgets.bandC,
			overrides: {
				...riskBudgets.overrides,
				...custom.overrides,
			},
		};
	}

	return riskBudgets;
}

/**
 * Validate budget configuration
 */
export function validateBudgets(budgets: RiskClassBudgets): string[] {
	const errors: string[] = [];

	for (const [riskClass, bandBudgets] of Object.entries(budgets)) {
		// Validate band budgets
		if (bandBudgets.bandA <= 0) {
			errors.push(`${riskClass}: bandA budget must be positive`);
		}
		if (bandBudgets.bandB <= 0) {
			errors.push(`${riskClass}: bandB budget must be positive`);
		}
		if (bandBudgets.bandC <= 0) {
			errors.push(`${riskClass}: bandC budget must be positive`);
		}

		// Validate overrides
		const overrides = bandBudgets.overrides;
		if (overrides) {
			if (overrides.maxBandAChunks && overrides.maxBandAChunks <= 0) {
				errors.push(`${riskClass}: maxBandAChunks must be positive`);
			}
			if (overrides.maxBandBChunks && overrides.maxBandBChunks <= 0) {
				errors.push(`${riskClass}: maxBandBChunks must be positive`);
			}
			if (overrides.maxBandCFacts && overrides.maxBandCFacts <= 0) {
				errors.push(`${riskClass}: maxBandCFacts must be positive`);
			}
		}

		// Validate budget ratios (reasonable constraints)
		const bandAToBRatio = bandBudgets.bandA / bandBudgets.bandB;
		if (bandAToBRatio > 2.0) {
			errors.push(`${riskClass}: bandA budget is more than 2x bandB budget (consider balance)`);
		}
		if (bandAToBRatio < 0.25) {
			errors.push(`${riskClass}: bandA budget is less than 25% of bandB budget (consider more full text)`);
		}
	}

	return errors;
}

/**
 * Create custom budget configuration
 */
export function createCustomBudgets(
	baseProfile: BudgetProfile = 'default',
	overrides: Partial<RiskClassBudgets> = {},
): RiskClassBudgets {
	const baseBudgets = BUDGET_PROFILES[baseProfile];
	const customBudgets: RiskClassBudgets = {} as RiskClassBudgets;

	// Deep merge base budgets with overrides
	for (const riskClass of Object.values(RiskClass)) {
		const baseBudget = baseBudgets[riskClass];
		const override = overrides[riskClass];

		customBudgets[riskClass] = {
			bandA: override?.bandA ?? baseBudget.bandA,
			bandB: override?.bandB ?? baseBudget.bandB,
			bandC: override?.bandC ?? baseBudget.bandC,
			overrides: {
				...baseBudget.overrides,
				...override?.overrides,
			},
		};
	}

	return customBudgets;
}

/**
 * Budget estimation utilities
 */
export const BudgetEstimator = {
	/**
	 * Estimate token count for a chunk (rough approximation)
	 */
	estimateTokens(text: string): number {
		// Rough estimate: 1 token ≈ 4 characters
		return Math.ceil(text.length / 4);
	},

	/**
	 * Estimate virtual token count for compressed embeddings
	 */
	estimateVirtualTokens(
		originalDimensions: number,
		compressedDimensions: number,
	): number {
		// Virtual tokens roughly correspond to compressed dimensions
		return Math.ceil(compressedDimensions * 1.5); // Slight overhead for metadata
	},

	/**
	 * Estimate fact extraction capacity
	 */
	estimateFactCapacity(textLength: number): number {
		// Rough estimate: 1 fact per 200 characters of text
		return Math.ceil(textLength / 200);
	},

	/**
	 * Check if allocation fits within budget
	 */
	fitsBudget(
		allocation: { bandA: number; bandB: number; bandC: number },
		budget: BandBudgets,
	): boolean {
		return (
			allocation.bandA <= budget.bandA &&
			allocation.bandB <= budget.bandB &&
			allocation.bandC <= budget.bandC
		);
	},

	/**
	 * Calculate budget utilization percentage
	 */
	calculateUtilization(
		allocation: { bandA: number; bandB: number; bandC: number },
		budget: BandBudgets,
	): { bandA: number; bandB: number; bandC: number; overall: number } {
		const bandAUtil = (allocation.bandA / budget.bandA) * 100;
		const bandBUtil = (allocation.bandB / budget.bandB) * 100;
		const bandCUtil = (allocation.bandC / budget.bandC) * 100;
		const overallUtil = (bandAUtil + bandBUtil + bandCUtil) / 3;

		return {
			bandA: Math.min(bandAUtil, 100),
			bandB: Math.min(bandBUtil, 100),
			bandC: Math.min(bandCUtil, 100),
			overall: Math.min(overallUtil, 100),
		};
	},
};

/**
 * Environment-based budget configuration
 */
export function getEnvironmentBudgets(): RiskClassBudgets {
	const environment = process?.env?.REFRAG_ENV || 'development';
	const profile = process?.env?.REFRAG_BUDGET_PROFILE as BudgetProfile || 'default';

	// Return appropriate budgets based on environment
	switch (environment) {
		case 'production':
			return profile === 'custom' ?
				createCustomBudgets(profile, parseCustomBudgetsEnv()) :
				BUDGET_PROFILES[profile] || DEFAULT_BUDGETS;

		case 'staging':
			return CONSERVATIVE_BUDGETS; // Conservative for staging

		case 'development':
		default:
			return DEFAULT_BUDGETS; // Default for development
	}
}

/**
 * Parse custom budget overrides from environment variables
 */
function parseCustomBudgetsEnv(): Partial<RiskClassBudgets> {
	const customBudgets: Partial<RiskClassBudgets> = {};

	// Parse environment variables like REFRAG_LOW_BAND_A=6000
	for (const riskClass of Object.values(RiskClass)) {
		const prefix = `REFRAG_${riskClass.toUpperCase()}`;
		const bandA = process.env[`${prefix}_BAND_A`];
		const bandB = process.env[`${prefix}_BAND_B`];
		const bandC = process.env[`${prefix}_BAND_C`];

		if (bandA || bandB || bandC) {
			customBudgets[riskClass] = {
				bandA: bandA ? parseInt(bandA, 10) : undefined,
				bandB: bandB ? parseInt(bandB, 10) : undefined,
				bandC: bandC ? parseInt(bandC, 10) : undefined,
			};
		}
	}

	return customBudgets;
}