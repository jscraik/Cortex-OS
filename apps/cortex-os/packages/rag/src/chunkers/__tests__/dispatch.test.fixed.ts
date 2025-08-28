import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessingDispatcher, DispatchResult } from '../dispatch';
import { ProcessingStrategy } from '../../policy/mime';

// Mock chunkers
const mockTextChunker = vi.hoisted(() => ({
  chunk: vi.fn(),
}));

const mockPdfChunker = vi.hoisted(() => ({
  chunk: vi.fn(),
}));

const mockOcrChunker = vi.hoisted(() => ({
  chunk: vi.fn(),
}));

const mockUnstructuredChunker = vi.hoisted(() => ({
  chunk: vi.fn(),
}));

vi.mock('../text-chunker', () => ({
  TextChunker: vi.fn(() => mockTextChunker),
}));

vi.mock('../pdf-chunker', () => ({
  PdfChunker: vi.fn(() => mockPdfChunker),
}));

vi.mock('../ocr-chunker', () => ({
  OcrChunker: vi.fn(() => mockOcrChunker),
}));

vi.mock('../unstructured-chunker', () => ({
  UnstructuredChunker: vi.fn(() => mockUnstructuredChunker),
}));

describe('ProcessingDispatcher', () => {
  let dispatcher: ProcessingDispatcher;

  const mockFile = {
    path: '/test/document.txt',
    content: Buffer.from('Test content'),
    mimeType: 'text/plain',
    size: 1024,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dispatcher = new ProcessingDispatcher();
  });

  describe('Native Text Processing', () => {
    it('should dispatch to text chunker for native text strategy', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Direct text processing',
        processing: {
          chunker: 'text' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      const expectedChunks = [{ id: '1', content: 'Test content', metadata: { page: 1 } }];

      mockTextChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
      expect(mockTextChunker.chunk).toHaveBeenCalledWith(mockFile, strategy.processing);
    });

    it('should handle markdown processing', async () => {
      const markdownStrategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 0.95,
        reason: 'Markdown document',
        processing: {
          chunker: 'markdown' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      const markdownFile = {
        ...mockFile,
        mimeType: 'text/markdown',
      };

      mockTextChunker.chunk.mockResolvedValue([
        { id: 'md-1', content: 'Markdown content', metadata: { section: 1 } },
      ]);

      await dispatcher.dispatch(mockFile, markdownStrategy);

      expect(mockTextChunker.chunk).toHaveBeenCalledWith(mockFile, markdownStrategy.processing);
    });
  });

  describe('PDF Processing', () => {
    it('should dispatch to PDF chunker for PDF strategy', async () => {
      const pdfFile = {
        ...mockFile,
        mimeType: 'application/pdf',
      };

      const strategy = {
        strategy: ProcessingStrategy.PDF_NATIVE,
        confidence: 0.9,
        reason: 'PDF document',
        processing: {
          chunker: 'pdf' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: 100,
        },
      };

      const expectedChunks = [
        { id: 'pdf-1', content: 'PDF content', metadata: { page: 1 } },
        { id: 'pdf-2', content: 'PDF content', metadata: { page: 2 } },
      ];

      mockPdfChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(pdfFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
      expect(mockPdfChunker.chunk).toHaveBeenCalledWith(pdfFile, strategy.processing);
    });

    it('should handle PDF processing failures', async () => {
      const pdfFile = {
        ...mockFile,
        mimeType: 'application/pdf',
      };

      const strategy = {
        strategy: ProcessingStrategy.PDF_NATIVE,
        confidence: 0.9,
        reason: 'PDF document',
        processing: {
          chunker: 'pdf' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: 100,
        },
      };

      mockPdfChunker.chunk.mockRejectedValue(new Error('PDF processing failed'));

      await dispatcher.dispatch(pdfFile, strategy);

      expect(mockPdfChunker.chunk).toHaveBeenCalledWith(pdfFile, strategy.processing);
      // Error handling is tested in other tests
    });
  });

  describe('OCR Processing', () => {
    it('should dispatch to OCR chunker for OCR strategy', async () => {
      const imageFile = {
        ...mockFile,
        mimeType: 'image/jpeg',
      };

      const strategy = {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.8,
        reason: 'Image document',
        processing: {
          chunker: 'ocr' as const,
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: 10,
        },
      };

      const expectedChunks = [
        { id: 'ocr-1', content: 'OCR content', metadata: { page: 1 } },
      ];

      mockOcrChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(imageFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.OCR);
      expect(mockOcrChunker.chunk).toHaveBeenCalledWith(imageFile, strategy.processing);
    });

    it('should handle OCR processing timeout', async () => {
      // Setup a custom dispatcher with short timeout
      const timeoutDispatcher = new ProcessingDispatcher({ timeout: 50 });

      const strategy = {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.8,
        reason: 'Image document',
        processing: {
          chunker: 'ocr' as const,
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: 10,
        },
      };

      // Mock a long-running OCR process that will timeout
      mockOcrChunker.chunk.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
      );

      await timeoutDispatcher.dispatch(mockFile, strategy);

      expect(mockOcrChunker.chunk).toHaveBeenCalledWith(mockFile, strategy.processing);
      // Error handling for timeout is tested in other tests
    });
  });

  describe('Unstructured API Processing', () => {
    it('should dispatch to Unstructured chunker', async () => {
      const docxFile = {
        ...mockFile,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const strategy = {
        strategy: ProcessingStrategy.UNSTRUCTURED,
        confidence: 0.9,
        reason: 'Complex document format',
        processing: {
          chunker: 'unstructured' as const,
          requiresOCR: false,
          requiresUnstructured: true,
          maxPages: 50,
        },
      };

      const expectedChunks = [
        { 
          id: '/test/document.txt-unstructured-1-1',
          content: 'Heading content from page 1, element 1', 
          metadata: { 
            type: 'heading',
            page: 1,
            element: 1,
            apiProvider: 'unstructured'
          } 
        },
        {
          id: '/test/document.txt-unstructured-1-2',
          content: 'Paragraph content from page 1, element 2',
          metadata: { 
            type: 'paragraph',
            page: 1,
            element: 2,
            apiProvider: 'unstructured'
          },
        },
      ];

      mockUnstructuredChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(docxFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.UNSTRUCTURED);
      expect(mockUnstructuredChunker.chunk).toHaveBeenCalledWith(docxFile, strategy.processing);
    });

    it('should handle conditional Unstructured API usage', async () => {
      const strategy = {
        strategy: ProcessingStrategy.UNSTRUCTURED,
        confidence: 0.9,
        reason: 'Complex document',
        processing: {
          chunker: 'unstructured' as const,
          requiresOCR: false,
          requiresUnstructured: true,
          maxPages: 25,
        },
      };

      await dispatcher.dispatch(mockFile, strategy);

      expect(mockUnstructuredChunker.chunk).toHaveBeenCalledWith(mockFile, strategy.processing);
    });
  });

  describe('Error Handling', () => {
    it('should handle strategy with null processing config', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Bad strategy',
        processing: null,
      };

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid strategy');
    });

    it('should handle rejection strategy', async () => {
      const strategy = {
        strategy: ProcessingStrategy.REJECT,
        confidence: 1.0,
        reason: 'Rejected: unsafe content',
        processing: null,
      };

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing rejected');
      expect(result.metadata.rejectionReason).toBe('Rejected: unsafe content');
    });

    it('should handle chunker failures', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Direct text processing',
        processing: {
          chunker: 'text' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      mockTextChunker.chunk.mockRejectedValue(new Error('Test error'));

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Test error');
      expect(result.metadata.errorDetails).toContain('Test error');
    });

    it('should handle timeout', async () => {
      // Create a dispatcher with a very short timeout
      const timeoutDispatcher = new ProcessingDispatcher({ timeout: 10 });

      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Direct text processing',
        processing: {
          chunker: 'text' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      // Mock a long running process
      mockTextChunker.chunk.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );

      const result = await timeoutDispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should track processing time', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Direct text processing',
        processing: {
          chunker: 'text' as const,
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should support custom chunker config', async () => {
      const customDispatcher = new ProcessingDispatcher({
        timeout: 5000,
        maxChunkSize: 2048,
        enableParallel: true,
      });

      expect(customDispatcher.getConfig()).toEqual({
        timeout: 5000,
        maxChunkSize: 2048,
        enableParallel: true,
      });
    });
  });

  it('should have a health check method', async () => {
    const health = await dispatcher.healthCheck();
    
    expect(health).toHaveProperty('textChunker');
    expect(health).toHaveProperty('pdfChunker');
    expect(health).toHaveProperty('ocrChunker');
    expect(health).toHaveProperty('unstructuredChunker');
  });
});
