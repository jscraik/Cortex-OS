/**
 * REF‑RAG Tri-band Context Types
 *
 * Provides type definitions for the Risk-Enhanced Fact Retrieval system
 * that implements tri-band context with virtual tokens and structured facts.
 */

import type { Chunk } from '../lib/types.js';
export type { Chunk } from '../lib/types.js';

/**
 * Risk classification for query guarding
 */
export enum RiskClass {
	/** Low risk: general knowledge, safe domains */
	LOW = 'low',
	/** Medium risk: requires some verification */
	MEDIUM = 'medium',
	/** High risk: safety-critical, medical, financial */
	HIGH = 'high',
	/** Critical risk: life-safety, security decisions */
	CRITICAL = 'critical',
}

/**
 * Context band types for tri-band retrieval
 */
export enum ContextBand {
	/** Band A: Full text for high-value chunks */
	A = 'A',
	/** Band B: Virtual tokens for compressed context */
	B = 'B',
	/** Band C: Structured facts for precise data */
	C = 'C',
}

/**
 * Query guard analysis result
 */
export interface QueryGuardResult {
	/** Risk classification */
	riskClass: RiskClass;
	/** Hard requirements that must be satisfied */
	hardRequirements: string[];
	/** Expansion hints for retrieval optimization */
	expansionHints: ExpansionHint[];
	/** Processing metadata */
	metadata: {
		confidence: number;
		processingTimeMs: number;
		detectedEntities: string[];
		detectedDomains: string[];
	};
}

/**
 * Expansion hints guide retrieval optimization
 */
export interface ExpansionHint {
	/** Type of expansion hint */
	type: 'domain' | 'entity' | 'temporal' | 'numeric' | 'code';
	/** Hint value */
	value: string;
	/** Priority weight for expansion */
	priority: number;
	/** Whether this is mandatory */
	mandatory: boolean;
}

/**
 * Individual fact extracted for Band C
 */
export interface StructuredFact {
	/** Fact identifier */
	id: string;
	/** Type of fact */
	type: 'number' | 'quote' | 'code' | 'date' | 'entity' | 'measurement';
	/** Extracted value */
	value: string | number | boolean;
	/** Original text context */
	context: string;
	/** Source chunk ID */
	chunkId: string;
	/** Confidence score */
	confidence: number;
	/** Additional metadata */
	metadata?: {
		unit?: string;
		precision?: number;
		source?: string;
		[C: string]: unknown;
	};
}

/**
 * Band A context - full text chunks
 */
export interface BandAContext {
	/** Band identifier */
	band: ContextBand.A;
	/** Text content */
	text: string;
	/** Source citation */
	citation: {
		id: string;
		source?: string;
		text: string;
		score: number;
	};
	/** Position in original document */
	position?: {
		start: number;
		end: number;
	};
}

/**
 * Band B context - virtual token embeddings
 */
export interface BandBContext {
	/** Band identifier */
	band: ContextBand.B;
	/** Virtual token embeddings (compressed representation) */
	virtualTokens: Float32Array;
	/** Original chunk reference */
	chunkRef: {
		id: string;
		source?: string;
		score: number;
	};
	/** Compression metadata */
	compression: {
		originalLength: number;
		compressedLength: number;
		compressionRatio: number;
		method: 'projection' | 'quantization' | 'hybrid';
	};
}

/**
 * Band C context - structured facts
 */
export interface BandCContext {
	/** Band identifier */
	band: ContextBand.C;
	/** Structured facts extracted from chunks */
	facts: StructuredFact[];
	/** Source chunk reference */
	chunkRef: {
		id: string;
		source?: string;
		score: number;
	};
	/** Extraction metadata */
	extraction: {
		method: 'regex' | 'parser' | 'ml';
		confidence: number;
		timestamp: number;
	};
}

/**
 * Union type for all context bands
 */
export type BandContext = BandAContext | BandBContext | BandCContext;

/**
 * Tri-band context pack for generation
 */
export interface HybridContextPack {
	/** Query guard analysis */
	queryGuard: QueryGuardResult;
	/** Band A contexts */
	bandA: BandAContext[];
	/** Band B contexts */
	bandB: BandBContext[];
	/** Band C contexts */
	bandC: BandCContext[];
	/** Budget utilization */
	budgetUsage: {
		bandA: BudgetUsage;
		bandB: BudgetUsage;
		bandC: BudgetUsage;
		total: BudgetUsage;
	};
	/** Pack metadata */
	metadata: {
		packId: string;
		created: number;
		totalChunks: number;
		expansionRatio: number;
		riskClass: RiskClass;
	};
}

/**
 * Budget utilization tracking
 */
export interface BudgetUsage {
	/** Maximum allowed budget */
	maxBudget: number;
	/** Actual usage */
	usedBudget: number;
	/** Utilization percentage */
	utilization: number;
	/** Budget unit (tokens, chunks, etc.) */
	unit: 'tokens' | 'chunks' | 'facts' | 'virtual-tokens';
}

/**
 * Scoring result for relevance policy
 */
export interface RelevanceScore {
	/** Overall relevance score */
	score: number;
	/** Component scores */
	components: {
		similarity: number;
		freshness: number;
		diversity: number;
		domainBonus: number;
		duplicationPenalty: number;
	};
	/** Band recommendation */
	recommendedBand: ContextBand;
	/** Score confidence */
	confidence: number;
}

/**
 * Expansion planning result
 */
export interface ExpansionPlan {
	/** Chunks allocated to Band A */
	bandAChunks: Chunk[];
	/** Chunks allocated to Band B */
	bandBChunks: Chunk[];
	/** Chunks allocated to Band C */
	bandCChunks: Chunk[];
	/** Budget adherence */
	budgetAdherence: {
		bandA: BudgetUsage;
		bandB: BudgetUsage;
		bandC: BudgetUsage;
	};
	/** Planning metadata */
	metadata: {
		totalCandidates: number;
		selectedCount: number;
		diversityScore: number;
		mandatoryExpansions: number;
		planningTimeMs: number;
	};
}

/**
 * Verification result for generated answers
 */
export interface VerificationResult {
	/** Whether verification passed */
	passed: boolean;
	/** Verification scores */
	scores: {
		numericalCoverage: number;
		citationCompleteness: number;
		factConsistency: number;
		overallConfidence: number;
	};
	/** Issues found */
	issues: VerificationIssue[];
	/** Escalation recommendation */
	escalationRecommendation: 'none' | 'expand-b' | 'rebuild' | 'abort';
	/** Verification metadata */
	metadata: {
		verificationTimeMs: number;
		checksPerformed: string[];
		thresholds: Record<string, number>;
	};
}

/**
 * Verification issues
 */
export interface VerificationIssue {
	/** Issue type */
	type: 'missing-citation' | 'numerical-mismatch' | 'fact-conflict' | 'uncertainty-high';
	/** Severity level */
	severity: 'low' | 'medium' | 'high' | 'critical';
	/** Issue description */
	description: string;
	/** Related evidence */
	evidence?: {
		expected?: string;
		actual?: string;
		confidence?: number;
	};
}

/**
 * Escalation trace for audit trails
 */
export interface EscalationTrace {
	/** Unique trace ID */
	traceId: string;
	/** Original query */
	query: string;
	/** Initial risk classification */
	initialRiskClass: RiskClass;
	/** Escalation steps taken */
	steps: EscalationStep[];
	/** Final outcome */
	outcome: 'success' | 'escalated' | 'aborted';
	/** Total escalation time */
	totalTimeMs: number;
}

/**
 * Individual escalation step
 */
export interface EscalationStep {
        /** Step number */
        step: number;
        /** Action taken */
        action:
                | 'expand-band-b'
                | 'add-mandatory'
                | 'rebuild-pack'
                | 'verify-again'
                | 'query-analysis'
                | 'chunk-retrieval'
                | 'relevance-scoring'
                | 'expansion-planning'
                | 'context-packing'
                | 'answer-generation'
                | 'answer-verification'
                | 'escalation'
                | 'error';
	/** Reason for action */
	reason: string;
	/** Result of action */
	result: 'success' | 'failed' | 'partial';
	/** Time taken */
	durationMs: number;
	/** Additional context */
	context?: Record<string, unknown>;
}

/**
 * REF‑RAG configuration
 */
export interface RefRagConfig {
	/** Feature flag */
	enabled: boolean;
	/** Risk class budgets */
	budgets: RiskClassBudgets;
	/** Query guard settings */
	queryGuard: {
		enableKeywordDetection: boolean;
		enableDomainClassification: boolean;
		enableEntityExtraction: boolean;
		customRiskKeywords?: Record<string, string[]>;
	};
	/** Relevance policy settings */
	relevancePolicy: {
		enableDuplicationPenalty: boolean;
		enableFreshnessBonus: boolean;
		enableDomainBonus: boolean;
		similarityWeight: number;
		freshnessWeight: number;
		diversityWeight: number;
	};
	/** Expansion settings */
	expansion: {
		enableMandatoryExpansion: boolean;
		maxDiversityEnforcement: number;
		minRelevanceThreshold: number;
	};
	/** Verification settings */
	verification: {
		enablePostGenerationCheck: boolean;
		enableNumericalTrace: boolean;
		enableCitationValidation: boolean;
		maxEscalationAttempts: number;
		confidenceThreshold: number;
	};
	/** Fact extraction settings */
	factExtraction: {
		enableNumericExtraction: boolean;
		enableQuoteExtraction: boolean;
		enableCodeExtraction: boolean;
		enableDateExtraction: boolean;
		confidenceThreshold: number;
	};
	/** Virtual token settings */
	virtualTokens: {
		enableCompression: boolean;
		compressionMethod: 'projection' | 'quantization' | 'hybrid';
		targetCompressionRatio: number;
		projectionWeightsPath?: string;
	};
}

/**
 * Risk class budget configuration
 */
export interface RiskClassBudgets {
	/** Low risk budget allocation */
	low: BandBudgets;
	/** Medium risk budget allocation */
	medium: BandBudgets;
	/** High risk budget allocation */
	high: BandBudgets;
	/** Critical risk budget allocation */
	critical: BandBudgets;
}

/**
 * Band-specific budget configuration
 */
export interface BandBudgets {
	/** Band A budget (tokens) */
	bandA: number;
	/** Band B budget (virtual tokens) */
	bandB: number;
	/** Band C budget (facts) */
	bandC: number;
	/** Optional override limits */
	overrides?: {
		maxBandAChunks?: number;
		maxBandBChunks?: number;
		maxBandCFacts?: number;
	};
}

/**
 * REF‑RAG pipeline interface
 */
export interface RefRagPipeline {
	/** Process query with tri-band context */
	process(query: string, options?: RefRagProcessOptions): Promise<{
		answer: string;
		contextPack: HybridContextPack;
		verification: VerificationResult;
		trace: EscalationTrace;
	}>;
}

/**
 * Options for REF‑RAG processing
 */
export interface RefRagProcessOptions {
	/** Override risk classification */
	forceRiskClass?: RiskClass;
        /** Override budgets per risk class */
        budgetOverrides?: Partial<RiskClassBudgets>;
	/** Custom expansion hints */
	customHints?: ExpansionHint[];
	/** Enable verification */
	skipVerification?: boolean;
	/** Metadata tracking */
	enableTrace?: boolean;
}

/**
 * Generation request with tri-band context
 */
export interface TriBandGenerationRequest {
	/** Primary query */
	query: string;
	/** Hybrid context pack */
	contextPack: HybridContextPack;
	/** Generation options */
	options: {
		maxTokens: number;
		temperature: number;
		topP: number;
		enableStructuredOutput?: boolean;
	};
}

/**
 * Fact extraction result
 */
export interface FactExtractionResult {
	/** Extracted facts */
	facts: StructuredFact[];
	/** Extraction metadata */
	metadata: {
		chunkId: string;
		extractionTimeMs: number;
		method: string;
		confidence: number;
	};
}

/**
 * Compression encoding result for Band B
 */
export interface CompressionEncodingResult {
	/** Compressed embeddings */
	compressedEmbedding: Float32Array;
	/** Compression metadata */
	metadata: {
		originalDimensions: number;
		compressedDimensions: number;
		compressionRatio: number;
		method: string;
		quality: number;
	};
}

/**
 * REF‑RAG metadata attached to chunks
 */
export interface RefRagChunkMetadata {
	/** Structured facts extracted from this chunk */
	structuredFacts?: StructuredFact[];
	/** Dual embeddings for virtual token processing */
	dualEmbeddings?: {
		/** Original embedding */
		original: number[];
		/** Compressed embedding */
		compressed?: number[];
	};
	/** Fact extraction metadata */
	factExtraction?: {
		/** Extraction confidence */
		confidence: number;
		/** Number of facts extracted */
		factCount: number;
		/** Extraction method */
		method: 'regex' | 'parser' | 'ml';
	};
        /** Compression metadata */
        compression?: {
                /** Compression ratio achieved */
                ratio: number;
                /** Compression method used */
                method: 'projection' | 'quantization' | 'hybrid';
                /** Quality score */
                quality: number;
        };
        /** Content analysis metadata */
        contentAnalysis?: {
                hasNumbers: boolean;
                hasQuotes: boolean;
                hasCode: boolean;
                hasDates: boolean;
                hasEntities: boolean;
                domains: string[];
                entities: string[];
        };
        /** Quality metrics */
        qualityMetrics?: {
                freshnessScore: number;
                diversityScore: number;
                completenessScore: number;
                accuracyScore: number;
        };
}