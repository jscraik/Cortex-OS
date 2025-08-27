// eslint-disable-next-line import/no-unresolved
/* eslint-disable import/no-unresolved */
import { ProcessingConfig, ProcessingStrategy, StrategyDecision } from '../policy/mime';

/**
 * File representation for processing
 */
export interface ProcessingFile {
  path: string;
  content: Buffer;
  mimeType: string;
  size: number;
}

/**
 * Document chunk with metadata
 */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

/**
 * Result of document processing
 */
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

/**
 * Configuration for the processing dispatcher
 */
export interface DispatcherConfig {
  timeout?: number;
  maxChunkSize?: number;
  enableParallel?: boolean;
}

/**
 * Interface for chunker implementations
 */
export interface Chunker {
  chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]>;
}

// Mock chunker implementations (would be imported from separate files in real implementation)
class TextChunker implements Chunker {
  chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    const content = file.content.toString('utf-8');

    // Simple text chunking based on chunker type
    switch (config.chunker) {
      case 'markdown':
        return Promise.resolve(this.chunkMarkdown(content, file));
      case 'code':
        return Promise.resolve(this.chunkCode(content, file));
      case 'structured':
        return Promise.resolve(this.chunkStructured(content, file));
      default:
        return Promise.resolve(this.chunkPlainText(content, file));
    }
  }

  private chunkPlainText(content: string, file: ProcessingFile): DocumentChunk[] {
    const chunkSize = 1024;
    const chunks: DocumentChunk[] = [];

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      chunks.push({
        id: `${file.path}-text-${chunks.length + 1}`,
        content: chunk,
        metadata: {
          type: 'text',
          position: i,
          length: chunk.length,
        },
      });
    }

    return chunks;
  }

  private chunkMarkdown(content: string, file: ProcessingFile): DocumentChunk[] {
    // Split by headers and sections
    const sections = content.split(/^#{1,6}\s/m);
    const chunks: DocumentChunk[] = [];

    sections.forEach((section, index) => {
      if (section.trim()) {
        chunks.push({
          id: `${file.path}-md-${index + 1}`,
          content: section.trim(),
          metadata: {
            type: 'markdown_section',
            section: index,
          },
        });
      }
    });

    return chunks;
  }

  private chunkCode(content: string, file: ProcessingFile): DocumentChunk[] {
    // Split by functions/classes (simplified)
    const lines = content.split('\n');
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let chunkStart = 0;

    lines.forEach((line, index) => {
      currentChunk += line + '\n';

      // Simple heuristic: new function/class starts a new chunk
      const fnOrClassRegex = /^(function|class|def|public|private)\s/;
      if (fnOrClassRegex.exec(line) && currentChunk.length > 100) {
        chunks.push({
          id: `${file.path}-code-${chunks.length + 1}`,
          content: currentChunk.trim(),
          metadata: {
            type: 'code_block',
            startLine: chunkStart,
            endLine: index,
          },
        });
        currentChunk = line + '\n';
        chunkStart = index;
      }
    });

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${file.path}-code-${chunks.length + 1}`,
        content: currentChunk.trim(),
        metadata: {
          type: 'code_block',
          startLine: chunkStart,
          endLine: lines.length - 1,
        },
      });
    }

    return chunks;
  }

  private chunkStructured(content: string, file: ProcessingFile): DocumentChunk[] {
    // Handle CSV, JSON, XML etc.
    if (file.mimeType === 'application/json') {
      try {
        const data: unknown = JSON.parse(content);
        return [
          {
            id: `${file.path}-json-1`,
            content: JSON.stringify(data, null, 2),
            metadata: {
              type: 'json_document',
              structure: 'parsed',
            },
          },
        ];
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[dispatcher] JSON parse failed for application/json', err);
        return this.chunkPlainText(content, file);
      }
    }

    if (file.mimeType === 'text/csv') {
      const lines = content.split('\n');
      const header = lines[0];
      const chunks: DocumentChunk[] = [];

      // Chunk by rows
      const chunkSize = 100;
      for (let i = 1; i < lines.length; i += chunkSize) {
        const chunkLines = [header, ...lines.slice(i, i + chunkSize)];
        chunks.push({
          id: `${file.path}-csv-${chunks.length + 1}`,
          content: chunkLines.join('\n'),
          metadata: {
            type: 'csv_chunk',
            rowStart: i,
            rowEnd: Math.min(i + chunkSize - 1, lines.length - 1),
          },
        });
      }

      return chunks;
    }

    return this.chunkPlainText(content, file);
  }
}

class PdfChunker implements Chunker {
  chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    // Simulate PDF text extraction and chunking
    // In real implementation, would use pdf-parse or similar

    const simulatedPages = Math.min(5, config.maxPages || 100);
    const chunks: DocumentChunk[] = [];

    for (let page = 1; page <= simulatedPages; page++) {
      chunks.push({
        id: `${file.path}-pdf-page-${page}`,
        content: `Content from PDF page ${page}`,
        metadata: {
          type: 'pdf_page',
          page,
          extractionMethod: 'native',
        },
      });
    }

    return Promise.resolve(chunks);
  }
}

class OcrChunker implements Chunker {
  async chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    // Simulate OCR processing
    // In real implementation, would use Tesseract.js or cloud OCR

    const maxPages = Math.min(config.maxPages || 10, 10);
    const chunks: DocumentChunk[] = [];

    // Simulate processing time based on file size
    const processingDelay = Math.min(file.size / 1024, 1000);
    await new Promise((resolve) => setTimeout(resolve, processingDelay));

    for (let page = 1; page <= maxPages; page++) {
      chunks.push({
        id: `${file.path}-ocr-page-${page}`,
        content: `OCR extracted text from page ${page}`,
        metadata: {
          type: 'ocr_page',
          page,
          confidence: 0.85 + Math.random() * 0.1, // Simulate confidence
          ocrEngine: 'tesseract',
        },
      });
    }

    return chunks;
  }
}

class UnstructuredChunker implements Chunker {
  chunk(file: ProcessingFile, config: ProcessingConfig): Promise<DocumentChunk[]> {
    // Simulate Unstructured API processing
    // In real implementation, would make API calls to Unstructured

    const maxPages = Math.min(config.maxPages || 50, 50);
    const chunks: DocumentChunk[] = [];

    // Simulate different document elements
    const elementTypes = ['heading', 'paragraph', 'list', 'table'];
    const elementsPerPage = 3;

    for (let page = 1; page <= maxPages; page++) {
      for (let element = 1; element <= elementsPerPage; element++) {
        const elementType = elementTypes[Math.floor(Math.random() * elementTypes.length)];

        chunks.push({
          id: `${file.path}-unstructured-${page}-${element}`,
          content: `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} content from page ${page}, element ${element}`,
          metadata: {
            type: elementType,
            page,
            element,
            apiProvider: 'unstructured',
          },
        });
      }
    }

    return Promise.resolve(chunks);
  }
}

/**
 * Dispatches processing requests to appropriate chunkers based on strategy
 */
export class ProcessingDispatcher {
  private readonly textChunker = new TextChunker();
  private readonly pdfChunker = new PdfChunker();
  private readonly ocrChunker = new OcrChunker();
  private readonly unstructuredChunker = new UnstructuredChunker();

  public readonly config: Required<DispatcherConfig>;

  constructor(config: DispatcherConfig = {}) {
    this.config = {
      timeout: 30000, // 30 seconds
      maxChunkSize: 4096, // 4KB
      enableParallel: false, // Conservative default
      ...config,
    };
  }

  /**
   * Dispatch file processing based on strategy decision
   */
  async dispatch(file: ProcessingFile, strategy: StrategyDecision): Promise<DispatchResult> {
    const startTime = performance.now();

    try {
      // Handle rejection strategy
      if (strategy.strategy === ProcessingStrategy.REJECT) {
        return {
          success: false,
          error: `Processing rejected: ${strategy.reason}`,
          strategy: strategy.strategy,
          processingTimeMs: performance.now() - startTime,
          metadata: {
            rejectionReason: strategy.reason,
          },
        };
      }

      // Validate processing configuration
      if (!strategy.processing) {
        return {
          success: false,
          error: 'Invalid strategy: missing processing configuration',
          strategy: strategy.strategy,
          processingTimeMs: performance.now() - startTime,
          metadata: {
            errorDetails: 'No processing configuration provided',
          },
        };
      }

      // Route to appropriate chunker
      const chunks = await this.processWithTimeout(file, strategy);

      return {
        success: true,
        chunks,
        strategy: strategy.strategy,
        processingTimeMs: performance.now() - startTime,
        metadata: {
          chunker: strategy.processing.chunker || 'unknown',
          totalChunks: chunks.length,
          processingDetails: strategy.processing,
        },
      };
    } catch (_error) {
      return {
        success: false,
        error: `Processing failed: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
        strategy: strategy.strategy,
        processingTimeMs: performance.now() - startTime,
        metadata: {
          errorDetails: _error instanceof Error ? _error.message : 'Unknown error',
          attemptedChunker: strategy.processing?.chunker || 'unknown',
        },
      };
    }
  }

  private async processWithTimeout(
    file: ProcessingFile,
    strategy: StrategyDecision,
  ): Promise<DocumentChunk[]> {
    const processing = strategy.processing;
    if (!processing) {
      throw new Error('Missing processing configuration');
    }
    const processingPromise = this.routeToChunker(file, strategy.strategy, processing);

    // Apply timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Processing timeout')), this.config.timeout);
    });

    return Promise.race([processingPromise, timeoutPromise]);
  }

  private async routeToChunker(
    file: ProcessingFile,
    strategy: ProcessingStrategy,
    config: ProcessingConfig,
  ): Promise<DocumentChunk[]> {
    switch (strategy) {
      case ProcessingStrategy.NATIVE_TEXT:
        return this.textChunker.chunk(file, config);

      case ProcessingStrategy.PDF_NATIVE:
        return this.pdfChunker.chunk(file, config);

      case ProcessingStrategy.OCR:
        return this.ocrChunker.chunk(file, config);

      case ProcessingStrategy.UNSTRUCTURED:
        return this.unstructuredChunker.chunk(file, config);

      default:
        throw new Error(`Unknown processing strategy: ${strategy}`);
    }
  }

  /**
   * Get dispatcher configuration
   */
  getConfig(): Required<DispatcherConfig> {
    return { ...this.config };
  }

  /**
   * Health check for chunker availability
   */
  healthCheck(): Promise<Record<string, boolean>> {
    return Promise.resolve({
      textChunker: true, // Always available
      pdfChunker: true, // Assume pdf-parse is available
      ocrChunker: true, // Assume Tesseract.js is available
      unstructuredChunker: true, // Assume API access
    });
  }
}
