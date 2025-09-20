/**
 * MIME-based processing strategy engine for document processing pipeline
 */

export enum ProcessingStrategy {
	NATIVE_TEXT = 'NATIVE_TEXT',
	PDF_NATIVE = 'PDF_NATIVE',
	OCR = 'OCR',
	UNSTRUCTURED = 'UNSTRUCTURED',
	REJECT = 'REJECT',
}

export interface ProcessingConfig {
	chunker:
	| 'text'
	| 'markdown'
	| 'code'
	| 'structured'
	| 'pdf'
	| 'ocr'
	| 'unstructured'
	| 'hierarchical'
	| 'late'
	| 'semantic'
	| null;
	requiresOCR: boolean;
	requiresUnstructured: boolean;
	maxPages: number | null;
}

export interface StrategyDecision {
	strategy: ProcessingStrategy;
	confidence: number;
	reason: string;
	processing: ProcessingConfig | null;
}

export interface FileHeuristics {
	fileSize?: number;
	hasText?: boolean;
	metadata?: Record<string, unknown>;
}

export interface MimePolicyConfig {
	ocrMaxPages?: number;
	unstructuredMaxPages?: number;
	allowExecutables?: boolean;
	allowArchives?: boolean;
	allowUnknownTypes?: boolean;
	maxFileSize?: number;
}

/**
 * Engine for determining processing strategy based on MIME type and file characteristics
 */
export class MimePolicyEngine {
	private readonly config: Required<MimePolicyConfig>;
	private readonly strategyCache = new Map<string, StrategyDecision>();

	// MIME type mappings to processing strategies
	private readonly mimeStrategies = new Map<string, Omit<StrategyDecision, 'reason'>>([
		// Native text processing
		[
			'text/plain',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 1.0,
				processing: {
					chunker: 'text',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'text/markdown',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 1.0,
				processing: {
					chunker: 'markdown',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'text/csv',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 0.9,
				processing: {
					chunker: 'structured',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'text/html',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 0.8,
				processing: {
					chunker: 'text',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'application/json',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 0.9,
				processing: {
					chunker: 'structured',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'application/xml',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 0.9,
				processing: {
					chunker: 'structured',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],

		// Code files
		[
			'application/javascript',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 1.0,
				processing: {
					chunker: 'code',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'text/x-python',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 1.0,
				processing: {
					chunker: 'code',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],
		[
			'text/x-java-source',
			{
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 1.0,
				processing: {
					chunker: 'code',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
			},
		],

		// PDF files (default to native extraction, may fallback to OCR)
		[
			'application/pdf',
			{
				strategy: ProcessingStrategy.PDF_NATIVE,
				confidence: 0.8,
				processing: {
					chunker: 'pdf',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: 100,
				},
			},
		],

		// Image files requiring OCR
		[
			'image/png',
			{
				strategy: ProcessingStrategy.OCR,
				confidence: 0.7,
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: 10,
				},
			},
		],
		[
			'image/jpeg',
			{
				strategy: ProcessingStrategy.OCR,
				confidence: 0.7,
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: 10,
				},
			},
		],
		[
			'image/tiff',
			{
				strategy: ProcessingStrategy.OCR,
				confidence: 0.7,
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: 10,
				},
			},
		],
		[
			'image/bmp',
			{
				strategy: ProcessingStrategy.OCR,
				confidence: 0.6,
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: 10,
				},
			},
		],

		// Office documents - best handled by Unstructured API
		[
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.9,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 50,
				},
			},
		],
		[
			'application/vnd.ms-word',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.9,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 50,
				},
			},
		],
		[
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.9,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 100,
				},
			},
		],
		[
			'application/vnd.ms-powerpoint',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.9,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 100,
				},
			},
		],
		[
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.8,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 20,
				},
			},
		],
		[
			'application/vnd.ms-excel',
			{
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.8,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: 20,
				},
			},
		],

		// Rejected file types for security/practicality
		[
			'application/x-executable',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'application/octet-stream',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 0.9,
				processing: null,
			},
		],
		[
			'application/zip',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'application/x-rar-compressed',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'video/mp4',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'video/avi',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'audio/mpeg',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
		[
			'audio/wav',
			{
				strategy: ProcessingStrategy.REJECT,
				confidence: 1.0,
				processing: null,
			},
		],
	]);

	constructor(config: MimePolicyConfig = {}) {
		this.config = {
			ocrMaxPages: 10,
			unstructuredMaxPages: 50,
			allowExecutables: false,
			allowArchives: false,
			allowUnknownTypes: false,
			maxFileSize: 100 * 1024 * 1024, // 100MB
			...config,
		};
	}

	/**
	 * Determine processing strategy for a given MIME type and file characteristics
	 */
	parseStrategy(mimeType: string, heuristics?: FileHeuristics): StrategyDecision {
		// Input validation
		if (!mimeType || typeof mimeType !== 'string') {
			return this.createRejectionDecision('Invalid MIME type format');
		}

		if (mimeType.length > 200) {
			return this.createRejectionDecision('Invalid MIME type format (too long)');
		}

		// Normalize MIME type (remove parameters)
		const normalizedMime = this.normalizeMimeType(mimeType);

		// Check cache first
		const cacheKey = `${normalizedMime}:${JSON.stringify(heuristics || {})}`;
		const cached = this.strategyCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		let decision = this.computeStrategy(normalizedMime, heuristics);

		// Apply configuration overrides
		decision = this.applyConfigurationRules(decision, normalizedMime, heuristics);

		// Cache the decision
		this.strategyCache.set(cacheKey, decision);

		return decision;
	}

	private computeStrategy(mimeType: string, heuristics?: FileHeuristics): StrategyDecision {
		// Check for exact MIME type match
		const exactMatch = this.mimeStrategies.get(mimeType);
		if (exactMatch) {
			let decision = {
				...exactMatch,
				reason: this.getReasonForStrategy(exactMatch.strategy, mimeType),
			};

			// Apply PDF-specific heuristics
			if (mimeType === 'application/pdf' && heuristics) {
				decision = this.applyPdfHeuristics(decision, heuristics);
			}

			// Apply page limits from configuration
			if (decision.processing) {
				decision = this.applyPageLimits(decision);
			}

			return decision;
		}

		// Check for pattern matches
		const patternMatch = this.findPatternMatch(mimeType);
		if (patternMatch) {
			return {
				...patternMatch,
				reason: this.getReasonForStrategy(patternMatch.strategy, mimeType),
			};
		}

		// Handle unknown MIME types
		return this.handleUnknownMimeType(mimeType);
	}

	private normalizeMimeType(mimeType: string): string {
		// Remove parameters (e.g., "text/plain; charset=utf-8" -> "text/plain")
		return mimeType.split(';')[0].trim().toLowerCase();
	}

	private findPatternMatch(mimeType: string): Omit<StrategyDecision, 'reason'> | null {
		const [type, subtype] = mimeType.split('/');
		if (!type || !subtype) return null;

		// Images fall back to OCR by default
		if (type === 'image') {
			return {
				strategy: ProcessingStrategy.OCR,
				confidence: 0.5,
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: this.config.ocrMaxPages,
				},
			};
		}

		// Office documents fall back to Unstructured
		if (type === 'application' && /vnd\./.test(subtype)) {
			return {
				strategy: ProcessingStrategy.UNSTRUCTURED,
				confidence: 0.7,
				processing: {
					chunker: 'unstructured',
					requiresOCR: false,
					requiresUnstructured: true,
					maxPages: this.config.unstructuredMaxPages,
				},
			};
		}

		return null;
	}

	private handleUnknownMimeType(mimeType: string): StrategyDecision {
		if (this.config.allowUnknownTypes) {
			return {
				strategy: ProcessingStrategy.NATIVE_TEXT,
				confidence: 0.2,
				processing: {
					chunker: 'text',
					requiresOCR: false,
					requiresUnstructured: false,
					maxPages: null,
				},
				reason: `Unknown MIME type ${mimeType}, defaulting to text processing`,
			};
		}

		return this.createRejectionDecision(`Unknown or unsupported MIME type: ${mimeType}`);
	}

	private applyConfigurationRules(
		decision: StrategyDecision,
		mimeType: string,
		heuristics?: FileHeuristics,
	): StrategyDecision {
		// Check file size limits
		if (heuristics?.fileSize && heuristics.fileSize > this.config.maxFileSize) {
			return this.createRejectionDecision(
				`File size exceeds the maximum allowed: ${heuristics.fileSize} > ${this.config.maxFileSize}`,
			);
		}

		// Security restrictions
		if (!this.config.allowExecutables && mimeType === 'application/x-executable') {
			return this.createRejectionDecision('Executable files are not allowed');
		}

		if (!this.config.allowArchives && /zip|rar/.test(mimeType)) {
			return this.createRejectionDecision('Archive files are not allowed');
		}

		return decision;
	}

	private applyPdfHeuristics(
		decision: StrategyDecision,
		heuristics: FileHeuristics,
	): StrategyDecision {
		// If we know there is no text, prefer OCR
		if (heuristics.hasText === false) {
			return {
				strategy: ProcessingStrategy.OCR,
				confidence: Math.min(1, decision.confidence + 0.2),
				reason: 'PDF has no text layer, using OCR',
				processing: {
					chunker: 'ocr',
					requiresOCR: true,
					requiresUnstructured: false,
					maxPages: decision.processing?.maxPages ?? this.config.ocrMaxPages,
				},
			};
		}

		return decision;
	}

	private applyPageLimits(decision: StrategyDecision): StrategyDecision {
		if (!decision.processing) return decision;
		const proc = { ...decision.processing };
		if (proc.chunker === 'ocr' && (proc.maxPages ?? 0) > this.config.ocrMaxPages) {
			proc.maxPages = this.config.ocrMaxPages;
		}
		if (
			proc.chunker === 'unstructured' &&
			(proc.maxPages ?? 0) > this.config.unstructuredMaxPages
		) {
			proc.maxPages = this.config.unstructuredMaxPages;
		}
		return { ...decision, processing: proc };
	}

	private getReasonForStrategy(strategy: ProcessingStrategy, mimeType: string): string {
		switch (strategy) {
			case ProcessingStrategy.NATIVE_TEXT:
				return `Text-friendly format: ${mimeType}`;
			case ProcessingStrategy.PDF_NATIVE:
				return 'PDF with native text extraction';
			case ProcessingStrategy.OCR:
				return `Image-based or non-text content: ${mimeType}`;
			case ProcessingStrategy.UNSTRUCTURED:
				return `Document format best handled by Unstructured API: ${mimeType}`;
			default:
				return `Rejected for security or compatibility reasons: ${mimeType}`;
		}
	}

	private createRejectionDecision(reason: string): StrategyDecision {
		return {
			strategy: ProcessingStrategy.REJECT,
			confidence: 1.0,
			reason,
			processing: null,
		};
	}
}
