import { describe, expect, it } from 'vitest';
import type { EnhancedCitationBundle } from '../lib/citation-bundler.js';
import { EvidenceGate } from './evidence-gate.js';

describe('EvidenceGate', () => {
	const highQualityEvidence: EnhancedCitationBundle = {
		text: 'Climate change is caused by greenhouse gases.',
		citations: [
			{
				id: 'cite-1',
				text: 'Greenhouse gases trap heat in the atmosphere.',
				source: 'climate-science.pdf',
				score: 0.9,
			},
			{
				id: 'cite-2',
				text: 'Carbon dioxide is the primary greenhouse gas.',
				source: 'ipcc-report.pdf',
				score: 0.85,
			},
		],
	};

	const lowQualityEvidence: EnhancedCitationBundle = {
		text: 'Vague information about climate.',
		citations: [
			{
				id: 'cite-3',
				text: 'Something about weather.',
				source: 'blog-post.html',
				score: 0.2,
			},
		],
	};

	const noEvidence: EnhancedCitationBundle = {
		text: '',
		citations: [],
		noEvidence: true,
	};

	const mixedClaimEvidence: EnhancedCitationBundle = {
		text: 'Climate information with mixed support.',
		citations: [
			{
				id: 'cite-4',
				text: 'Well-supported climate fact.',
				source: 'science-journal.pdf',
				score: 0.8,
			},
		],
		claimCitations: [
			{
				claim: 'Well-supported claim',
				citations: [
					{
						id: 'cite-4',
						text: 'Well-supported climate fact.',
						source: 'science-journal.pdf',
						score: 0.8,
					},
				],
			},
			{
				claim: 'Unsupported claim',
				citations: [],
				noEvidence: true,
			},
		],
	};

	describe('basic evidence evaluation', () => {
		it('should approve high-quality evidence', () => {
			const gate = new EvidenceGate();
			const result = gate.evaluate(highQualityEvidence);

			expect(result.hasEvidence).toBe(true);
			expect(result.shouldProceedToLLM).toBe(true);
			expect(result.confidence).toBeGreaterThan(0.5);
		});

		it('should reject low-quality evidence', () => {
			const gate = new EvidenceGate({ minimumScore: 0.5 });
			const result = gate.evaluate(lowQualityEvidence);

			expect(result.hasEvidence).toBe(false);
			expect(result.shouldProceedToLLM).toBe(false);
			expect(result.reason).toContain('No high-quality citations');
		});

		it('should reject evidence with no citations', () => {
			const gate = new EvidenceGate();
			const result = gate.evaluate(noEvidence);

			expect(result.hasEvidence).toBe(false);
			expect(result.shouldProceedToLLM).toBe(false);
			expect(result.reason).toContain('No evidence found');
		});
	});

	describe('configurable thresholds', () => {
		it('should respect custom minimum score', () => {
			const strictGate = new EvidenceGate({ minimumScore: 0.9 });
			const lenientGate = new EvidenceGate({ minimumScore: 0.1 });

			const strictResult = strictGate.evaluate(highQualityEvidence);
			const lenientResult = lenientGate.evaluate(lowQualityEvidence);

			expect(strictResult.shouldProceedToLLM).toBe(true); // 0.9 and 0.85 scores
			expect(lenientResult.shouldProceedToLLM).toBe(true); // 0.2 score passes 0.1 threshold
		});

		it('should respect minimum citation count', () => {
			const gate = new EvidenceGate({ minimumCitations: 3 });
			const result = gate.evaluate(highQualityEvidence); // only 2 citations

			expect(result.hasEvidence).toBe(false);
			expect(result.reason).toContain('Insufficient citations');
		});

		it('should respect evidence threshold for claims', () => {
			const strictGate = new EvidenceGate({ evidenceThreshold: 0.8 }); // 80% of claims need evidence
			const result = strictGate.evaluate(mixedClaimEvidence); // only 50% supported

			expect(result.hasEvidence).toBe(true);
			expect(result.shouldProceedToLLM).toBe(false);
			expect(result.reason).toContain('Insufficient claim coverage');
		});
	});

	describe('routing decisions', () => {
		it('should route to no-answer when no evidence', () => {
			const gate = new EvidenceGate();
			const routing = gate.shouldRoute(noEvidence, 'test query');

			expect(routing.route).toBe('no-answer');
			expect(routing.response).toContain('No supporting evidence');
		});

		it('should route to evidence-only for partial evidence', () => {
			const gate = new EvidenceGate({
				minimumScore: 0.1,
				evidenceThreshold: 0.8, // Require 80% claim coverage
			});
			const routing = gate.shouldRoute(mixedClaimEvidence, 'test query');

			expect(routing.route).toBe('evidence');
			expect(routing.response).toContain('Based on available evidence');
		});

		it('should route to LLM for good evidence', () => {
			const gate = new EvidenceGate();
			const routing = gate.shouldRoute(highQualityEvidence, 'test query');

			expect(routing.route).toBe('llm');
			expect(routing.response).toBeUndefined(); // LLM will generate response
		});
	});

	describe('configuration management', () => {
		it('should allow updating options', () => {
			const gate = new EvidenceGate({ minimumScore: 0.5 });

			expect(gate.getOptions().minimumScore).toBe(0.5);

			gate.updateOptions({ minimumScore: 0.8 });

			expect(gate.getOptions().minimumScore).toBe(0.8);
		});

		it('should use default options when not specified', () => {
			const gate = new EvidenceGate();
			const options = gate.getOptions();

			expect(options.minimumScore).toBe(0.3);
			expect(options.minimumCitations).toBe(1);
			expect(options.evidenceThreshold).toBe(0.5);
			expect(options.noEvidenceResponse).toContain('No supporting evidence');
		});
	});

	describe('confidence calculation', () => {
		it('should calculate confidence based on score and citation count', () => {
			const gate = new EvidenceGate();

			const highConfidence = gate.evaluate(highQualityEvidence);
			const lowConfidence = gate.evaluate({
				text: 'Low quality',
				citations: [
					{
						id: 'cite-low',
						text: 'Low quality citation',
						source: 'unreliable.com',
						score: 0.3,
					},
				],
			});

			expect(highConfidence.confidence).toBeGreaterThan(
				lowConfidence.confidence!,
			);
			expect(highConfidence.confidence).toBeGreaterThan(0.5);
		});

		it('should provide 0 confidence for rejected evidence', () => {
			const gate = new EvidenceGate();
			const result = gate.evaluate(noEvidence);

			expect(result.confidence).toBe(0);
		});
	});
});
