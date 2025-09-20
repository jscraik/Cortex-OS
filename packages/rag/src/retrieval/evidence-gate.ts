import type { EnhancedCitationBundle } from '../lib/citation-bundler.js';

export interface EvidenceGateOptions {
	minimumScore?: number; // minimum score for evidence to be considered valid
	minimumCitations?: number; // minimum number of citations required
	noEvidenceResponse?: string; // response when no evidence is found
	evidenceThreshold?: number; // percentage of claims that need evidence (0-1)
}

export interface EvidenceGateResult {
	hasEvidence: boolean;
	shouldProceedToLLM: boolean;
	evidence?: EnhancedCitationBundle;
	reason?: string;
	confidence?: number; // 0-1 confidence in the evidence quality
}

export class EvidenceGate {
	private options: Required<EvidenceGateOptions>;

	constructor(options: EvidenceGateOptions = {}) {
		this.options = {
			minimumScore: options.minimumScore ?? 0.3,
			minimumCitations: options.minimumCitations ?? 1,
			noEvidenceResponse:
				options.noEvidenceResponse ?? 'No supporting evidence found in knowledge base.',
			evidenceThreshold: options.evidenceThreshold ?? 0.5,
		};
	}

	/**
	 * Evaluates whether the evidence bundle meets the criteria for proceeding
	 */
	evaluate(evidence: EnhancedCitationBundle): EvidenceGateResult {
		// Check for explicit no evidence flag
		if (evidence.noEvidence === true) {
			return {
				hasEvidence: false,
				shouldProceedToLLM: false,
				reason: 'No evidence found in knowledge base',
				confidence: 0,
			};
		}

		// Check minimum citations count
		if (evidence.citations.length < this.options.minimumCitations) {
			return {
				hasEvidence: false,
				shouldProceedToLLM: false,
				reason: `Insufficient citations (${evidence.citations.length} < ${this.options.minimumCitations})`,
				confidence: 0,
			};
		}

		// Check citation quality (scores)
		const validCitations = evidence.citations.filter(
			(c) => (c.score ?? 0) >= this.options.minimumScore,
		);

		if (validCitations.length === 0) {
			return {
				hasEvidence: false,
				shouldProceedToLLM: false,
				reason: `No high-quality citations (min score: ${this.options.minimumScore})`,
				confidence: 0,
			};
		}

		// Check per-claim evidence if available
		if (evidence.claimCitations) {
			const claimsWithEvidence = evidence.claimCitations.filter(
				(cc) => !cc.noEvidence && cc.citations.length > 0,
			);

			const evidenceRatio = claimsWithEvidence.length / evidence.claimCitations.length;

			if (evidenceRatio < this.options.evidenceThreshold) {
				return {
					hasEvidence: true,
					shouldProceedToLLM: false,
					evidence,
					reason: `Insufficient claim coverage (${Math.round(evidenceRatio * 100)}% < ${Math.round(this.options.evidenceThreshold * 100)}%)`,
					confidence: evidenceRatio,
				};
			}
		}

		// Calculate overall confidence
		const avgScore =
			validCitations.reduce((sum, c) => sum + (c.score ?? 0), 0) / validCitations.length;
		const scoreNormalized = Math.min(avgScore / 1.0, 1); // assuming max score is 1
		const citationCount = Math.min(validCitations.length / 5, 1); // normalize to 5 citations
		const confidence = (scoreNormalized + citationCount) / 2;

		return {
			hasEvidence: true,
			shouldProceedToLLM: true,
			evidence,
			reason: 'Sufficient evidence found',
			confidence,
		};
	}

	/**
	 * Convenience method for evidence-first routing decision
	 */
	shouldRoute(
		evidence: EnhancedCitationBundle,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_query: string,
	): {
		route: 'evidence' | 'llm' | 'no-answer';
		result: EvidenceGateResult;
		response?: string;
	} {
		const result = this.evaluate(evidence);

		if (!result.hasEvidence) {
			return {
				route: 'no-answer',
				result,
				response: this.options.noEvidenceResponse,
			};
		}

		if (!result.shouldProceedToLLM) {
			// Provide evidence-only response
			const citationText = evidence.citations
				.slice(0, 3)
				.map((c) => c.text)
				.join(' ');

			return {
				route: 'evidence',
				result,
				response: `Based on available evidence: ${citationText}`,
			};
		}

		return {
			route: 'llm',
			result,
		};
	}

	/**
	 * Updates the gate configuration
	 */
	updateOptions(newOptions: Partial<EvidenceGateOptions>): void {
		this.options = { ...this.options, ...newOptions };
	}

	/**
	 * Gets current gate configuration
	 */
	getOptions(): Required<EvidenceGateOptions> {
		return { ...this.options };
	}
}
