/**
 * REF‑RAG (Risk-Enhanced Fact Retrieval) Module
 *
 * Main entry point for the tri-band context system that provides
 * risk-aware retrieval with virtual tokens and structured facts.
 */

import type { RefRagConfig } from './types.js';

// Type exports
export type {
        QueryGuardResult,
        ExpansionHint,
        StructuredFact,
        BandAContext,
        BandBContext,
        BandCContext,
        BandContext,
        HybridContextPack,
        BudgetUsage,
        RelevanceScore,
        ExpansionPlan,
        VerificationResult,
        VerificationIssue,
        EscalationTrace,
        EscalationStep,
        RefRagConfig,
        RiskClassBudgets,
        BandBudgets,
        RefRagPipeline,
        RefRagProcessOptions,
        TriBandGenerationRequest,
        FactExtractionResult,
        CompressionEncodingResult,
} from './types.js';

// Enum exports
export { RiskClass, ContextBand } from './types.js';

// Budget configuration exports
export {
	DEFAULT_BUDGETS,
	CONSERVATIVE_BUDGETS,
	AGGRESSIVE_BUDGETS,
	BUDGET_PROFILES,
	getBudgetForRiskClass,
	validateBudgets,
	createCustomBudgets,
	BudgetEstimator,
	getEnvironmentBudgets,
} from './budgets.js';

export type { BudgetProfile } from './budgets.js';

// Default configuration
export const DEFAULT_REF_RAG_CONFIG: RefRagConfig = {
        enabled: false, // Disabled by default for safety
        budgets: {
		low: {
			bandA: 4000,
			bandB: 8000,
			bandC: 100,
			overrides: {
				maxBandAChunks: 15,
				maxBandBChunks: 30,
				maxBandCFacts: 50,
			},
		},
		medium: {
			bandA: 6000,
			bandB: 12000,
			bandC: 200,
			overrides: {
				maxBandAChunks: 25,
				maxBandBChunks: 50,
				maxBandCFacts: 100,
			},
		},
		high: {
			bandA: 8000,
			bandB: 16000,
			bandC: 400,
			overrides: {
				maxBandAChunks: 40,
				maxBandBChunks: 80,
				maxBandCFacts: 200,
			},
		},
		critical: {
			bandA: 12000,
			bandB: 24000,
			bandC: 800,
			overrides: {
				maxBandAChunks: 60,
				maxBandBChunks: 120,
				maxBandCFacts: 400,
			},
		},
	},
	queryGuard: {
		enableKeywordDetection: true,
		enableDomainClassification: true,
		enableEntityExtraction: true,
		customRiskKeywords: {
			// Medical domains
			medical: [
				'diagnosis', 'symptom', 'treatment', 'medication', 'dosage',
				'side effect', 'contraindication', 'prescription', 'therapy',
			],
			// Financial domains
			financial: [
				'investment', 'portfolio', 'returns', 'risk', 'asset',
				'dividend', 'interest', 'inflation', 'market', 'stock',
			],
			// Safety-critical domains
			safety: [
				'safety', 'hazard', 'emergency', 'protocol', 'procedure',
				'warning', 'caution', 'danger', 'critical', 'failure',
			],
			// Legal domains
			legal: [
				'legal', 'law', 'contract', 'liability', 'compliance',
				'regulation', 'statute', 'jurisdiction', 'litigation',
			],
		},
	},
	relevancePolicy: {
		enableDuplicationPenalty: true,
		enableFreshnessBonus: true,
		enableDomainBonus: true,
		similarityWeight: 0.6,
		freshnessWeight: 0.2,
		diversityWeight: 0.2,
	},
	expansion: {
		enableMandatoryExpansion: true,
		maxDiversityEnforcement: 0.7,
		minRelevanceThreshold: 0.3,
	},
	verification: {
		enablePostGenerationCheck: true,
		enableNumericalTrace: true,
		enableCitationValidation: true,
		maxEscalationAttempts: 1,
		confidenceThreshold: 0.8,
	},
	factExtraction: {
		enableNumericExtraction: true,
		enableQuoteExtraction: true,
		enableCodeExtraction: true,
		enableDateExtraction: true,
		confidenceThreshold: 0.7,
	},
        virtualTokens: {
                enableCompression: true,
                compressionMethod: 'projection',
                targetCompressionRatio: 0.25, // Compress to 25% of original size
                projectionWeightsPath: process.env.REFRAG_PROJECTION_PATH,
        },
};

/**
 * Create REF‑RAG configuration with environment overrides
 */
export function createRefRagConfig(
	overrides: Partial<RefRagConfig> = {},
): RefRagConfig {
	const baseConfig = { ...DEFAULT_REF_RAG_CONFIG };

	// Apply environment overrides
	const envOverrides = getEnvironmentConfigOverrides();

	// Merge configurations (environment < user overrides < defaults)
	return mergeConfigs(baseConfig, envOverrides, overrides);
}

/**
 * Get environment-based configuration overrides
 */
function getEnvironmentConfigOverrides(): Partial<RefRagConfig> {
	const overrides: Partial<RefRagConfig> = {};

	// Feature flag
	if (process.env.REFRAG_ENABLED !== undefined) {
		overrides.enabled = process.env.REFRAG_ENABLED === 'true';
	}

	// Budget profile
	const budgetProfile = process.env.REFRAG_BUDGET_PROFILE as 'default' | 'conservative' | 'aggressive';
	if (budgetProfile && ['default', 'conservative', 'aggressive'].includes(budgetProfile)) {
		// Use appropriate budget profile
		const { getBudgetForRiskClass } = require('./budgets.js');
		for (const riskClass of ['low', 'medium', 'high', 'critical'] as const) {
			if (!overrides.budgets) overrides.budgets = {} as any;
			(overrides.budgets as any)[riskClass] = getBudgetForRiskClass(
				riskClass as any,
				budgetProfile,
			);
		}
	}

	// Feature toggles
	if (process.env.REFRAG_ENABLE_VERIFICATION !== undefined) {
		if (!overrides.verification) overrides.verification = {} as any;
		overrides.verification.enablePostGenerationCheck = process.env.REFRAG_ENABLE_VERIFICATION === 'true';
	}

	if (process.env.REFRAG_ENABLE_FACT_EXTRACTION !== undefined) {
		if (!overrides.factExtraction) overrides.factExtraction = {} as any;
		overrides.factExtraction.enableNumericExtraction = process.env.REFRAG_ENABLE_FACT_EXTRACTION === 'true';
	}

	if (process.env.REFRAG_ENABLE_VIRTUAL_TOKENS !== undefined) {
		if (!overrides.virtualTokens) overrides.virtualTokens = {} as any;
		overrides.virtualTokens.enableCompression = process.env.REFRAG_ENABLE_VIRTUAL_TOKENS === 'true';
	}

	// Thresholds
	const confidenceThreshold = process.env.REFRAG_CONFIDENCE_THRESHOLD;
	if (confidenceThreshold) {
		const threshold = parseFloat(confidenceThreshold);
		if (!isNaN(threshold) && threshold >= 0 && threshold <= 1) {
			if (!overrides.verification) overrides.verification = {} as any;
			overrides.verification.confidenceThreshold = threshold;
		}
	}

	const factExtractionThreshold = process.env.REFRAG_FACT_EXTRACTION_THRESHOLD;
	if (factExtractionThreshold) {
		const threshold = parseFloat(factExtractionThreshold);
		if (!isNaN(threshold) && threshold >= 0 && threshold <= 1) {
			if (!overrides.factExtraction) overrides.factExtraction = {} as any;
			overrides.factExtraction.confidenceThreshold = threshold;
		}
	}

	return overrides;
}

/**
 * Deep merge multiple configuration objects
 */
function mergeConfigs(...configs: Array<Partial<RefRagConfig>>): RefRagConfig {
	const result: any = {};

	for (const config of configs) {
		for (const [key, value] of Object.entries(config || {})) {
			if (value === undefined) continue;

			if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
				// Deep merge nested objects
				result[key] = { ...(result[key] || {}), ...value };
			} else {
				// Direct assignment for primitive values
				result[key] = value;
			}
		}
	}

	return result as RefRagConfig;
}

/**
 * Validate REF‑RAG configuration
 */
export function validateRefRagConfig(config: RefRagConfig): string[] {
	const errors: string[] = [];

	// Basic validation
	if (typeof config.enabled !== 'boolean') {
		errors.push('enabled must be a boolean');
	}

	// Validate budgets if enabled
	if (config.enabled) {
		const { validateBudgets } = require('./budgets.js');
		const budgetErrors = validateBudgets(config.budgets);
		errors.push(...budgetErrors);
	}

	// Validate threshold values
	if (config.verification?.confidenceThreshold !== undefined) {
		const threshold = config.verification.confidenceThreshold;
		if (threshold < 0 || threshold > 1) {
			errors.push('verification.confidenceThreshold must be between 0 and 1');
		}
	}

	if (config.factExtraction?.confidenceThreshold !== undefined) {
		const threshold = config.factExtraction.confidenceThreshold;
		if (threshold < 0 || threshold > 1) {
			errors.push('factExtraction.confidenceThreshold must be between 0 and 1');
		}
	}

	// Validate weight values
	if (config.relevancePolicy) {
		const { similarityWeight, freshnessWeight, diversityWeight } = config.relevancePolicy;
		const totalWeight = (similarityWeight || 0) + (freshnessWeight || 0) + (diversityWeight || 0);
		if (Math.abs(totalWeight - 1.0) > 0.1) {
			errors.push(`relevancePolicy weights should sum to ~1.0 (got ${totalWeight})`);
		}
	}

	// Validate compression settings
	if (config.virtualTokens?.enableCompression) {
		const targetRatio = config.virtualTokens.targetCompressionRatio;
		if (targetRatio <= 0 || targetRatio >= 1) {
			errors.push('virtualTokens.targetCompressionRatio must be between 0 and 1');
		}
	}

	return errors;
}

/**
 * Check if REF‑RAG is properly configured
 */
export function isRefRagReady(config: RefRagConfig): boolean {
	const errors = validateRefRagConfig(config);
	if (errors.length > 0) {
		return false;
	}

	// Check if required dependencies are available
	if (config.enabled) {
		// Verify projection weights path if compression is enabled
		if (config.virtualTokens?.enableCompression &&
			config.virtualTokens.compressionMethod === 'projection' &&
			!config.virtualTokens.projectionWeightsPath) {
			console.warn('REF‑RAG: Virtual token compression enabled but no projection weights path provided');
			return false;
		}
	}

	return true;
}

/**
 * Get REF‑RAG status information
 */
export function getRefRagStatus(config: RefRagConfig): {
	enabled: boolean;
	ready: boolean;
	errors: string[];
	warnings: string[];
	configuration: {
		budgetProfile: string;
		compressionEnabled: boolean;
		verificationEnabled: boolean;
		factExtractionEnabled: boolean;
	};
} {
	const errors = validateRefRagConfig(config);
	const warnings: string[] = [];

	// Add warnings for potentially problematic configurations
	if (config.enabled) {
		if (!config.verification?.enablePostGenerationCheck) {
			warnings.push('Post-generation verification is disabled');
		}

		if (!config.factExtraction?.enableNumericExtraction) {
			warnings.push('Numeric fact extraction is disabled');
		}

		if (config.verification?.confidenceThreshold && config.verification.confidenceThreshold < 0.7) {
			warnings.push('Low confidence threshold may result in poor quality answers');
		}
	}

	return {
		enabled: config.enabled,
		ready: isRefRagReady(config),
		errors,
		warnings,
		configuration: {
			budgetProfile: 'custom', // Would need more complex logic to detect
			compressionEnabled: config.virtualTokens?.enableCompression || false,
			verificationEnabled: config.verification?.enablePostGenerationCheck || false,
			factExtractionEnabled: config.factExtraction?.enableNumericExtraction || false,
		},
	};
}

// Fact extraction and compression exports
export { FactExtractor, createFactExtractor, CompressionEncoder, createCompressionEncoder } from './fact-extractor.js';
export type { FactExtractorConfig } from './fact-extractor.js';

// Query guard exports
export { QueryGuard, createQueryGuard } from './query-guard.js';
export type { QueryGuardConfig } from './query-guard.js';

// Relevance policy exports
export { RelevancePolicy, createRelevancePolicy } from './relevance-policy.js';
export type { RelevancePolicyConfig } from './relevance-policy.js';

// Pipeline exports
export { RefRagPipelineImpl, createRefRagPipeline } from './pipeline.js';

// Re-export for convenience
export * from '../lib/types.js';