/**
 * REF‑RAG Query Guard
 *
 * Analyzes queries to determine risk classification and generate
 * mandatory expansion hints for safe and comprehensive retrieval.
 */

import type {
	RiskClass,
	QueryGuardResult,
	ExpansionHint,
} from './types.js';

/**
 * Query guard configuration
 */
export interface QueryGuardConfig {
	/** Enable keyword-based risk detection */
	enableKeywordDetection: boolean;
	/** Enable domain classification */
	enableDomainClassification: boolean;
	/** Enable entity extraction */
	enableEntityExtraction: boolean;
	/** Custom risk keywords per domain */
	customRiskKeywords?: Record<string, string[]>;
	/** Sensitivity thresholds */
	thresholds: {
		/** Minimum confidence for risk classification */
		riskConfidenceThreshold: number;
		/** Minimum entity frequency for mandatory expansion */
		entityFrequencyThreshold: number;
		/** Maximum query length before high risk classification */
		maxQueryLength: number;
	};
}

/**
 * Default query guard configuration
 */
export const DEFAULT_QUERY_GUARD_CONFIG: QueryGuardConfig = {
	enableKeywordDetection: true,
	enableDomainClassification: true,
	enableEntityExtraction: true,
	customRiskKeywords: {
		medical: [
			'diagnosis', 'symptom', 'treatment', 'medication', 'dosage',
			'side effect', 'contraindication', 'prescription', 'therapy',
			'clinical', 'patient', 'disease', 'condition', 'cure', 'heal',
			'surgery', 'operation', 'prognosis', 'diagnostic', 'remedy',
		],
		financial: [
			'investment', 'portfolio', 'returns', 'risk', 'asset',
			'dividend', 'interest', 'inflation', 'market', 'stock',
			'trading', 'broker', 'wealth', 'retirement', 'pension',
			'tax', 'audit', 'compliance', 'regulation', 'securities',
		],
		safety: [
			'safety', 'hazard', 'emergency', 'protocol', 'procedure',
			'warning', 'caution', 'danger', 'critical', 'failure',
			'accident', 'injury', 'prevention', 'protection', 'secure',
		],
		legal: [
			'legal', 'law', 'contract', 'liability', 'compliance',
			'regulation', 'statute', 'jurisdiction', 'litigation',
			'court', 'judge', 'lawyer', 'attorney', 'lawsuit',
			'patent', 'copyright', 'trademark', 'intellectual property',
		],
		security: [
			'security', 'vulnerability', 'exploit', 'attack', 'threat',
			'malware', 'virus', 'hacker', 'breach', 'intrusion',
			'firewall', 'encryption', 'authentication', 'authorization',
		],
	},
	thresholds: {
		riskConfidenceThreshold: 0.6,
		entityFrequencyThreshold: 2,
		maxQueryLength: 1000,
	},
};

/**
 * Query guard for risk classification and expansion hints
 */
export class QueryGuard {
	private readonly config: QueryGuardConfig;

	constructor(config: Partial<QueryGuardConfig> = {}) {
		this.config = { ...DEFAULT_QUERY_GUARD_CONFIG, ...config };
	}

	/**
	 * Analyze query for risk classification and expansion hints
	 */
	async analyzeQuery(query: string): Promise<QueryGuardResult> {
		const startTime = Date.now();

		// Input sanitization and validation
		const sanitizedQuery = this.sanitizeInput(query);

		// Basic query validation
		if (sanitizedQuery.length > this.config.thresholds.maxQueryLength) {
			return this.createHighRiskResult(
				sanitizedQuery,
				'Query exceeds maximum length limit',
				startTime,
			);
		}

		// Check for potential injection attempts
		if (this.detectInjectionAttempt(query, sanitizedQuery)) {
			return this.createHighRiskResult(
				sanitizedQuery,
				'Potentially malicious input detected',
				startTime,
			);
		}

		// Initialize analysis components
		const riskFactors: Array<{ risk: RiskClass; confidence: number; reason: string }> = [];
		const expansionHints: ExpansionHint[] = [];
		const detectedEntities = new Set<string>();
		const detectedDomains = new Set<string>();

		// Keyword-based risk detection
		if (this.config.enableKeywordDetection) {
			const keywordResults = this.analyzeKeywords(sanitizedQuery);
			riskFactors.push(...keywordResults.risks);
			expansionHints.push(...keywordResults.hints);
		}

		// Domain classification
		if (this.config.enableDomainClassification) {
			const domainResults = this.classifyDomains(sanitizedQuery);
			riskFactors.push(...domainResults.risks);
			expansionHints.push(...domainResults.hints);
			for (const domain of domainResults.domains) {
				detectedDomains.add(domain);
			}
		}

		// Entity extraction
		if (this.config.enableEntityExtraction) {
			const entityResults = this.extractEntities(sanitizedQuery);
			expansionHints.push(...entityResults.hints);
			for (const entity of entityResults.entities) {
				detectedEntities.add(entity);
			}
		}

		// Query pattern analysis
		const patternResults = this.analyzePatterns(sanitizedQuery);
		riskFactors.push(...patternResults.risks);
		expansionHints.push(...patternResults.hints);

		// Determine final risk classification
		const finalRisk = this.determineRiskClass(riskFactors);
		const finalHints = this.prioritizeExpansionHints(expansionHints, finalRisk);

		// Add mandatory hints for high-risk queries
		if (finalRisk === RiskClass.HIGH || finalRisk === RiskClass.CRITICAL) {
			finalHints.push(...this.getMandatoryHints(finalRisk, Array.from(detectedEntities)));
		}

		const processingTime = Date.now() - startTime;
		const confidence = this.calculateOverallConfidence(riskFactors, finalRisk);

		return {
			riskClass: finalRisk,
			hardRequirements: this.getHardRequirements(finalRisk),
			expansionHints: finalHints,
			metadata: {
				confidence,
				processingTimeMs: processingTime,
				detectedEntities: Array.from(detectedEntities),
				detectedDomains: Array.from(detectedDomains),
			},
		};
	}

	/**
	 * Analyze keywords for risk factors
	 */
	private analyzeKeywords(query: string): { risks: Array<{ risk: RiskClass; confidence: number; reason: string }>; hints: ExpansionHint[] } {
		const risks: Array<{ risk: RiskClass; confidence: number; reason: string }> = [];
		const hints: ExpansionHint[] = [];
		const lowerQuery = query.toLowerCase();

		// Check custom risk keywords
		for (const [domain, keywords] of Object.entries(this.config.customRiskKeywords || {})) {
			const matchedKeywords = keywords.filter(keyword => lowerQuery.includes(keyword));

			if (matchedKeywords.length > 0) {
				const risk = this.getRiskClassForDomain(domain);
				const confidence = Math.min(0.9, 0.5 + (matchedKeywords.length * 0.1));

				risks.push({
					risk,
					confidence,
					reason: `Contains ${matchedKeywords.length} ${domain} keywords: ${matchedKeywords.slice(0, 3).join(', ')}`,
				});

				// Add expansion hints for the domain
				hints.push({
					type: 'domain',
					value: domain,
					priority: this.getPriorityForRisk(risk),
					mandatory: risk === RiskClass.HIGH || risk === RiskClass.CRITICAL,
				});
			}
		}

		return { risks, hints };
	}

	/**
	 * Classify query domains
	 */
	private classifyDomains(query: string): { risks: Array<{ risk: RiskClass; confidence: number; reason: string }>; hints: ExpansionHint[]; domains: string[] } {
		const risks: Array<{ risk: RiskClass; confidence: number; reason: string }> = [];
		const hints: ExpansionHint[] = [];
		const domains: string[] = [];
		const lowerQuery = query.toLowerCase();

		// Domain-specific patterns
		const domainPatterns = [
			{
				domain: 'medical',
				patterns: [
					/\b(what is|how to treat|symptoms of|diagnosis for|cure for)\b.*\b(disease|illness|condition|pain|fever|headache)\b/i,
					/\b(medication|medicine|drug|prescription|dosage|side effect)\b/i,
					/\b(doctor|physician|hospital|clinic|treatment|therapy)\b/i,
				],
				risk: RiskClass.HIGH,
			},
			{
				domain: 'financial',
				patterns: [
					/\b(invest|invest in|buy|sell|trade)\s+(stock|bond|commodity|crypto|currency)\b/i,
					/\b(financial advice|investment strategy|portfolio|returns|dividend)\b/i,
					/\b(tax filing|tax deduction|retirement planning|pension|401k|ira)\b/i,
				],
				risk: RiskClass.MEDIUM,
			},
			{
				domain: 'legal',
				patterns: [
					/\b(legal advice|sue|lawsuit|court case|contract|agreement)\b/i,
					/\b(is it legal|am I liable|what are my rights|copyright|patent)\b/i,
					/\b(lawyer|attorney|legal representation|defense|prosecution)\b/i,
				],
				risk: RiskClass.HIGH,
			},
			{
				domain: 'technical',
				patterns: [
					/\b(how to code|programming|algorithm|function|method|class)\b/i,
					/\b(debug|fix error|troubleshoot|optimize|refactor)\b/i,
					/\b(api|database|server|network|security|authentication)\b/i,
				],
				risk: RiskClass.LOW,
			},
		];

		for (const { domain, patterns, risk } of domainPatterns) {
			for (const pattern of patterns) {
				if (pattern.test(query)) {
					if (!domains.includes(domain)) {
						domains.push(domain);
					}

					risks.push({
						risk,
						confidence: 0.7,
						reason: `Query matches ${domain} domain pattern`,
					});

					hints.push({
						type: 'domain',
						value: domain,
						priority: this.getPriorityForRisk(risk),
						mandatory: risk === RiskClass.HIGH || risk === RiskClass.CRITICAL,
					});
				}
			}
		}

		return { risks, hints, domains };
	}

	/**
	 * Extract entities from query
	 */
	private extractEntities(query: string): { hints: ExpansionHint[]; entities: string[] } {
		const hints: ExpansionHint[] = [];
		const entities: string[] = [];

		// Numeric entities
		const numericMatches = query.match(/\b\d+(?:\.\d+)?(?:\s*(?:%|percent|\$|€|£|¥|kg|g|mg|lb|oz|km|m|cm|mm|mi|ft|in))?\b/g);
		if (numericMatches) {
			numericMatches.forEach(num => {
				entities.push(num);
				hints.push({
					type: 'numeric',
					value: num,
					priority: 0.6,
					mandatory: false,
				});
			});
		}

		// Date entities
		const dateMatches = query.match(/\b\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi);
		if (dateMatches) {
			dateMatches.forEach(date => {
				entities.push(date);
				hints.push({
					type: 'temporal',
					value: date,
					priority: 0.7,
					mandatory: false,
				});
			});
		}

		// Code entities (function names, variables, etc.)
		const codeMatches = query.match(/\b[a-zA-Z_]\w*\(\)|\b[a-zA-Z_]\w*\.[a-zA-Z_]\w*\b|`[^`]+`/g);
		if (codeMatches) {
			codeMatches.forEach(code => {
				entities.push(code);
				hints.push({
					type: 'code',
					value: code,
					priority: 0.8,
					mandatory: false,
				});
			});
		}

		// Proper nouns (capitalized words)
		const properNounMatches = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
		if (properNounMatches) {
			properNounMatches.slice(0, 5).forEach(noun => { // Limit to prevent noise
				entities.push(noun);
				hints.push({
					type: 'entity',
					value: noun,
					priority: 0.5,
					mandatory: false,
				});
			});
		}

		return { hints, entities };
	}

	/**
	 * Analyze query patterns for risk factors
	 */
	private analyzePatterns(query: string): { risks: Array<{ risk: RiskClass; confidence: number; reason: string }>; hints: ExpansionHint[] } {
		const risks: Array<{ risk: RiskClass; confidence: number; reason: string }> = [];
		const hints: ExpansionHint[] = [];

		// Question patterns that indicate different risk levels
		const questionPatterns = [
			{
				pattern: /\b(how to|steps to|guide for|instructions for)\b/i,
				risk: RiskClass.MEDIUM,
				reason: 'Step-by-step instructions requested',
			},
			{
				pattern: /\b(what is|explain|describe|define)\b/i,
				risk: RiskClass.LOW,
				reason: 'General information request',
			},
			{
				pattern: /\b(should I|can I|is it safe|is it legal|am I allowed to)\b/i,
				risk: RiskClass.HIGH,
				reason: 'Seeking permission or safety advice',
			},
			{
				pattern: /\b(emergency|urgent|immediately|asap|right now)\b/i,
				risk: RiskClass.CRITICAL,
				reason: 'Emergency or time-sensitive request',
			},
			{
				pattern: /\b(Compare|difference between|vs|versus)\b/i,
				risk: RiskClass.LOW,
				reason: 'Comparative analysis request',
			},
		];

		for (const { pattern, risk, reason } of questionPatterns) {
			if (pattern.test(query)) {
				risks.push({
					risk,
					confidence: 0.6,
					reason,
				});
			}
		}

		// Length-based risk assessment
		if (query.length < 10) {
			risks.push({
				risk: RiskClass.LOW,
				confidence: 0.5,
				reason: 'Very short query - low complexity',
			});
		} else if (query.length > 500) {
			risks.push({
				risk: RiskClass.MEDIUM,
				confidence: 0.7,
				reason: 'Long query - may be complex or ambiguous',
			});
		}

		// Check for negation or uncertainty
		if (query.match(/\b(not|never|don't|cannot|unable|impossible)\b/i)) {
			hints.push({
				type: 'domain',
				value: 'negation',
				priority: 0.8,
				mandatory: false,
			});
		}

		return { risks, hints };
	}

	/**
	 * Determine final risk class from collected factors
	 */
	private determineRiskClass(riskFactors: Array<{ risk: RiskClass; confidence: number; reason: string }>): RiskClass {
		if (riskFactors.length === 0) {
			return RiskClass.LOW;
		}

		// Weight risks by confidence
		const riskScores = {
			[RiskClass.LOW]: 0,
			[RiskClass.MEDIUM]: 0,
			[RiskClass.HIGH]: 0,
			[RiskClass.CRITICAL]: 0,
		};

		for (const { risk, confidence } of riskFactors) {
			riskScores[risk] += confidence;
		}

		// If any critical risks with high confidence, return critical
		if (riskScores[RiskClass.CRITICAL] >= this.config.thresholds.riskConfidenceThreshold) {
			return RiskClass.CRITICAL;
		}

		// If any high risks with high confidence, return high
		if (riskScores[RiskClass.HIGH] >= this.config.thresholds.riskConfidenceThreshold) {
			return RiskClass.HIGH;
		}

		// Return the risk class with the highest score
		const maxRisk = Object.entries(riskScores).reduce((max, [risk, score]) =>
			score > max.score ? { risk: risk as RiskClass, score } : max,
			{ risk: RiskClass.LOW, score: 0 }
		);

		return maxRisk.score > 0.3 ? maxRisk.risk : RiskClass.LOW;
	}

	/**
	 * Prioritize and filter expansion hints
	 */
	private prioritizeExpansionHints(hints: ExpansionHint[], riskClass: RiskClass): ExpansionHint[] {
		// Group hints by type and value to avoid duplicates
		const uniqueHints = new Map<string, ExpansionHint>();

		for (const hint of hints) {
			const key = `${hint.type}:${hint.value}`;
			const existing = uniqueHints.get(key);

			if (!existing || hint.priority > existing.priority || hint.mandatory) {
				uniqueHints.set(key, {
					...hint,
					priority: Math.max(hint.priority, existing?.priority || 0),
					mandatory: hint.mandatory || existing?.mandatory || false,
				});
			}
		}

		// Convert back to array and sort by priority
		const prioritized = Array.from(uniqueHints.values())
			.sort((a, b) => {
				// Mandatory hints first
				if (a.mandatory && !b.mandatory) return -1;
				if (!a.mandatory && b.mandatory) return 1;
				// Then by priority (descending)
				return b.priority - a.priority;
			});

		// Limit number of hints based on risk class
		const maxHints = {
			[RiskClass.LOW]: 5,
			[RiskClass.MEDIUM]: 8,
			[RiskClass.HIGH]: 12,
			[RiskClass.CRITICAL]: 15,
		};

		return prioritized.slice(0, maxHints[riskClass]);
	}

	/**
	 * Get mandatory expansion hints for high-risk queries
	 */
	private getMandatoryHints(riskClass: RiskClass, entities: string[]): ExpansionHint[] {
		const hints: ExpansionHint[] = [];

		// Always include recent/fresh sources for high-risk queries
		hints.push({
			type: 'temporal',
			value: 'recent',
			priority: 1.0,
			mandatory: true,
		});

		// Include authoritative sources for critical domains
		if (riskClass === RiskClass.CRITICAL) {
			hints.push({
				type: 'domain',
				value: 'authoritative',
				priority: 1.0,
				mandatory: true,
			});
		}

		// Include numeric precision for queries with numbers
		const numericEntities = entities.filter(e => /\d/.test(e));
		if (numericEntities.length > 0) {
			hints.push({
				type: 'numeric',
				value: 'precision',
				priority: 0.9,
				mandatory: true,
			});
		}

		return hints;
	}

	/**
	 * Get hard requirements for risk classes
	 */
	private getHardRequirements(riskClass: RiskClass): string[] {
		const requirements = {
			[RiskClass.LOW]: [
				'Relevant and accurate information',
				'Proper citations when available',
			],
			[RiskClass.MEDIUM]: [
				'Relevant and accurate information',
				'Proper citations when available',
				'Consider multiple perspectives',
				'Highlight uncertainties or limitations',
			],
			[RiskClass.HIGH]: [
				'Relevant and accurate information',
				'Comprehensive coverage with citations',
				'Include authoritative sources',
				'Highlight uncertainties and limitations',
				'Provide context and disclaimers',
				'Cross-reference information when possible',
			],
			[RiskClass.CRITICAL]: [
				'Relevant and accurate information',
				'Comprehensive coverage with citations',
				'Only authoritative and verified sources',
				'Clear uncertainty and limitation statements',
				'Strong disclaimers about professional advice',
				'Multiple source verification',
				'Recent and up-to-date information',
				'Context about information reliability',
			],
		};

		return requirements[riskClass];
	}

	/**
	 * Get risk class for domain
	 */
	private getRiskClassForDomain(domain: string): RiskClass {
		const domainRiskMap: Record<string, RiskClass> = {
			medical: RiskClass.HIGH,
			financial: RiskClass.MEDIUM,
			safety: RiskClass.CRITICAL,
			legal: RiskClass.HIGH,
			security: RiskClass.HIGH,
			technical: RiskClass.LOW,
		};

		return domainRiskMap[domain] || RiskClass.LOW;
	}

	/**
	 * Get priority value for risk class
	 */
	private getPriorityForRisk(risk: RiskClass): number {
		const priorityMap = {
			[RiskClass.LOW]: 0.4,
			[RiskClass.MEDIUM]: 0.6,
			[RiskClass.HIGH]: 0.8,
			[RiskClass.CRITICAL]: 1.0,
		};

		return priorityMap[risk];
	}

	/**
	 * Calculate overall confidence for risk classification
	 */
	private calculateOverallConfidence(
		riskFactors: Array<{ risk: RiskClass; confidence: number; reason: string }>,
		finalRisk: RiskClass,
	): number {
		if (riskFactors.length === 0) {
			return 0.5; // Default confidence
		}

		// Average confidence of factors that contributed to the final risk
		const relevantFactors = riskFactors.filter(factor => factor.risk === finalRisk);
		if (relevantFactors.length === 0) {
			return 0.5;
		}

		const avgConfidence = relevantFactors.reduce((sum, factor) => sum + factor.confidence, 0) / relevantFactors.length;
		return Math.min(avgConfidence, 1.0);
	}

	/**
	 * Create high-risk result for invalid queries
	 */
	private createHighRiskResult(
		query: string,
		reason: string,
		startTime: number,
	): QueryGuardResult {
		return {
			riskClass: RiskClass.HIGH,
			hardRequirements: ['Query validation required'],
			expansionHints: [{
				type: 'domain',
				value: 'validation',
				priority: 1.0,
				mandatory: true,
			}],
			metadata: {
				confidence: 1.0,
				processingTimeMs: Date.now() - startTime,
				detectedEntities: [],
				detectedDomains: [],
			},
		};
	}

	/**
	 * Sanitize input to prevent injection attacks
	 */
	private sanitizeInput(input: string): string {
		// Remove or replace potentially dangerous characters
		return input
			// Remove null bytes
			.replace(/\0/g, '')
			// Remove control characters except newlines and tabs
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Security requirement to filter control chars
			.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
			// Normalize multiple spaces
			.replace(/\s+/g, ' ')
			// Trim whitespace
			.trim();
	}

	/**
	 * Detect potential injection attempts
	 */
	private detectInjectionAttempt(original: string, sanitized: string): boolean {
		// Check if sanitization removed significant content
		if (sanitized.length < original.length * 0.5) {
			return true;
		}

		// Check for common injection patterns
		const injectionPatterns = [
			// Script injection attempts
			/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			// SQL injection patterns
			/(union|select|insert|update|delete|drop|create|alter)\s+/gi,
			// Command injection patterns
			/(\$\(.*?\)|`.*?`|\|\s*[\w\s]+\s*\|)/g,
			// Path traversal
			/\.\.[\/\\]/g,
			// JavaScript attempts
			/(javascript:|on\w+\s*=)/gi,
			// HTML encoding attempts
			/&[#\w]+;/g,
		];

		for (const pattern of injectionPatterns) {
			if (pattern.test(original)) {
				return true;
			}
		}

		// Check for excessive special characters that might indicate encoding tricks
		const specialCharRatio = (original.match(/[^\w\s]/g) || []).length / original.length;
		if (specialCharRatio > 0.3) {
			return true;
		}

		// Check for repeated patterns that might indicate brute force attempts
		const repeatedPattern = /(.)\1{10,}/g;
		if (repeatedPattern.test(original)) {
			return true;
		}

		return false;
	}
}

/**
 * Create query guard instance
 */
export function createQueryGuard(config?: Partial<QueryGuardConfig>): QueryGuard {
	return new QueryGuard(config);
}