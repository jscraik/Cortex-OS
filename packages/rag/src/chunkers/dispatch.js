import { ProcessingStrategy } from '../policy/mime';

class TextChunker {
  chunk(file, config) {
    const content = file.content.toString('utf-8');
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
  chunkPlainText(content, file) {
    const chunkSize = 1024;
    const chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      chunks.push({
        id: `${file.path}-text-${chunks.length + 1}`,
        content: chunk,
        metadata: { type: 'text', position: i, length: chunk.length },
      });
    }
    return chunks;
  }
  chunkMarkdown(content, file) {
    const sections = content.split(/^#{1,6}\s/m);
    const chunks = [];
    sections.forEach((section, index) => {
      if (section.trim()) {
        chunks.push({
          id: `${file.path}-md-${index + 1}`,
          content: section.trim(),
          metadata: { type: 'markdown_section', section: index },
        });
      }
    });
    return chunks;
  }
  chunkCode(content, file) {
    const lines = content.split('\n');
    const chunks = [];
    let currentChunk = '';
    let chunkStart = 0;
    lines.forEach((line, index) => {
      currentChunk += line + '\n';
      const fnOrClassRegex = /^(function|class|def|public|private)\s/;
      if (fnOrClassRegex.exec(line) && currentChunk.length > 100) {
        chunks.push({
          id: `${file.path}-code-${chunks.length + 1}`,
          content: currentChunk.trim(),
          metadata: { type: 'code_block', startLine: chunkStart, endLine: index },
        });
        currentChunk = line + '\n';
        chunkStart = index;
      }
    });
    if (currentChunk.trim()) {
      chunks.push({
        id: `${file.path}-code-${chunks.length + 1}`,
        content: currentChunk.trim(),
        metadata: { type: 'code_block', startLine: chunkStart, endLine: lines.length - 1 },
      });
    }
    return chunks;
  }
  chunkStructured(content, file) {
    if (file.mimeType === 'application/json') {
      try {
        const data = JSON.parse(content);
        return [
          {
            id: `${file.path}-json-1`,
            content: JSON.stringify(data, null, 2),
            metadata: { type: 'json_document', structure: 'parsed' },
          },
        ];
      } catch (err) {
        return this.chunkPlainText(content, file);
      }
    }
    if (file.mimeType === 'text/csv') {
      const lines = content.split('\n');
      const header = lines[0];
      const chunks = [];
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
class PdfChunker {
  chunk(file, config) {
    const simulatedPages = Math.min(5, config.maxPages || 100);
    const chunks = [];
    for (let page = 1; page <= simulatedPages; page++) {
      chunks.push({
        id: `${file.path}-pdf-page-${page}`,
        content: `Content from PDF page ${page}`,
        metadata: { type: 'pdf_page', page, extractionMethod: 'native' },
      });
    }
    return Promise.resolve(chunks);
  }
}
class OcrChunker {
  async chunk(file, config) {
    const maxPages = Math.min(config.maxPages || 10, 10);
    const chunks = [];
    const processingDelay = Math.min(file.size / 1024, 1000);
    await new Promise((resolve) => setTimeout(resolve, processingDelay));
    for (let page = 1; page <= maxPages; page++) {
      chunks.push({
        id: `${file.path}-ocr-page-${page}`,
        content: `OCR extracted text from page ${page}`,
        metadata: { type: 'ocr_page', page, confidence: 0.9, ocrEngine: 'tesseract' },
      });
    }
    return chunks;
  }
}
class UnstructuredChunker {
  chunk(file, config) {
    const maxPages = Math.min(config.maxPages || 50, 50);
    const chunks = [];
    const elementTypes = ['heading', 'paragraph', 'list', 'table'];
    const elementsPerPage = 3;
    for (let page = 1; page <= maxPages; page++) {
      for (let element = 1; element <= elementsPerPage; element++) {
        const idx = (page - 1) * elementsPerPage + (element - 1);
        const elementType = elementTypes[idx % elementTypes.length];
        chunks.push({
          id: `${file.path}-unstructured-${page}-${element}`,
          content: `${elementType.toUpperCase()} content from page ${page}, element ${element}`,
          metadata: { type: elementType, page, element, apiProvider: 'unstructured' },
        });
      }
    }
    return Promise.resolve(chunks);
  }
}
export class ProcessingDispatcher {
  textChunker = new TextChunker();
  pdfChunker = new PdfChunker();
  ocrChunker = new OcrChunker();
  unstructuredChunker = new UnstructuredChunker();
  config;
  constructor(config = {}) {
    this.config = {
      timeout: 30000,
      maxChunkSize: 4096,
      enableParallel: false,
      ...config,
    };
  }
  async dispatch(file, strategy) {
    const startTime = performance.now();
    try {
      if (strategy.strategy === ProcessingStrategy.REJECT) {
        return {
          success: false,
          error: `Processing rejected: ${strategy.reason}`,
          strategy: strategy.strategy,
          processingTimeMs: performance.now() - startTime,
          metadata: { rejectionReason: strategy.reason },
        };
      }
      if (!strategy.processing) {
        return {
          success: false,
          error: 'Invalid strategy: missing processing configuration',
          strategy: strategy.strategy,
          processingTimeMs: performance.now() - startTime,
          metadata: { errorDetails: 'No processing configuration provided' },
        };
      }
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
  async processWithTimeout(file, strategy) {
    const processing = strategy.processing;
    if (!processing) {
      throw new Error('Missing processing configuration');
    }
    const processingPromise = this.routeToChunker(file, strategy.strategy, processing);
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error('Processing timeout')),
        this.config.timeout,
      );
    });
    return Promise.race([processingPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    });
  }
  async routeToChunker(file, strategy, config) {
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
  getConfig() {
    return { ...this.config };
  }
  healthCheck() {
    return Promise.resolve({
      textChunker: true,
      pdfChunker: true,
      ocrChunker: true,
      unstructuredChunker: true,
    });
  }
}
//# sourceMappingURL=dispatch.js.map
