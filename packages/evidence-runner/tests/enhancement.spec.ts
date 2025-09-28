import { describe, expect, it } from 'vitest';

// Import the evidence enhancement function (needs to be implemented)
import { enhanceEvidence } from '../../src/enhancement/evidence-enhancer.js';

describe('Evidence Enhancement with brAInwav ASBRAIIntegration', () => {
	it('enriches evidence text with improvement summary', async () => {
		const rawEvidence = `
			User reported login failure at 2024-09-28 10:30:00.
			Browser: Chrome 118
			Error: "Invalid credentials"
			Previous successful login: 2024-09-27 15:45:00
		`;

		const enhanced = await enhanceEvidence(rawEvidence);

		// Should not return identical input
		expect(enhanced.enrichedText).not.toBe(rawEvidence);
		expect(enhanced.enrichedText.length).toBeGreaterThan(rawEvidence.length);

		// Should include brAInwav branding
		expect(enhanced.enrichedText).toContain('brAInwav');

		// Should provide improvement summary
		expect(enhanced.improvementSummary).toBeDefined();
		expect(enhanced.improvementSummary.length).toBeGreaterThan(0);
		expect(enhanced.improvementSummary).toContain('enhanced');

		// Should include analysis metadata
		expect(enhanced.metadata).toBeDefined();
		expect(enhanced.metadata.originalLength).toBe(rawEvidence.trim().length);
		expect(enhanced.metadata.enhancedLength).toBe(enhanced.enrichedText.length);
		expect(enhanced.metadata.enhancementRatio).toBeGreaterThan(1);
		expect(enhanced.metadata.processingTime).toBeGreaterThan(0);
		expect(enhanced.metadata.model).toContain('brAInwav');
	});

	it('adds contextual analysis and structured insights', async () => {
		const technicalEvidence = `
			API endpoint /auth/login returned 401
			Request headers: {Authorization: Bearer abc123}
			Response time: 2.3s
			Database connection status: active
		`;

		const enhanced = await enhanceEvidence(technicalEvidence);

		// Should provide structured analysis
		expect(enhanced.enrichedText).toContain('Authentication');
		expect(enhanced.enrichedText).toContain('response time');
		expect(enhanced.enrichedText).toContain('brAInwav analysis');

		// Should include technical insights
		expect(enhanced.insights).toBeDefined();
		expect(enhanced.insights.categories).toContain('authentication');
		expect(enhanced.insights.categories).toContain('performance');
		expect(enhanced.insights.severity).toMatch(/^(low|medium|high|critical)$/);
		expect(enhanced.insights.recommendations).toHaveLength.greaterThan(0);

		// Should maintain original technical details
		expect(enhanced.enrichedText).toContain('401');
		expect(enhanced.enrichedText).toContain('/auth/login');
		expect(enhanced.enrichedText).toContain('2.3s');
	});

	it('handles edge cases and malformed input gracefully', async () => {
		const edgeCases = [
			'', // Empty string
			'   \n\t  ', // Whitespace only
			'Single word', // Minimal input
			'<script>alert("xss")</script>Malicious content', // XSS attempt
			`${'Very '.repeat(1000)}long input`, // Very long input
		];

		for (const input of edgeCases) {
			const enhanced = await enhanceEvidence(input);

			// Should never crash or return null/undefined
			expect(enhanced).toBeDefined();
			expect(enhanced.enrichedText).toBeDefined();
			expect(enhanced.improvementSummary).toBeDefined();

			// Should handle empty/whitespace gracefully
			if (input.trim().length === 0) {
				expect(enhanced.enrichedText).toContain('brAInwav');
				expect(enhanced.improvementSummary).toContain('no evidence');
			}

			// Should sanitize malicious content
			if (input.includes('<script>')) {
				expect(enhanced.enrichedText).not.toContain('<script>');
				expect(enhanced.enrichedText).not.toContain('alert');
			}

			// Should handle very long input
			if (input.length > 5000) {
				expect(enhanced.metadata.truncated).toBe(true);
				expect(enhanced.enrichedText.length).toBeLessThan(input.length);
			}
		}
	});

	it('provides deterministic enhancement with fallback options', async () => {
		const testEvidence = 'Network timeout on user profile fetch';

		// Test with MLX local model
		const mlxEnhanced = await enhanceEvidence(testEvidence, {
			provider: 'mlx',
			model: 'glm-4.5-mlx',
		});

		expect(mlxEnhanced.metadata.provider).toBe('mlx');
		expect(mlxEnhanced.metadata.model).toBe('glm-4.5-mlx');

		// Test with remote fallback
		const fallbackEnhanced = await enhanceEvidence(testEvidence, {
			provider: 'fallback',
			deterministic: true,
		});

		expect(fallbackEnhanced.metadata.provider).toBe('fallback');
		expect(fallbackEnhanced.metadata.deterministic).toBe(true);

		// Both should enhance the evidence but may differ in content
		expect(mlxEnhanced.enrichedText).not.toBe(testEvidence);
		expect(fallbackEnhanced.enrichedText).not.toBe(testEvidence);
		expect(mlxEnhanced.enrichedText).toContain('brAInwav');
		expect(fallbackEnhanced.enrichedText).toContain('brAInwav');
	});

	it('integrates with existing evidence types and formats', async () => {
		const structuredEvidence = {
			timestamp: '2024-09-28T10:30:00Z',
			level: 'error',
			source: 'user-session',
			message: 'Authentication failed for user ID 12345',
			context: {
				userAgent: 'Mozilla/5.0...',
				ipAddress: '192.168.1.100',
				sessionId: 'sess_abc123',
			},
		};

		const enhanced = await enhanceEvidence(JSON.stringify(structuredEvidence, null, 2));

		// Should parse and enhance structured data
		expect(enhanced.enrichedText).toContain('Authentication failed');
		expect(enhanced.enrichedText).toContain('user ID 12345');
		expect(enhanced.enrichedText).toContain('brAInwav');

		// Should maintain structured information
		expect(enhanced.structuredData).toBeDefined();
		expect(enhanced.structuredData.originalFormat).toBe('json');
		expect(enhanced.structuredData.parsed).toBeTruthy();
		expect(enhanced.structuredData.fields).toHaveLength.greaterThan(0);

		// Should provide relevant insights for structured data
		expect(enhanced.insights.categories).toContain('authentication');
		expect(enhanced.insights.categories).toContain('security');
	});

	it('tracks enhancement metrics and performance', async () => {
		const startTime = Date.now();
		const evidence = 'System memory usage exceeded 90% threshold';

		const enhanced = await enhanceEvidence(evidence);

		// Should track processing metrics
		expect(enhanced.metrics).toBeDefined();
		expect(enhanced.metrics.processingTimeMs).toBeGreaterThan(0);
		expect(enhanced.metrics.processingTimeMs).toBeLessThan(Date.now() - startTime + 100);
		expect(enhanced.metrics.tokensGenerated).toBeGreaterThan(0);
		expect(enhanced.metrics.compressionRatio).toBeDefined();
		expect(enhanced.metrics.qualityScore).toBeGreaterThanOrEqual(0);
		expect(enhanced.metrics.qualityScore).toBeLessThanOrEqual(1);

		// Should provide brAInwav-specific metrics
		expect(enhanced.metrics.brAInwavVersion).toBeDefined();
		expect(enhanced.metrics.enhancementEngine).toBe('ASBRAI');
		expect(enhanced.metrics.reliability).toMatch(/^(high|medium|low)$/);
	});
});
