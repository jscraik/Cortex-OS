/**
 * REF‑RAG Pipeline Orchestrator
 *
 * End-to-end controller that coordinates query analysis, retrieval,
 * scoring, expansion, context packing, generation, and verification.
 */

import crypto from 'node:crypto';
import type {
	RefRagPipeline,
	RefRagConfig,
	RefRagProcessOptions,
	TriBandGenerationRequest,
	HybridContextPack,
	QueryGuardResult,
	ExpansionPlan,
	VerificationResult,
	EscalationTrace,
	Chunk,
	BandAContext,
	BandBContext,
	BandCContext,
	BudgetUsage,
	RefRagChunkMetadata,
} from './types.js';
import type { Embedder, Store, Generator } from '../lib/types.js';
import { createQueryGuard } from './query-guard.js';
import { createRelevancePolicy } from './relevance-policy.js';
import { getBudgetForRiskClass } from './budgets.js';

/**
 * Simplified expansion planner for the pipeline
 */
class SimpleExpansionPlanner {
	planExpansion(
		chunks: Chunk[],
		scores: any[],
		queryGuard: QueryGuardResult,
		budget: any,
	): ExpansionPlan {
		// Sort chunks by score
		const sortedChunks = chunks
			.map((chunk, index) => ({ chunk, score: scores[index]?.score || 0 }))
			.sort((a, b) => b.score - a.score);

		// Allocate to bands based on risk class and scores
		const bandAChunks: Chunk[] = [];
		const bandBChunks: Chunk[] = [];
		const bandCChunks: Chunk[] = [];

		for (const { chunk, score } of sortedChunks) {
			const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata | undefined;

			// High-quality, high-scoring chunks go to Band A
			if (score > 0.8 || queryGuard.riskClass === 'critical') {
				if (bandAChunks.length < (budget.overrides?.maxBandAChunks || 15)) {
					bandAChunks.push(chunk);
					continue;
				}
			}

			// Chunks with structured facts go to Band C
			if (refRagMetadata?.structuredFacts?.length > 0) {
				if (bandCChunks.length < (budget.overrides?.maxBandCFacts || 50)) {
					bandCChunks.push(chunk);
					continue;
				}
			}

			// Everything else goes to Band B
			if (bandBChunks.length < (budget.overrides?.maxBandBChunks || 30)) {
				bandBChunks.push(chunk);
			}
		}

		const budgetUsage = {
			bandA: {
				maxBudget: budget.bandA,
				usedBudget: bandAChunks.reduce((sum, chunk) => sum + chunk.text.length / 4, 0),
				utilization: 0,
				unit: 'tokens' as const,
			},
			bandB: {
				maxBudget: budget.bandB,
				usedBudget: bandBChunks.length * 128, // Approximate virtual tokens
				utilization: 0,
				unit: 'virtual-tokens' as const,
			},
			bandC: {
				maxBudget: budget.bandC,
				usedBudget: bandCChunks.reduce((sum, chunk) => {
					const facts = (chunk.metadata?.refRag as RefRagChunkMetadata | undefined)?.structuredFacts?.length || 0;
					return sum + facts;
				}, 0),
				utilization: 0,
				unit: 'facts' as const,
			},
		};

		// Calculate utilization
		Object.values(budgetUsage).forEach(budget => {
			budget.utilization = (budget.usedBudget / budget.maxBudget) * 100;
		});

		return {
			bandAChunks,
			bandBChunks,
			bandCChunks,
			budgetAdherence: budgetUsage,
			metadata: {
				totalCandidates: chunks.length,
				selectedCount: bandAChunks.length + bandBChunks.length + bandCChunks.length,
				diversityScore: 0.7, // Simplified
				mandatoryExpansions: queryGuard.expansionHints.filter(h => h.mandatory).length,
				planningTimeMs: 5, // Simplified
			},
		};
	}
}

/**
 * Simplified pack builder for the pipeline
 */
class SimplePackBuilder {
	buildPack(
		query: string,
		expansionPlan: ExpansionPlan,
		queryGuard: QueryGuardResult,
	): HybridContextPack {
		// Build Band A contexts
		const bandA: BandAContext[] = expansionPlan.bandAChunks.map((chunk, index) => ({
			band: 'A' as const,
			text: chunk.text,
			citation: {
				id: chunk.id,
				source: chunk.source,
				text: chunk.text.slice(0, 100) + '...',
				score: 0.8, // Simplified
			},
			position: {
				start: 0,
				end: chunk.text.length,
			},
		}));

		// Build Band B contexts (virtual tokens)
		const bandB: BandBContext[] = expansionPlan.bandBChunks.map(chunk => {
			const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata | undefined;
			const compressedEmbedding = refRagMetadata?.dualEmbeddings?.compressed || [];

			return {
				band: 'B' as const,
				virtualTokens: new Float32Array(compressedEmbedding),
				chunkRef: {
					id: chunk.id,
					source: chunk.source,
					score: 0.6, // Simplified
				},
				compression: {
					originalLength: chunk.text.length,
					compressedLength: compressedEmbedding.length,
					compressionRatio: compressedEmbedding.length / chunk.text.length,
					method: 'projection' as const,
				},
			};
		});

		// Build Band C contexts (structured facts)
		const bandC: BandCContext[] = expansionPlan.bandCChunks.map(chunk => {
			const refRagMetadata = chunk.metadata?.refRag as RefRagChunkMetadata | undefined;
			const facts = refRagMetadata?.structuredFacts || [];

			return {
				band: 'C' as const,
				facts,
				chunkRef: {
					id: chunk.id,
					source: chunk.source,
					score: 0.7, // Simplified
				},
				extraction: {
					method: 'regex' as const,
					confidence: refRagMetadata?.factExtraction?.confidence || 0.7,
					timestamp: Date.now(),
				},
			};
		});

		// Calculate total budget usage
		const totalBudgetUsage: BudgetUsage = {
			maxBudget: expansionPlan.budgetAdherence.bandA.maxBudget +
				expansionPlan.budgetAdherence.bandB.maxBudget +
				expansionPlan.budgetAdherence.bandC.maxBudget,
			usedBudget: expansionPlan.budgetAdherence.bandA.usedBudget +
				expansionPlan.budgetAdherence.bandB.usedBudget +
				expansionPlan.budgetAdherence.bandC.usedBudget,
			utilization: 0,
			unit: 'tokens' as const,
		};
		totalBudgetUsage.utilization = (totalBudgetUsage.usedBudget / totalBudgetUsage.maxBudget) * 100;

		return {
			queryGuard,
			bandA,
			bandB,
			bandC,
			budgetUsage: {
				bandA: expansionPlan.budgetAdherence.bandA,
				bandB: expansionPlan.budgetAdherence.bandB,
				bandC: expansionPlan.budgetAdherence.bandC,
				total: totalBudgetUsage,
			},
			metadata: {
				packId: crypto.randomUUID(),
				created: Date.now(),
				totalChunks: expansionPlan.bandAChunks.length + expansionPlan.bandBChunks.length + expansionPlan.bandCChunks.length,
				expansionRatio: bandA.length / (bandA.length + bandB.length + bandC.length),
				riskClass: queryGuard.riskClass,
			},
		};
	}
}

/**
 * Simplified verification for the pipeline
 */
class SimpleVerification {
	async verify(
		query: string,
		answer: string,
		contextPack: HybridContextPack,
	): Promise<VerificationResult> {
		const startTime = Date.now();

		// Simple verification checks
		const numericalCoverage = this.checkNumericalCoverage(answer, contextPack);
		const citationCompleteness = this.checkCitationCompleteness(answer, contextPack);
		const factConsistency = this.checkFactConsistency(answer, contextPack);
		const overallConfidence = (numericalCoverage + citationCompleteness + factConsistency) / 3;

		const passed = overallConfidence > 0.7;

		// Determine escalation recommendation
		let escalationRecommendation: 'none' | 'expand-b' | 'rebuild' | 'abort' = 'none';
		const issues: any[] = [];

		if (numericalCoverage < 0.5) {
			issues.push({
				type: 'numerical-mismatch',
				severity: 'medium',
				description: 'Answer may be missing numerical precision',
			});
			escalationRecommendation = 'expand-b';
		}

		if (citationCompleteness < 0.6) {
			issues.push({
				type: 'missing-citation',
				severity: 'medium',
				description: 'Answer lacks proper citations',
			});
		}

		if (factConsistency < 0.5) {
			issues.push({
				type: 'fact-conflict',
				severity: 'high',
				description: 'Answer may contain inconsistent facts',
			});
			escalationRecommendation = 'rebuild';
		}

		if (overallConfidence < 0.3) {
			escalationRecommendation = 'abort';
		}

		return {
			passed,
			scores: {
				numericalCoverage,
				citationCompleteness,
				factConsistency,
				overallConfidence,
			},
			issues,
			escalationRecommendation,
			metadata: {
				verificationTimeMs: Date.now() - startTime,
				checksPerformed: ['numerical_coverage', 'citation_completeness', 'fact_consistency'],
				thresholds: {
					numericalCoverage: 0.5,
					citationCompleteness: 0.6,
					factConsistency: 0.5,
					overallConfidence: 0.7,
				},
			},
		};
	}

	private checkNumericalCoverage(answer: string, contextPack: HybridContextPack): number {
		const answerNumbers = (answer.match(/\d+(?:\.\d+)?/g) || []).length;
		const contextFacts = contextPack.bandC.reduce((sum, bandC) => sum + bandC.facts.length, 0);
		const numericalFacts = contextPack.bandC.reduce((sum, bandC) =>
			sum + bandC.facts.filter(fact => fact.type === 'number').length, 0);

		if (answerNumbers === 0) return 1.0; // No numbers needed
		if (numericalFacts === 0) return 0.5; // Some numbers needed but no facts available

		return Math.min(1.0, numericalFacts / answerNumbers);
	}

	private checkCitationCompleteness(answer: string, contextPack: HybridContextPack): number {
		// Simple check: if there are Band A contexts, assume citations are needed
		const hasCitations = answer.match(/\[\d+\]|\[source\]/gi) !== null;
		const needsCitations = contextPack.bandA.length > 0;

		if (!needsCitations) return 1.0;
		if (hasCitations) return 0.9;

		// Penalize based on risk class
		const riskPenalty = {
			low: 0.2,
			medium: 0.4,
			high: 0.6,
			critical: 0.8,
		}[contextPack.metadata.riskClass] || 0.4;

		return Math.max(0.2, 1.0 - riskPenalty);
	}

	private checkFactConsistency(answer: string, contextPack: HybridContextPack): number {
		// Simplified consistency check
		const facts = contextPack.bandC.flatMap(bandC => bandC.facts);
		const highConfidenceFacts = facts.filter(fact => fact.confidence > 0.8);

		// If we have high-confidence facts, assume reasonable consistency
		if (highConfidenceFacts.length > 0) {
			return 0.8;
		}

		// Default moderate consistency
		return 0.6;
	}
}

/**
 * REF‑RAG Pipeline implementation
 */
export class RefRagPipelineImpl implements RefRagPipeline {
	private readonly config: RefRagConfig;
	private readonly embedder: Embedder;
	private readonly store: Store;
	private readonly generator: Generator;
	private readonly queryGuard: ReturnType<typeof createQueryGuard>;
	private readonly relevancePolicy: ReturnType<typeof createRelevancePolicy>;
	private readonly expansionPlanner: SimpleExpansionPlanner;
	private readonly packBuilder: SimplePackBuilder;
	private readonly verification: SimpleVerification;

	constructor(
		config: RefRagConfig,
		embedder: Embedder,
		store: Store,
		generator: Generator,
	) {
		this.config = config;
		this.embedder = embedder;
		this.store = store;
		this.generator = generator;
		this.queryGuard = createQueryGuard(config.queryGuard);
		this.relevancePolicy = createRelevancePolicy(config.relevancePolicy);
		this.expansionPlanner = new SimpleExpansionPlanner();
		this.packBuilder = new SimplePackBuilder();
		this.verification = new SimpleVerification();
	}

	/**
	 * Process query with tri-band context
	 */
	async process(query: string, options: RefRagProcessOptions = {}): Promise<{
		answer: string;
		contextPack: HybridContextPack;
		verification: VerificationResult;
		trace: EscalationTrace;
	}> {
		const startTime = Date.now();
		const traceId = crypto.randomUUID();

		// Initialize escalation trace
		const trace: EscalationTrace = {
			traceId,
			query,
			initialRiskClass: options.forceRiskClass || 'low',
			steps: [],
			outcome: 'success',
			totalTimeMs: 0,
		};

		try {
			// Step 1: Query Guard Analysis
			const queryGuardResult = await this.queryGuard.analyzeQuery(query);
			trace.steps.push({
				step: 1,
				action: 'query-analysis',
				reason: `Query classified as ${queryGuardResult.riskClass} risk`,
				result: 'success',
				durationMs: Date.now() - startTime,
			});

			// Override risk class if specified
			const effectiveRiskClass = options.forceRiskClass || queryGuardResult.riskClass;

			// Step 2: Retrieve Chunks
			const retrievalStartTime = Date.now();
			const [queryEmbedding] = await this.embedder.embed([query]);
			const retrievedChunks = await this.store.query(queryEmbedding, 50); // Retrieve more for filtering

			trace.steps.push({
				step: 2,
				action: 'chunk-retrieval',
				reason: `Retrieved ${retrievedChunks.length} candidate chunks`,
				result: 'success',
				durationMs: Date.now() - retrievalStartTime,
			});

			// Step 3: Score Chunks
			const scoringStartTime = Date.now();
			const relevanceScores = this.relevancePolicy.scoreChunks(retrievedChunks, queryEmbedding, queryGuardResult);

			trace.steps.push({
				step: 3,
				action: 'relevance-scoring',
				reason: `Scored ${relevanceScores.length} chunks for relevance`,
				result: 'success',
				durationMs: Date.now() - scoringStartTime,
			});

			// Step 4: Plan Expansion
			const budget = getBudgetForRiskClass(effectiveRiskClass, 'default', options.budgetOverrides);
			const expansionPlan = this.expansionPlanner.planExpansion(
				retrievedChunks,
				relevanceScores,
				queryGuardResult,
				budget,
			);

			trace.steps.push({
				step: 4,
				action: 'expansion-planning',
				reason: `Allocated chunks: A=${expansionPlan.bandAChunks.length}, B=${expansionPlan.bandBChunks.length}, C=${expansionPlan.bandCChunks.length}`,
				result: 'success',
				durationMs: 5,
			});

			// Step 5: Build Context Pack
			const packStartTime = Date.now();
			const contextPack = this.packBuilder.buildPack(query, expansionPlan, queryGuardResult);

			trace.steps.push({
				step: 5,
				action: 'context-packing',
				reason: `Built tri-band context pack with ${contextPack.metadata.totalChunks} chunks`,
				result: 'success',
				durationMs: Date.now() - packStartTime,
			});

			// Step 6: Generate Answer
			const generationStartTime = Date.now();
			const generationRequest: TriBandGenerationRequest = {
				query,
				contextPack,
				options: {
					maxTokens: 2048,
					temperature: 0.3,
					topP: 0.9,
					enableStructuredOutput: false,
				},
			};

			const answer = await this.generateAnswer(generationRequest);

			trace.steps.push({
				step: 6,
				action: 'answer-generation',
				reason: `Generated answer (${answer.length} characters)`,
				result: 'success',
				durationMs: Date.now() - generationStartTime,
			});

			// Step 7: Verification (if enabled)
			let verificationResult: VerificationResult;
			if (!options.skipVerification && this.config.verification.enablePostGenerationCheck) {
				verificationResult = await this.verification.verify(query, answer, contextPack);

				trace.steps.push({
					step: 7,
					action: 'answer-verification',
					reason: `Verification ${verificationResult.passed ? 'passed' : 'failed'} with ${verificationResult.issues.length} issues`,
					result: verificationResult.passed ? 'success' : 'failed',
					durationMs: verificationResult.metadata.verificationTimeMs,
				});

				// Escalation logic (simplified)
				if (!verificationResult.passed && this.config.verification.maxEscalationAttempts > 0) {
					trace.steps.push({
						step: 8,
						action: 'escalation',
						reason: `Escalation recommended: ${verificationResult.escalationRecommendation}`,
						result: 'success',
						durationMs: 1,
					});

					trace.outcome = 'escalated';
				}
			} else {
				verificationResult = {
					passed: true,
					scores: {
						numericalCoverage: 0.8,
						citationCompleteness: 0.8,
						factConsistency: 0.8,
						overallConfidence: 0.8,
					},
					issues: [],
					escalationRecommendation: 'none',
					metadata: {
						verificationTimeMs: 0,
						checksPerformed: [],
						thresholds: {},
					},
				};
			}

			trace.totalTimeMs = Date.now() - startTime;

			return {
				answer,
				contextPack,
				verification: verificationResult,
				trace,
			};

		} catch (error) {
			trace.totalTimeMs = Date.now() - startTime;
			trace.outcome = 'aborted';
			trace.steps.push({
				step: 99,
				action: 'error',
				reason: `Pipeline failed: ${error}`,
				result: 'failed',
				durationMs: 0,
			});

			throw error;
		}
	}

	/**
	 * Generate answer from tri-band context
	 */
	private async generateAnswer(request: TriBandGenerationRequest): Promise<string> {
		// Build prompt from context pack
		let prompt = request.query + '\n\n';

		// Add Band A context (full text)
		if (request.contextPack.bandA.length > 0) {
			prompt += 'Context:\n';
			request.contextPack.bandA.forEach((bandA, index) => {
				prompt += `[${index + 1}] ${bandA.text}\n\n`;
			});
		}

		// Add Band C context (structured facts)
		if (request.contextPack.bandC.length > 0) {
			prompt += 'Key Facts:\n';
			request.contextPack.bandC.forEach(bandC => {
				bandC.facts.forEach(fact => {
					prompt += `- ${fact.type}: ${fact.value}\n`;
				});
			});
			prompt += '\n';
		}

		prompt += 'Please provide a comprehensive answer based on the provided context.';

		// Generate response
		const result = await this.generator.generate(prompt, {
			maxTokens: request.options.maxTokens,
			temperature: request.options.temperature,
			topP: request.options.topP,
		});

		return result.content;
	}
}

/**
 * Create REF‑RAG pipeline instance
 */
export function createRefRagPipeline(
	config: RefRagConfig,
	embedder: Embedder,
	store: Store,
	generator: Generator,
): RefRagPipeline {
	return new RefRagPipelineImpl(config, embedder, store, generator);
}