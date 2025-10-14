/**
 * REF‑RAG Relevance Policy
 *
 * Hybrid scoring system that combines similarity scores with
 * heuristics for freshness, diversity, domain relevance, and duplication penalties.
 */

import type {
	Chunk,
	RelevanceScore,
	ContextBand,
	RefRagChunkMetadata,
	QueryGuardResult,
	ExpansionHint,
} from './types.js';

/**
 * Relevance policy configuration
 */
export interface RelevancePolicyConfig {
	/** Enable duplication penalty */
	enableDuplicationPenalty: boolean;
	/** Enable freshness bonus */
	enableFreshnessBonus: boolean;
	/** Enable domain bonus */
	enableDomainBonus: boolean;
	/** Scoring weights */
	similarityWeight: number;
	freshnessWeight: number;
	diversityWeight: number;
	/** Duplication penalty settings */
	duplicationSettings: {
		textSimilarityThreshold: number;
		semanticSimilarityThreshold: number;
		maxDuplicates: number;
		penaltyStrength: number;
	};
	/** Freshness bonus settings */
	freshnessSettings: {
		maxAgeDays: number;
		decayFunction: 'linear' | 'exponential' | 'logarithmic';
		freshnessBoost: number;
	};
	/** Domain bonus settings */
	domainSettings: {
		domainBonusMap: Record<string, number>;
		authorityBonus: number;
		recentActivityBonus: number;
	};
}

/**
 * Default relevance policy configuration
 */
export const DEFAULT_RELEVANCE_POLICY_CONFIG: RelevancePolicyConfig = {
	enableDuplicationPenalty: true,
	enableFreshnessBonus: true,
	enableDomainBonus: true,
	similarityWeight: 0.6,
	freshnessWeight: 0.2,
	diversityWeight: 0.2,
	duplicationSettings: {
		textSimilarityThreshold: 0.8,
		semanticSimilarityThreshold: 0.9,
		maxDuplicates: 2,
		penaltyStrength: 0.3,
	},
	freshnessSettings: {
		maxAgeDays: 365,
		decayFunction: 'exponential',
		freshnessBoost: 0.2,
	},
	domainSettings: {
		domainBonusMap: {
			medical: 0.1,
			financial: 0.05,
			technical: 0.0,
			legal: 0.15,
			scientific: 0.1,
			safety: 0.2,
		},
		authorityBonus: 0.15,
		recentActivityBonus: 0.1,
	},
};

/**
 * Relevance policy for hybrid scoring
 */
export class RelevancePolicy {
	private readonly config: RelevancePolicyConfig;

	constructor(config: Partial<RelevancePolicyConfig> = {}) {
		this.config = { ...DEFAULT_RELEVANCE_POLICY_CONFIG, ...config };
	}

	/**
	 * Score chunks for relevance using hybrid scoring
	 */
	scoreChunks(
		chunks: Chunk[],
		queryEmbedding: number[],
		queryGuard: QueryGuardResult,
	): RelevanceScore[] {
		return chunks.map(chunk => this.scoreChunk(chunk, queryEmbedding, queryGuard));
	}

	/**
	 * Score individual chunk for relevance
	 */
	scoreChunk(
		chunk: Chunk,
		queryEmbedding: number[],
		queryGuard: QueryGuardResult,
	): RelevanceScore {
		// Base similarity score
		const similarityScore = chunk.score || 0;

		// Component scores
		const components = {
			similarity: similarityScore,
			freshness: this.calculateFreshnessScore(chunk),
			diversity: this.calculateDiversityScore(chunk, queryGuard),
			domainBonus: this.calculateDomainBonus(chunk, queryGuard),
			duplicationPenalty: 0, // Will be calculated when comparing with other chunks
		};

		// Calculate weighted score
		const weightedScore =
			(components.similarity * this.config.similarityWeight) +
			(components.freshness * this.config.freshnessWeight) +
			(components.diversity * this.config.diversityWeight);

		// Apply domain bonus
		const finalScore = Math.min(1.0, weightedScore + components.domainBonus);

		// Determine recommended band
		const recommendedBand = this.recommendBand(chunk, finalScore, queryGuard);

		// Calculate confidence
		const confidence = this.calculateConfidence(components, finalScore);

		return {
			score: finalScore,
			components,
			recommendedBand,
			confidence,
		};
	}

	/**
	 * Apply duplication penalties to scored chunks
	 * Optimized O(n) algorithm with caching and early termination
	 */
	applyDuplicationPenalties(scores: RelevanceScore[], chunks: Chunk[]): RelevanceScore[] {
		if (!this.config.enableDuplicationPenalty) {
			return scores;
		}

		const penalizedScores = scores.map((score, index) => ({ ...score }));
		const { textSimilarityThreshold, maxDuplicates, penaltyStrength } = this.config.duplicationSettings;

		// Optimization: Use similarity cache to avoid redundant calculations
		const similarityCache = new Map<string, Map<string, number>>();
		const duplicateCounts = new Array(chunks.length).fill(0);

		// Pre-compute text similarity matrix with caching
		for (let i = 0; i < chunks.length; i++) {
			for (let j = 0; j < i; j++) {
				const similarity = this.getCachedSimilarity(
					chunks[i].text,
					chunks[j].text,
					i,
					j,
					similarityCache
				);

				if (similarity >= textSimilarityThreshold) {
					duplicateCount[i]++;
					duplicateCount[j]++;
				}
			}
		}

		// Apply penalties in a single pass
		for (let i = 0; i < penalizedScores.length; i++) {
			const duplicateCount = duplicateCounts[i];
			if (duplicateCount > maxDuplicates) {
				const penalty = penaltyStrength * (duplicateCount - maxDuplicates);
				penalizedScores[i].components.duplicationPenalty = penalty;
				penalizedScores[i].score = Math.max(0, penalizedScores[i].score - penalty);
			}
		}

		return penalizedScores;
	}

	/**
	 * Get cached text similarity between two chunks
	 */
	private getCachedSimilarity(
		text1: string,
		text2: string,
		index1: number,
		index2: number,
		cache: Map<string, Map<string, number>>,
	): number {
		// Create consistent cache keys
		const key1 = `${index1}:${index2}`;
		const key2 = `${index2}:${index1}`;

		// Check cache first
		if (cache.has(key1)) {
			return cache.get(key1)!;
			}
		if (cache.has(key2)) {
			return cache.get(key2)!;
		}

		// Calculate similarity and cache it
		const similarity = this.calculateTextSimilarity(text1, text2);
		const innerCache = cache.get(key1) || new Map<string, number>();
		innerCache.set(key2, similarity);
		cache.set(key1, innerCache);

		return similarity;
	}

	/**
	 * Calculate freshness score for chunk
	 */
	private calculateFreshnessScore(chunk: Chunk): number {
		if (!this.config.enableFreshnessBonus || !chunk.updatedAt) {
			return 0;
		}

		const now = Date.now();
		const ageInDays = (now - chunk.updatedAt) / (1000 * 60 * 60 * 24);
		const { maxAgeDays, decayFunction, freshnessBoost } = this.config.freshnessSettings;

		if (ageInDays > maxAgeDays) {
			return 0;
		}

		const ageRatio = ageInDays / maxAgeDays;
		let freshnessScore: number;

		switch (decayFunction) {
			case 'linear':
				freshnessScore = freshnessBoost * (1 - ageRatio);
				break;
			case 'exponential':
				freshnessScore = freshnessBoost * Math.exp(-2 * ageRatio);
				break;
			case 'logarithmic':
				freshnessScore = freshnessBoost * (1 - Math.log(ageRatio + 1) / Math.log(2));
				break;
			default:
				freshnessScore = freshnessBoost * (1 - ageRatio);
		}

		return Math.max(0, freshnessScore);
	}

	/**
	 * Calculate diversity score for chunk
	 */
	private calculateDiversityScore(chunk: Chunk, queryGuard: QueryGuardResult): number {
		const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata;
		if (!refRagMetadata) {
			return 0.3; // Base score for chunks without REF‑RAG metadata
		}

		let diversityScore = 0.3; // Base score

		// Bonus for content variety
		const contentAnalysis = refRagMetadata.contentAnalysis;
		if (contentAnalysis) {
			if (contentAnalysis.hasNumbers) diversityScore += 0.1;
			if (contentAnalysis.hasQuotes) diversityScore += 0.1;
			if (contentAnalysis.hasCode) diversityScore += 0.15;
			if (contentAnalysis.hasDates) diversityScore += 0.1;
			if (contentAnalysis.hasEntities) diversityScore += 0.1;
		}

		// Bonus for structured facts
		if (refRagMetadata.structuredFacts && refRagMetadata.structuredFacts.length > 0) {
			diversityScore += Math.min(0.2, refRagMetadata.structuredFacts.length * 0.02);
		}

		// Bonus for domain diversity
		if (contentAnalysis?.domains.length > 0) {
			diversityScore += Math.min(0.15, contentAnalysis.domains.length * 0.05);
		}

		// Bonus based on quality metrics
		const qualityMetrics = refRagMetadata.qualityMetrics;
		if (qualityMetrics) {
			diversityScore += qualityMetrics.diversityScore * 0.2;
		}

		return Math.min(1.0, diversityScore);
	}

	/**
	 * Calculate domain bonus for chunk
	 */
	private calculateDomainBonus(chunk: Chunk, queryGuard: QueryGuardResult): number {
		if (!this.config.enableDomainBonus) {
			return 0;
		}

		const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata;
		if (!refRagMetadata?.contentAnalysis?.domains.length) {
			return 0;
		}

		let totalBonus = 0;
		const domains = refRagMetadata.contentAnalysis.domains;
		const queryDomains = queryGuard.metadata.detectedDomains;

		// Domain matching bonus
		for (const domain of domains) {
			// Bonus for matching query domains
			if (queryDomains.includes(domain)) {
				totalBonus += this.config.domainSettings.domainBonusMap[domain] || 0.05;
			} else {
				// Smaller bonus for any domain coverage
				totalBonus += (this.config.domainSettings.domainBonusMap[domain] || 0.02);
			}
		}

		// Authority bonus for high-quality sources
		const qualityMetrics = refRagMetadata.qualityMetrics;
		if (qualityMetrics && qualityMetrics.accuracyScore > 0.8) {
			totalBonus += this.config.domainSettings.authorityBonus;
		}

		// Recent activity bonus
		if (chunk.updatedAt && chunk.updatedAt > Date.now() - (7 * 24 * 60 * 60 * 1000)) { // Last 7 days
			totalBonus += this.config.domainSettings.recentActivityBonus;
		}

		return Math.min(0.3, totalBonus); // Cap the domain bonus
	}

	/**
	 * Recommend context band for chunk based on score and query characteristics
	 */
	private recommendBand(
		chunk: Chunk,
		score: number,
		queryGuard: QueryGuardResult,
	): ContextBand {
		const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata;
		const riskClass = queryGuard.riskClass;

		// High-risk queries prefer full text (Band A)
		if (riskClass === 'high' || riskClass === 'critical') {
			if (score > 0.7) return ContextBand.A;
			if (score > 0.5 && refRagMetadata?.structuredFacts?.length) return ContextBand.C;
			return ContextBand.B;
		}

		// Medium-risk queries balanced approach
		if (riskClass === 'medium') {
			if (score > 0.8) return ContextBand.A;
			if (score > 0.4) return ContextBand.B;
			if (refRagMetadata?.structuredFacts?.length > 0) return ContextBand.C;
			return ContextBand.B;
		}

		// Low-risk queries can use compressed representations
		if (score > 0.9) return ContextBand.A;
		if (score > 0.6) return ContextBand.B;
		if (refRagMetadata?.structuredFacts?.length > 2) return ContextBand.C;
		return ContextBand.B;
	}

	/**
	 * Calculate confidence in the relevance score
	 */
	private calculateConfidence(
		components: RelevanceScore['components'],
		finalScore: number,
	): number {
		// Base confidence on similarity score strength
		let confidence = components.similarity;

		// Boost confidence if multiple factors agree
		const positiveFactors = [
			components.freshness > 0,
			components.diversity > 0.5,
			components.domainBonus > 0,
		].filter(Boolean).length;

		confidence += positiveFactors * 0.1;

		// Reduce confidence if there are significant penalties
		if (components.duplicationPenalty > 0.1) {
			confidence -= components.duplicationPenalty;
		}

		// Consider final score strength
		confidence = (confidence + finalScore) / 2;

		return Math.max(0.3, Math.min(1.0, confidence));
	}

	/**
	 * Calculate text similarity between two chunks (optimized)
	 */
	private calculateTextSimilarity(text1: string, text2: string): number {
	// Normalize texts and split into words
		const words1 = text1.toLowerCase().split(/\s+/).filter(word => word.length > 0);
		const words2 = text2.toLowerCase().split(/\s+/).filter(word => word.length > 0);

		// Early exit for empty texts
		if (words1.length === 0 || words2.length === 0) {
			return 0;
		}

		// For performance, use the smaller text for iteration
		const [smaller, larger] = words1.length <= words2.length ? [words1, words2] : [words2, words1];
		const largerSet = larger.length <= words2.length ? new Set(words2) : new Set(words1);

		// Count intersections efficiently
		let intersection = 0;
		for (const word of smaller) {
			if (largerSet.has(word)) {
				intersection++;
			}
		}

		// Calculate Jaccard similarity
		const union = words1.length + words2.length - intersection;
		return union > 0 ? intersection / union : 0;
	}

	/**
	 * Filter chunks by relevance threshold
	 */
	filterByRelevance(scores: RelevanceScore[], threshold: number = 0.3): RelevanceScore[] {
		return scores.filter(score => score.score >= threshold);
	}

	/**
	 * Sort chunks by relevance score (descending)
	 */
	sortByRelevance(scores: RelevanceScore[]): RelevanceScore[] {
		return scores.sort((a, b) => {
			// Primary sort: by score
			if (Math.abs(a.score - b.score) > 0.01) {
				return b.score - a.score;
			}

			// Secondary sort: by confidence
			if (Math.abs(a.confidence - b.confidence) > 0.01) {
				return b.confidence - a.confidence;
			}

			// Tertiary sort: prefer higher band (A > B > C)
			const bandOrder = { A: 3, B: 2, C: 1 };
			return bandOrder[b.recommendedBand] - bandOrder[a.recommendedBand];
		});
	}

	/**
	 * Get top N chunks by relevance
	 */
	getTopChunks(scores: RelevanceScore[], n: number): RelevanceScore[] {
		const sorted = this.sortByRelevance(scores);
		return sorted.slice(0, n);
	}

	/**
	 * Balance band allocation for diversity
	 */
	balanceBandAllocation(scores: RelevanceScore[], targetCounts: { A?: number; B?: number; C?: number }): RelevanceScore[] {
		const result: RelevanceScore[] = [];
		const counts = { A: 0, B: 0, C: 0 };

		// Sort by relevance
		const sorted = this.sortByRelevance(scores);

		// First pass: add high-scoring chunks regardless of band
		for (const score of sorted) {
			const band = score.recommendedBand;
			const target = targetCounts[band];

			if (target === undefined || counts[band] < target || score.score > 0.8) {
				result.push(score);
				counts[band]++;
			}
		}

		// Second pass: fill remaining slots if needed
		for (const score of sorted) {
			if (result.includes(score)) continue;

			const band = score.recommendedBand;
			const target = targetCounts[band];

			if (target === undefined || counts[band] < target) {
				result.push(score);
				counts[band]++;
			}
		}

		return result;
	}
}

/**
 * Create relevance policy instance
 */
export function createRelevancePolicy(config?: Partial<RelevancePolicyConfig>): RelevancePolicy {
	return new RelevancePolicy(config);
}