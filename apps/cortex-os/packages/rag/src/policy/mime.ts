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
  chunker: 'text' | 'markdown' | 'code' | 'structured' | 'pdf' | 'ocr' | 'unstructured' | null;
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
  metadata?: Record<string, any>;
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
  private config: Required<MimePolicyConfig>;
  private strategyCache = new Map<string, StrategyDecision>();

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
    if (this.strategyCache.has(cacheKey)) {
      return this.strategyCache.get(cacheKey)!;
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

    // Text files generally use native processing
    if (type === 'text') {
      return {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 0.8,
        processing: {
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };
    }

    // Images generally require OCR
    if (type === 'image') {
      return {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.6,
        processing: {
          chunker: 'ocr',
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: this.config.ocrMaxPages,
        },
      };
    }

    // Videos and audio are rejected
    if (type === 'video' || type === 'audio') {
      return {
        strategy: ProcessingStrategy.REJECT,
        confidence: 1.0,
        processing: null,
      };
    }

    return null;
  }

  private applyPdfHeuristics(
    decision: StrategyDecision,
    heuristics: FileHeuristics,
  ): StrategyDecision {
    const { hasText, fileSize, metadata } = heuristics;

    // If explicitly marked as having no text, likely scanned
    if (hasText === false) {
      return {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.6,
        reason: 'PDF appears to be scanned/image-based',
        processing: {
          chunker: 'ocr',
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: this.config.ocrMaxPages,
        },
      };
    }

    // If explicitly marked as having text
    if (hasText === true) {
      return {
        ...decision,
        confidence: 0.9,
        reason: 'PDF with confirmed extractable text',
      };
    }

    // Use file size and metadata heuristics
    if (this.maybeScanned(fileSize, metadata)) {
      return {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.5,
        reason: 'PDF possibly scanned based on size/metadata heuristics',
        processing: {
          chunker: 'ocr',
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: this.config.ocrMaxPages,
        },
      };
    }

    return decision;
  }

  /**
   * Heuristic to detect potentially scanned PDFs
   */
  private maybeScanned(fileSize?: number, metadata?: Record<string, any>): boolean {
    // Large files relative to content might be scanned
    if (fileSize && fileSize > 20 * 1024 * 1024) {
      // 20MB+
      return true;
    }

    // Check metadata for scanning indicators
    if (metadata) {
      const producer = (metadata.producer || '').toLowerCase();
      const creator = (metadata.creator || '').toLowerCase();

      const scanningKeywords = ['scan', 'scanner', 'adobe scan', 'camscanner', 'genius scan'];
      const allText = `${producer} ${creator}`.toLowerCase();

      return scanningKeywords.some((keyword) => allText.includes(keyword));
    }

    return false;
  }

  private applyPageLimits(decision: StrategyDecision): StrategyDecision {
    if (!decision.processing) return decision;

    const processing = { ...decision.processing };

    // Apply configuration-based page limits
    if (processing.requiresOCR && processing.maxPages) {
      processing.maxPages = Math.min(processing.maxPages, this.config.ocrMaxPages);
    }

    if (processing.requiresUnstructured && processing.maxPages) {
      processing.maxPages = Math.min(processing.maxPages, this.config.unstructuredMaxPages);
    }

    return { ...decision, processing };
  }

  private applyConfigurationRules(
    decision: StrategyDecision,
    mimeType: string,
    heuristics?: FileHeuristics,
  ): StrategyDecision {
    // File size limits
    if (heuristics?.fileSize && heuristics.fileSize > this.config.maxFileSize) {
      return this.createRejectionDecision(
        `File too large (${Math.round(heuristics.fileSize / 1024 / 1024)}MB > ${Math.round(this.config.maxFileSize / 1024 / 1024)}MB)`,
      );
    }

    // Security policy overrides
    if (decision.strategy === ProcessingStrategy.REJECT) {
      const [type] = mimeType.split('/');

      if (
        !this.config.allowExecutables &&
        (mimeType.includes('executable') || mimeType.includes('x-msdownload'))
      ) {
        return this.createRejectionDecision('Executable files not supported for security reasons');
      }

      if (
        !this.config.allowArchives &&
        (type === 'archive' || mimeType.includes('zip') || mimeType.includes('rar'))
      ) {
        return this.createRejectionDecision('Archive files not supported for security reasons');
      }
    }

    return decision;
  }

  private handleUnknownMimeType(mimeType: string): StrategyDecision {
    if (this.config.allowUnknownTypes) {
      // Conservative approach for unknown types
      return {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 0.3,
        reason: `Unknown MIME type '${mimeType}', attempting text processing`,
        processing: {
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };
    }

    return this.createRejectionDecision(`Unknown MIME type: ${mimeType}`);
  }

  private createRejectionDecision(reason: string): StrategyDecision {
    return {
      strategy: ProcessingStrategy.REJECT,
      confidence: 1.0,
      reason,
      processing: null,
    };
  }

  private getReasonForStrategy(strategy: ProcessingStrategy, mimeType: string): string {
    switch (strategy) {
      case ProcessingStrategy.NATIVE_TEXT:
        return 'Direct text processing';
      case ProcessingStrategy.PDF_NATIVE:
        return 'PDF with extractable text (assumed)';
      case ProcessingStrategy.OCR:
        return 'Image file requires OCR processing';
      case ProcessingStrategy.UNSTRUCTURED:
        return 'Complex document format best handled by Unstructured API';
      case ProcessingStrategy.REJECT:
        if (mimeType.includes('executable'))
          return 'Executable files not supported for security reasons';
        if (mimeType.includes('video')) return 'Video files not supported for text extraction';
        if (mimeType.includes('audio')) return 'Audio files not supported for text extraction';
        if (mimeType.includes('zip') || mimeType.includes('rar'))
          return 'Archive files not supported for security reasons';
        if (mimeType === 'application/octet-stream')
          return 'Binary data not supported for text extraction';
        return 'File type not supported';
      default:
        return 'Processing strategy determined';
    }
  }

  /**
   * Clear the strategy cache (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.strategyCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.strategyCache.size,
      keys: Array.from(this.strategyCache.keys()),
    };
  }
}
