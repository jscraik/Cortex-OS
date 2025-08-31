import { type ProcessingConfig, ProcessingStrategy, type StrategyDecision } from '../policy/mime';
export interface ProcessingFile {
    path: string;
    content: Buffer;
    mimeType: string;
    size: number;
}
export interface DocumentChunk {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
}
export interface DispatchResult {
    success: boolean;
    chunks?: DocumentChunk[];
    error?: string;
    strategy: ProcessingStrategy;
    processingTimeMs: number;
    metadata: {
        chunker?: string;
        totalChunks?: number;
        processingDetails?: unknown;
        errorDetails?: string;
        attemptedChunker?: string;
        rejectionReason?: string;
    };
}
export interface DispatcherConfig {
    timeout?: number;
    maxChunkSize?: number;
    enableParallel?: boolean;
}
export interface Chunker {
    chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]>;
}
export declare class ProcessingDispatcher {
    private readonly textChunker;
    private readonly pdfChunker;
    private readonly ocrChunker;
    private readonly unstructuredChunker;
    readonly config: Required<DispatcherConfig>;
    constructor(config?: DispatcherConfig);
    dispatch(file: ProcessingFile, strategy: StrategyDecision): Promise<DispatchResult>;
    private processWithTimeout;
    private routeToChunker;
    getConfig(): Required<DispatcherConfig>;
    healthCheck(): Promise<Record<string, boolean>>;
}
//# sourceMappingURL=dispatch.d.ts.map