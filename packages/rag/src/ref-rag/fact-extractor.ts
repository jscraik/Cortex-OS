/**
 * REF‑RAG Fact Extractor
 *
 * Lightweight fact extraction using regex patterns and parsers for
 * numbers, units, quotes, code spans, and other structured data.
 */

import crypto from 'node:crypto';
import type { CompressionEncodingResult, FactExtractionResult, StructuredFact } from './types.js';

/**
 * Fact extractor configuration
 */
export interface FactExtractorConfig {
	/** Enable numeric fact extraction */
	enableNumeric: boolean;
	/** Enable quote extraction */
	enableQuotes: boolean;
	/** Enable code extraction */
	enableCode: boolean;
	/** Enable date extraction */
	enableDates: boolean;
	/** Confidence threshold for extracted facts */
	confidenceThreshold: number;
	/** Maximum number of facts to extract per chunk */
	maxFactsPerChunk: number;
}

/**
 * Default fact extractor configuration
 */
export const DEFAULT_FACT_EXTRACTOR_CONFIG: FactExtractorConfig = {
	enableNumeric: true,
	enableQuotes: true,
	enableCode: true,
	enableDates: true,
	confidenceThreshold: 0.7,
	maxFactsPerChunk: 50,
};

/**
 * Fact extractor for Band C structured data
 */
export class FactExtractor {
	private readonly config: FactExtractorConfig;

	constructor(config: Partial<FactExtractorConfig> = {}) {
		this.config = { ...DEFAULT_FACT_EXTRACTOR_CONFIG, ...config };
	}

	/**
	 * Extract structured facts from text
	 */
	async extractFacts(text: string, chunkId: string): Promise<FactExtractionResult> {
		const startTime = Date.now();
		const facts: StructuredFact[] = [];

		try {
			// Extract different types of facts
			if (this.config.enableNumeric) {
				facts.push(...this.extractNumericFacts(text, chunkId));
			}

			if (this.config.enableQuotes) {
				facts.push(...this.extractQuoteFacts(text, chunkId));
			}

			if (this.config.enableCode) {
				facts.push(...this.extractCodeFacts(text, chunkId));
			}

			if (this.config.enableDates) {
				facts.push(...this.extractDateFacts(text, chunkId));
			}

			// Extract entities (basic implementation)
			facts.push(...this.extractEntityFacts(text, chunkId));

			// Filter by confidence threshold and limit
			const filteredFacts = facts
				.filter((fact) => fact.confidence >= this.config.confidenceThreshold)
				.slice(0, this.config.maxFactsPerChunk);

			const extractionTime = Date.now() - startTime;

			return {
				facts: filteredFacts,
				metadata: {
					chunkId,
					extractionTimeMs: extractionTime,
					method: 'regex',
					confidence: this.calculateOverallConfidence(filteredFacts),
				},
			};
		} catch (error) {
			throw new Error(`Fact extraction failed for chunk ${chunkId}: ${error}`);
		}
	}

	/**
	 * Extract numeric facts with units
	 */
	private extractNumericFacts(text: string, chunkId: string): StructuredFact[] {
		const facts: StructuredFact[] = [];

		// Numeric patterns with units
		const numericPatterns = [
			// Currency values: $123.45, €1,234, £12.3M
			{
				pattern: /([$€£¥]\s*[\d,]+\.?\d*(?:[KMB]n?|billion|million|thousand)?)/gi,
				type: 'number' as const,
				unit: 'currency',
			},
			// Percentages: 45%, 12.5%
			{
				pattern: /\b(\d+\.?\d*)\s*%/gi,
				type: 'number' as const,
				unit: 'percentage',
			},
			// Measurements with units: 123kg, 45.6MB, 10km/h
			{
				pattern:
					/\b(\d+\.?\d*)\s*(kg|g|mg|lb|oz|km|m|cm|mm|mi|ft|in|mm|mb|gb|tb|kb|b|hz|khz|mhz|ghz|ms|s|min|h|day|week|month|year|°c|°f|k|v|a|w|kw|mw|gw|pa|kpa|mpa|gpa|n|kn|mph|km\/h|l|ml|cl|dl|mcm|µm|nm|pm|fm|am)/gi,
				type: 'number' as const,
			},
			// Pure numbers: 123, 45.67, 1,000
			{
				pattern: /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g,
				type: 'number' as const,
				unit: 'count',
			},
		];

		for (const { pattern, type, unit } of numericPatterns) {
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
			while ((match = pattern.exec(text)) !== null) {
				const [fullMatch, numericValue] = match;
				const context = this.extractContext(text, match.index, match[0].length);
				const confidence = this.calculateNumericConfidence(fullMatch, context);

				facts.push({
					id: crypto.randomUUID(),
					type,
					value: this.parseNumericValue(numericValue),
					context,
					chunkId,
					confidence,
					metadata: {
						unit: unit || this.inferUnit(fullMatch),
						precision: this.calculatePrecision(numericValue),
						rawMatch: fullMatch,
					},
				});
			}
		}

		return facts;
	}

	/**
	 * Extract quoted text
	 */
	private extractQuoteFacts(text: string, chunkId: string): StructuredFact[] {
		const facts: StructuredFact[] = [];

		// Quote patterns: "text", 'text', and smart quotes
		const quotePatterns = [
			/"([^"]{10,200})"/g,
			/'([^']{10,200})'/g,
			/[\u201c\u201d]([^[\u201c\u201d]{10,200})[\u201c\u201d]/g, // Smart quotes
		];

		for (const pattern of quotePatterns) {
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
			while ((match = pattern.exec(text)) !== null) {
				const [fullMatch, quoteContent] = match;
				const context = this.extractContext(text, match.index, match[0].length);
				const confidence = this.calculateQuoteConfidence(quoteContent, context);

				facts.push({
					id: crypto.randomUUID(),
					type: 'quote',
					value: quoteContent.trim(),
					context,
					chunkId,
					confidence,
					metadata: {
						quoteType: fullMatch.startsWith('"') ? 'double' : 'single',
						length: quoteContent.length,
						isAttributed: this.hasAttribution(context),
					},
				});
			}
		}

		return facts;
	}

	/**
	 * Extract code snippets
	 */
	private extractCodeFacts(text: string, chunkId: string): StructuredFact[] {
		const facts: StructuredFact[] = [];

		// Code patterns: `code`, ```code```, and various language-specific patterns
		const codePatterns = [
			// Inline code: `variable_name`
			{
				pattern: /`([^`]{3,50})`/g,
				type: 'code' as const,
				style: 'inline',
			},
			// Code blocks: ```function() { ... }```
			{
				pattern: /```[\w]*\n?([^`]{20,500})\n?```/g,
				type: 'code' as const,
				style: 'block',
			},
			// Function definitions: function name(), def name(), class Name:
			{
				pattern: /\b(function|def|class|const|let|var)\s+([a-zA-Z_]\w*)\s*(?:\([^)]*\))?:?\s*{/g,
				type: 'code' as const,
				style: 'definition',
			},
			// Variable assignments: name = value
			{
				pattern: /\b([a-zA-Z_]\w*)\s*=\s*[^;,}]+/g,
				type: 'code' as const,
				style: 'assignment',
			},
		];

		for (const { pattern, type, style } of codePatterns) {
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
			while ((match = pattern.exec(text)) !== null) {
				const [fullMatch, codeContent] = match;
				const context = this.extractContext(text, match.index, match[0].length);
				const confidence = this.calculateCodeConfidence(codeContent, context, style);

				facts.push({
					id: crypto.randomUUID(),
					type,
					value: codeContent.trim(),
					context,
					chunkId,
					confidence,
					metadata: {
						codeStyle: style,
						language: this.detectLanguage(codeContent),
						lineCount: (codeContent.match(/\n/g) || []).length + 1,
						isExecutable: this.isExecutableCode(codeContent),
					},
				});
			}
		}

		return facts;
	}

	/**
	 * Extract date and time facts
	 */
	private extractDateFacts(text: string, chunkId: string): StructuredFact[] {
		const facts: StructuredFact[] = [];

		// Date patterns
		const datePatterns = [
			// ISO dates: 2024-03-15, 2024/03/15
			/\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
			// US dates: 03/15/2024, March 15, 2024
			/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/gi,
			// Relative dates: 2 days ago, next week, last month
			/\b(\d+\s+(?:day|week|month|year)s?\s+(?:ago|from now|later))\b/gi,
			// Times: 3:45 PM, 15:30, 3pm
			/\b(\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?)\b/g,
		];

		for (const pattern of datePatterns) {
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
			while ((match = pattern.exec(text)) !== null) {
				const dateValue = match[0];
				const context = this.extractContext(text, match.index, match[0].length);
				const confidence = this.calculateDateConfidence(dateValue, context);

				facts.push({
					id: crypto.randomUUID(),
					type: 'date',
					value: dateValue,
					context,
					chunkId,
					confidence,
					metadata: {
						dateFormat: this.detectDateFormat(dateValue),
						isRelative: this.isRelativeDate(dateValue),
						isPast: this.isPastDate(dateValue),
					},
				});
			}
		}

		return facts;
	}

	/**
	 * Extract basic entities (simple keyword-based approach)
	 */
	private extractEntityFacts(text: string, chunkId: string): StructuredFact[] {
		const facts: StructuredFact[] = [];

		// Simple entity patterns (could be enhanced with NLP)
		const entityPatterns = [
			// Email addresses
			{
				pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
				type: 'entity' as const,
				subtype: 'email',
			},
			// URLs
			{
				pattern: /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
				type: 'entity' as const,
				subtype: 'url',
			},
			// File paths
			{
				pattern: /\b\/[^\s<>"{}|\\^`[\]]*\b/g,
				type: 'entity' as const,
				subtype: 'filepath',
			},
			// Version numbers: v1.2.3, 2.0.1-alpha
			{
				pattern: /\b[vV]?(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9]+)?)\b/g,
				type: 'entity' as const,
				subtype: 'version',
			},
		];

		for (const { pattern, type, subtype } of entityPatterns) {
			let match: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: Standard regex iteration pattern
			while ((match = pattern.exec(text)) !== null) {
				const entityValue = match[0];
				const context = this.extractContext(text, match.index, match[0].length);
				const confidence = this.calculateEntityConfidence(entityValue, subtype);

				facts.push({
					id: crypto.randomUUID(),
					type,
					value: entityValue,
					context,
					chunkId,
					confidence,
					metadata: {
						entityType: subtype,
						isValidated: this.validateEntity(entityValue, subtype),
					},
				});
			}
		}

		return facts;
	}

	/**
	 * Extract context around a match
	 */
	private extractContext(
		text: string,
		matchIndex: number,
		matchLength: number,
		contextWindow = 100,
	): string {
		const start = Math.max(0, matchIndex - contextWindow);
		const end = Math.min(text.length, matchIndex + matchLength + contextWindow);
		return text.slice(start, end).trim();
	}

	/**
	 * Parse numeric value (handle commas, decimals, etc.)
	 */
	private parseNumericValue(value: string): number {
		// Remove commas and convert to number
		const cleanValue = value.replace(/,/g, '');
		const parsed = parseFloat(cleanValue);

		// Handle suffixes (K, M, B)
		if (cleanValue.match(/[KMB]n?$/i)) {
			const multiplier = cleanValue.toLowerCase().endsWith('k')
				? 1000
				: cleanValue.toLowerCase().endsWith('m')
					? 1000000
					: cleanValue.toLowerCase().endsWith('b')
						? 1000000000
						: 1;
			return parsed * multiplier;
		}

		return parsed;
	}

	/**
	 * Calculate confidence score for numeric facts
	 */
	private calculateNumericConfidence(match: string, context: string): number {
		let confidence = 0.8; // Base confidence

		// Higher confidence for well-formatted numbers
		if (match.match(/[$€£¥]/)) confidence += 0.1;
		if (match.match(/\d+\.\d+/)) confidence += 0.05;
		if (match.match(/\d{1,3}(,\d{3})+/)) confidence += 0.05;

		// Context factors
		if (context.match(/total|sum|amount|price|cost|value/i)) confidence += 0.1;
		if (context.match(/approximately|about|roughly/i)) confidence -= 0.1;
		if (context.match(/exactly|precisely|specifically/i)) confidence += 0.05;

		return Math.min(confidence, 1.0);
	}

	/**
	 * Calculate confidence score for quotes
	 */
	private calculateQuoteConfidence(quote: string, context: string): number {
		let confidence = 0.7; // Base confidence

		// Length factors
		if (quote.length > 20 && quote.length < 150) confidence += 0.1;
		if (quote.length > 150) confidence -= 0.1;

		// Content factors
		if (quote.match(/[.!?]$/)) confidence += 0.05; // Ends with punctuation
		if (context.match(/said|stated|mentioned|according to|quoted/i)) confidence += 0.15;
		if (context.match(/example|instance|such as/i)) confidence -= 0.1;

		return Math.min(confidence, 1.0);
	}

	/**
	 * Calculate confidence score for code
	 */
	private calculateCodeConfidence(code: string, context: string, style: string): number {
		let confidence = 0.6; // Base confidence

		// Code-specific factors
		if (code.match(/function|def|class|var|let|const/)) confidence += 0.2;
		if (code.match(/[{}();]/)) confidence += 0.1;
		if (code.match(/\w+\.\w+/)) confidence += 0.05; // Method/property access

		// Context factors
		if (context.match(/code|function|method|algorithm|implementation/i)) confidence += 0.15;
		if (context.match(/example|snippet|listing/i)) confidence += 0.1;

		// Style-specific adjustments
		if (style === 'block') confidence += 0.1;
		if (style === 'definition') confidence += 0.15;

		return Math.min(confidence, 1.0);
	}

	/**
	 * Calculate confidence score for dates
	 */
	private calculateDateConfidence(date: string, context: string): number {
		let confidence = 0.8; // Base confidence

		// Format factors
		if (date.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) confidence += 0.1; // ISO format
		if (date.match(/^(Jan|Feb|Mar|...|Dec)/i)) confidence += 0.05; // Month name

		// Context factors
		if (context.match(/date|time|when|scheduled|deadline/i)) confidence += 0.1;
		if (context.match(/published|released|created|updated/i)) confidence += 0.05;

		return Math.min(confidence, 1.0);
	}

	/**
	 * Calculate confidence score for entities
	 */
	private calculateEntityConfidence(entity: string, subtype: string): number {
		const baseConfidence =
			{
				email: 0.95,
				url: 0.9,
				filepath: 0.85,
				version: 0.8,
			}[subtype] || 0.7;

		// Validation bonuses
		if (subtype === 'email' && entity.match(/^[^@]+@[^@]+\.[^@]+$/)) return 1.0;
		if (subtype === 'url' && entity.match(/^https?:\/\//)) return 0.95;
		if (subtype === 'version' && entity.match(/^\d+\.\d+(\.\d+)?$/)) return 0.9;

		return baseConfidence;
	}

	/**
	 * Calculate overall confidence for a set of facts
	 */
	private calculateOverallConfidence(facts: StructuredFact[]): number {
		if (facts.length === 0) return 0.0;
		const totalConfidence = facts.reduce((sum, fact) => sum + fact.confidence, 0);
		return totalConfidence / facts.length;
	}

	/**
	 * Infer unit from numeric match
	 */
	private inferUnit(match: string): string {
		if (match.match(/[$€£¥]/)) return 'currency';
		if (match.match(/%/)) return 'percentage';
		if (match.match(/kg|g|lb|oz/i)) return 'weight';
		if (match.match(/km|m|cm|mm|mi|ft|in/i)) return 'length';
		if (match.match(/b|kb|mb|gb|tb/i)) return 'data';
		if (match.match(/ms|s|min|h|day|week|month|year/i)) return 'time';
		return 'count';
	}

	/**
	 * Calculate precision of numeric value
	 */
	private calculatePrecision(value: string): number {
		const decimalMatch = value.match(/\.(\d+)/);
		return decimalMatch ? decimalMatch[1].length : 0;
	}

	/**
	 * Check if quote has attribution
	 */
	private hasAttribution(context: string): boolean {
		return context.match(/said|stated|mentioned|according to|quoted|by/i) !== null;
	}

	/**
	 * Detect programming language
	 */
	private detectLanguage(code: string): string {
		if (code.match(/\b(def|class|import|from|elif|try|except|finally)\b/)) return 'python';
		if (code.match(/\b(function|var|let|const|async|await|=>)\b/)) return 'javascript';
		if (code.match(/\b(public|private|static|class|interface|namespace)\b/)) return 'csharp';
		if (code.match(/#include|printf|int main/)) return 'c';
		if (code.match(/package|public class|System\.out/)) return 'java';
		return 'unknown';
	}

	/**
	 * Check if code appears executable
	 */
	private isExecutableCode(code: string): boolean {
		return code.match(/[{}();]/) !== null && code.length > 10;
	}

	/**
	 * Detect date format
	 */
	private detectDateFormat(date: string): string {
		if (date.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) return 'iso';
		if (date.match(/^(Jan|Feb|Mar|...|Dec)/i)) return 'natural';
		if (date.match(/\d{1,2}:\d{2}/)) return 'time';
		if (date.match(/\d+\s+(day|week|month|year)/i)) return 'relative';
		return 'unknown';
	}

	/**
	 * Check if date is relative
	 */
	private isRelativeDate(date: string): boolean {
		return date.match(/\b(ago|from now|next|last)\b/i) !== null;
	}

	/**
	 * Check if date is in the past
	 */
	private isPastDate(date: string): boolean {
		if (this.isRelativeDate(date)) {
			return date.match(/\bago\b/i) !== null;
		}
		// For absolute dates, this would require actual date parsing
		// Simplified implementation
		return false;
	}

	/**
	 * Validate entity format
	 */
	private validateEntity(entity: string, subtype: string): boolean {
		switch (subtype) {
			case 'email':
				return /^[^@]+@[^@]+\.[^@]+$/.test(entity);
			case 'url':
				return /^https?:\/\/.+/.test(entity);
			case 'version':
				return /^\d+\.\d+(\.\d+)?([-.][a-zA-Z0-9]+)?$/.test(entity);
			default:
				return true;
		}
	}
}

/**
 * Compression encoder for Band B virtual tokens
 */
export class CompressionEncoder {
	private projectionMatrix?: number[][];
	private readonly targetDimensions: number;

	constructor(targetDimensions: number = 128) {
		this.targetDimensions = targetDimensions;
	}

	/**
	 * Load projection weights from file
	 */
	async loadProjectionWeights(path: string): Promise<void> {
		try {
			// This would load the projection matrix from a file
			// For now, create a deterministic matrix for reproducibility
			const originalDimensions = 1536; // Common embedding dimension
			this.projectionMatrix = this.createDeterministicProjection(
				originalDimensions,
				this.targetDimensions,
			);
		} catch (error) {
			throw new Error(`Failed to load projection weights from ${path}: ${error}`);
		}
	}

	/**
	 * Encode embedding to compressed virtual tokens
	 */
	async encode(embedding: number[]): Promise<CompressionEncodingResult> {
		if (!this.projectionMatrix) {
			throw new Error('Projection weights not loaded');
		}

		const originalDimensions = embedding.length;
		const compressedEmbedding = this.projectEmbedding(embedding);
		const compressionRatio = compressedEmbedding.length / originalDimensions;

		return {
			compressedEmbedding: new Float32Array(compressedEmbedding),
			metadata: {
				originalDimensions,
				compressedDimensions: compressedEmbedding.length,
				compressionRatio,
				method: 'projection',
				quality: this.calculateCompressionQuality(embedding, compressedEmbedding),
			},
		};
	}

	/**
	 * Create deterministic projection matrix using cryptographic hashing
	 * This eliminates the security vulnerability of using Math.random()
	 */
	private createDeterministicProjection(inputDim: number, outputDim: number): number[][] {
		const matrix: number[][] = [];
		const scale = 1 / Math.sqrt(inputDim);
		const seed = 'REF-RAG-projection-matrix-2024-v1'; // Fixed seed for reproducibility

		for (let i = 0; i < outputDim; i++) {
			const row: number[] = [];
			for (let j = 0; j < inputDim; j++) {
				// Generate deterministic value using cryptographic hash
				const hashInput = `${seed}-${i}-${j}`;
				const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

				// Convert hash to float value between -1 and 1
				const hashValue = parseInt(hash.substring(0, 8), 16);
				const normalizedValue = (hashValue / 0xffffffff) * 2 - 1;

				// Apply Gaussian-like scaling
				row.push(normalizedValue * scale);
			}
			matrix.push(row);
		}

		return matrix;
	}

	/**
	 * Project embedding to lower dimension
	 */
	private projectEmbedding(embedding: number[]): number[] {
		if (!this.projectionMatrix) {
			throw new Error('Projection matrix not loaded');
		}

		const compressed: number[] = [];
		for (const row of this.projectionMatrix) {
			let sum = 0;
			for (let i = 0; i < embedding.length && i < row.length; i++) {
				sum += embedding[i] * row[i];
			}
			compressed.push(sum);
		}

		return compressed;
	}

	/**
	 * Calculate compression quality metrics
	 */
	private calculateCompressionQuality(original: number[], compressed: number[]): number {
		// Simple quality metric based on variance preservation
		const originalVariance = this.calculateVariance(original);
		const reconstructedVariance = this.calculateVariance(compressed);
		return Math.min(reconstructedVariance / originalVariance, 1.0);
	}

	/**
	 * Calculate variance of array
	 */
	private calculateVariance(arr: number[]): number {
		const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
		const variance = arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
		return variance;
	}
}

/**
 * Create fact extractor instance
 */
export function createFactExtractor(config?: Partial<FactExtractorConfig>): FactExtractor {
	return new FactExtractor(config);
}

/**
 * Create compression encoder instance
 */
export function createCompressionEncoder(targetDimensions?: number): CompressionEncoder {
	return new CompressionEncoder(targetDimensions);
}
