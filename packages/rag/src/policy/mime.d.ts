/**
 * MIME-based processing strategy engine for document processing pipeline
 */
export declare enum ProcessingStrategy {
    NATIVE_TEXT = "NATIVE_TEXT",
    PDF_NATIVE = "PDF_NATIVE",
    OCR = "OCR",
    UNSTRUCTURED = "UNSTRUCTURED",
    REJECT = "REJECT"
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
export declare class MimePolicyEngine {
    private readonly config;
    private readonly strategyCache;
    private readonly mimeStrategies;
    constructor(config?: MimePolicyConfig);
    /**
     * Determine processing strategy for a given MIME type and file characteristics
     */
    parseStrategy(mimeType: string, heuristics?: FileHeuristics): StrategyDecision;
    private computeStrategy;
    private normalizeMimeType;
    private findPatternMatch;
    private handleUnknownMimeType;
    private applyConfigurationRules;
    private applyPdfHeuristics;
    private applyPageLimits;
    private getReasonForStrategy;
    private createRejectionDecision;
}
//# sourceMappingURL=mime.d.ts.map