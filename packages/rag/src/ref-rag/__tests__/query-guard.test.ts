/**
 * REF‑RAG Query Guard Tests
 *
 * Tests for risk classification and mandatory expansion hints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryGuard } from '../query-guard.js';
import { RiskClass } from '../types.js';

describe('QueryGuard', () => {
	let queryGuard: QueryGuard;

	beforeEach(() => {
		queryGuard = new QueryGuard();
	});

	describe('analyzeQuery', () => {
		it('should classify LOW risk queries correctly', async () => {
			const lowRiskQueries = [
				'What is the capital of France?',
				'Tell me about dogs',
				'How do I make coffee?',
				'What are the primary colors?',
				'Explain photosynthesis simply'
			];

			for (const query of lowRiskQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.LOW);
				expect(result.expansionHints.mandatoryExpansion).toBe(false);
				expect(result.hardRequirements.factVerification).toBe(false);
			}
		});

		it('should classify MEDIUM risk queries correctly', async () => {
			const mediumRiskQueries = [
				'What are the side effects of aspirin?',
				'How much should I invest in stocks?',
				'What are the tax implications of remote work?',
				'Explain the benefits of different diets',
				'What skills do I need for web development?'
			];

			for (const query of mediumRiskQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.MEDIUM);
				expect(result.expansionHints.mandatoryExpansion).toBe(true);
				expect(result.hardRequirements.factVerification).toBe(true);
			}
		});

		it('should classify HIGH risk queries correctly', async () => {
			const highRiskQueries = [
				'What are the symptoms of heart attack?',
				'How should I treat a severe allergic reaction?',
				'What legal steps do I need for divorce?',
				'How do I file for bankruptcy?',
				'What medications interact with antidepressants?'
			];

			for (const query of highRiskQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.HIGH);
				expect(result.expansionHints.mandatoryExpansion).toBe(true);
				expect(result.hardRequirements.factVerification).toBe(true);
				expect(result.hardRequirements.structuredOutput).toBe(true);
			}
		});

		it('should classify CRITICAL risk queries correctly', async () => {
			const criticalRiskQueries = [
				'How to treat a gunshot wound?',
				'What are emergency surgery procedures?',
				'How to handle hazardous chemical spills?',
				'Emergency response protocols for nuclear incidents',
				'Life support machine operation procedures'
			];

			for (const query of criticalRiskQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.CRITICAL);
				expect(result.expansionHints.mandatoryExpansion).toBe(true);
				expect(result.hardRequirements.factVerification).toBe(true);
				expect(result.hardRequirements.structuredOutput).toBe(true);
				expect(result.hardRequirements.escalationPath).toBe(true);
			}
		});

		it('should detect financial domain correctly', async () => {
			const financialQueries = [
				'What is the current stock price of Apple?',
				'How do I calculate compound interest?',
				'What are the tax brackets for 2024?',
				'Explain cryptocurrency trading strategies',
				'How much should I save for retirement?'
			];

			for (const query of financialQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.detectedDomains).toContain('financial');
			}
		});

		it('should detect medical domain correctly', async () => {
			const medicalQueries = [
				'What are the symptoms of diabetes?',
				'How does blood pressure medication work?',
				'What are the recommended vaccines for adults?',
				'Explain the treatment for asthma',
				'What causes migraines?'
			];

			for (const query of medicalQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.detectedDomains).toContain('medical');
			}
		});

		it('should detect legal domain correctly', async () => {
			const legalQueries = [
				'What is the statute of limitations for fraud?',
				'How do I create a legally binding contract?',
				'What are my tenant rights?',
				'Explain intellectual property law',
				'How to file a lawsuit?'
			];

			for (const query of legalQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.detectedDomains).toContain('legal');
			}
		});

		it('should extract entities correctly', async () => {
			const query = 'What are the tax implications of working at Google in California?';
			const result = await queryGuard.analyzeQuery(query);

			expect(result.extractedEntities.companies).toContain('google');
			expect(result.extractedEntities.locations).toContain('california');
			expect(result.extractedEntities.topics).toContain('tax');
		});

		it('should generate appropriate expansion hints based on query type', async () => {
			const comparativeQuery = 'Compare the benefits of Roth IRA vs traditional IRA';
			const result = await queryGuard.analyzeQuery(comparativeQuery);

			expect(result.expansionHints.preferComparative).toBe(true);
			expect(result.expansionHints.requireRecentData).toBe(true);
			expect(result.expansionHints.mandatoryExpansion).toBe(true);
		});

		it('should handle queries with multiple domains', async () => {
			const query = 'What are the legal requirements for medical device companies?';
			const result = await queryGuard.analyzeQuery(query);

			expect(result.detectedDomains).toContain('medical');
			expect(result.detectedDomains).toContain('legal');
			expect(result.riskClass).toBe(RiskClass.HIGH);
		});

		it('should handle empty or invalid queries', async () => {
			const emptyQuery = '';
			const result = await queryGuard.analyzeQuery(emptyQuery);

			expect(result.riskClass).toBe(RiskClass.LOW);
			expect(result.detectedDomains).toEqual([]);
			expect(result.extractedEntities).toEqual({
				companies: [],
				people: [],
				locations: [],
				dates: [],
				topics: []
			});
		});

		it('should handle queries with special characters', async () => {
			const query = 'What are the tax implications of COVID-19 relief funds ($2.3T)?';
			const result = await queryGuard.analyzeQuery(query);

			expect(result.riskClass).toBe(RiskClass.MEDIUM);
			expect(result.detectedDomains).toContain('financial');
		});

		it('should provide structured expansion hints', async () => {
			const query = 'How should I diversify my investment portfolio for retirement?';
			const result = await queryGuard.analyzeQuery(query);

			expect(result.expansionHints).toMatchObject({
				mandatoryExpansion: true,
				requireRecentData: true,
				preferAuthoritativeSources: true,
				depth: 'comprehensive'
			});

			expect(typeof result.expansionHints.contextTimeframe).toBe('string');
			expect(typeof result.expansionHints.expectedAnswerLength).toBe('string');
		});
	});

	describe('risk classification edge cases', () => {
		it('should classify borderline medical queries appropriately', async () => {
			const borderlineQueries = [
				'What are common vitamins and supplements?',
				'How to maintain a healthy diet?',
				'Benefits of regular exercise'
			];

			for (const query of borderlineQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.LOW);
			}
		});

		it('should classify borderline financial queries appropriately', async () => {
			const borderlineQueries = [
				'What is a savings account?',
				'How do credit cards work?',
				'Basic budgeting tips'
			];

			for (const query of borderlineQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect(result.riskClass).toBe(RiskClass.LOW);
			}
		});

		it('should handle urgent but non-critical queries', async () => {
			const urgentQueries = [
				'What should I do if I lost my wallet?',
				'How to report a stolen credit card?',
				'Emergency steps for lost passport'
			];

			for (const query of urgentQueries) {
				const result = await queryGuard.analyzeQuery(query);
				expect([RiskClass.HIGH, RiskClass.MEDIUM]).toContain(result.riskClass);
			}
		});
	});

	describe('performance', () => {
		it('should process queries quickly', async () => {
			const startTime = Date.now();

			for (let i = 0; i < 100; i++) {
				await queryGuard.analyzeQuery('What is the capital of France?');
			}

			const endTime = Date.now();
			const averageTime = (endTime - startTime) / 100;

			// Should process queries in under 10ms on average
			expect(averageTime).toBeLessThan(10);
		});

		it('should handle batch processing efficiently', async () => {
			const queries = Array(50).fill('What are the symptoms of flu?');

			const startTime = Date.now();
			const results = await Promise.all(
				queries.map(query => queryGuard.analyzeQuery(query))
			);
			const endTime = Date.now();

			expect(results).toHaveLength(50);
			results.forEach(result => {
				expect(result.riskClass).toBe(RiskClass.MEDIUM);
			});

			// Batch processing should be efficient
			expect(endTime - startTime).toBeLessThan(1000);
		});
	});
});