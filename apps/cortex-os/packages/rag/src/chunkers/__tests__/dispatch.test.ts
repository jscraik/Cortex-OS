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
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      const expectedChunks = [{ id: '1', content: 'Test content', metadata: { page: 1 } }];

      mockTextChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result).toEqual({
        success: true,
        chunks: expectedChunks,
        strategy: ProcessingStrategy.NATIVE_TEXT,
        processingTimeMs: expect.any(Number),
        metadata: {
          chunker: 'text',
          totalChunks: 1,
          processingDetails: expect.any(Object),
        },
      });

      expect(mockTextChunker.chunk).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          chunker: 'text',
        }),
      );
    });

    it('should handle different text chunker types', async () => {
      const markdownStrategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Markdown processing',
        processing: {
          chunker: 'markdown',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      await dispatcher.dispatch(mockFile, markdownStrategy);

      expect(mockTextChunker.chunk).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          chunker: 'markdown',
        }),
      );
    });
  });

  describe('PDF Native Processing', () => {
    it('should dispatch to PDF chunker for PDF native strategy', async () => {
      const pdfFile = { ...mockFile, mimeType: 'application/pdf' };
      const strategy = {
        strategy: ProcessingStrategy.PDF_NATIVE,
        confidence: 0.9,
        reason: 'PDF with extractable text',
        processing: {
          chunker: 'pdf',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: 100,
        },
      };

      const expectedChunks = [
        { id: '1', content: 'PDF content page 1', metadata: { page: 1 } },
        { id: '2', content: 'PDF content page 2', metadata: { page: 2 } },
      ];

      mockPdfChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(pdfFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
      expect(mockPdfChunker.chunk).toHaveBeenCalledWith(pdfFile, strategy.processing);
    });

    it('should respect PDF page limits', async () => {
      const pdfFile = { ...mockFile, mimeType: 'application/pdf' };
      const strategy = {
        strategy: ProcessingStrategy.PDF_NATIVE,
        confidence: 0.9,
        reason: 'PDF with page limit',
        processing: {
          chunker: 'pdf',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: 10,
        },
      };

      await dispatcher.dispatch(pdfFile, strategy);

      expect(mockPdfChunker.chunk).toHaveBeenCalledWith(
        pdfFile,
        expect.objectContaining({ maxPages: 10 }),
      );
    });
  });

  describe('OCR Processing', () => {
    it('should dispatch to OCR chunker for OCR strategy', async () => {
      const imageFile = { ...mockFile, mimeType: 'image/png' };
      const strategy = {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.7,
        reason: 'Image file requires OCR',
        processing: {
          chunker: 'ocr',
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: 10,
        },
      };

      const expectedChunks = [
        {
          id: '1',
          content: 'OCR extracted text',
          metadata: { confidence: 0.9 },
        },
      ];

      mockOcrChunker.chunk.mockResolvedValue(expectedChunks);

      const result = await dispatcher.dispatch(imageFile, strategy);

      expect(result.success).toBe(true);
      expect(result.chunks).toEqual(expectedChunks);
      expect(result.strategy).toBe(ProcessingStrategy.OCR);
      expect(mockOcrChunker.chunk).toHaveBeenCalledWith(imageFile, strategy.processing);
    });

    it('should handle OCR with bounded page processing', async () => {
      const strategy = {
        strategy: ProcessingStrategy.OCR,
        confidence: 0.7,
        reason: 'Multi-page image with limits',
        processing: {
          chunker: 'ocr',
          requiresOCR: true,
          requiresUnstructured: false,
          maxPages: 5,
        },
      };

      await dispatcher.dispatch(mockFile, strategy);

      expect(mockOcrChunker.chunk).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({ maxPages: 5 }),
      );
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
          chunker: 'unstructured',
          requiresOCR: false,
          requiresUnstructured: true,
          maxPages: 50,
        },
      };

      const expectedChunks = [
        { id: '1', content: 'Document heading', metadata: { type: 'heading' } },
        {
          id: '2',
          content: 'Document paragraph',
          metadata: { type: 'paragraph' },
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
          chunker: 'unstructured',
          requiresOCR: false,
          requiresUnstructured: true,
          maxPages: 25,
        },
      };

      await dispatcher.dispatch(mockFile, strategy);

      expect(mockUnstructuredChunker.chunk).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining({
          requiresUnstructured: true,
          maxPages: 25,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle rejected strategy', async () => {
      const rejectedStrategy = {
        strategy: ProcessingStrategy.REJECT,
        confidence: 1.0,
        reason: 'Executable files not supported',
        processing: null,
      };

      const result = await dispatcher.dispatch(mockFile, rejectedStrategy);

      expect(result).toEqual({
        success: false,
        error: 'Processing rejected: Executable files not supported',
        strategy: ProcessingStrategy.REJECT,
        processingTimeMs: expect.any(Number),
        metadata: {
          rejectionReason: 'Executable files not supported',
        },
      });
    });

    it('should handle unknown MIME types gracefully', async () => {
      const unknownStrategy = {
        strategy: ProcessingStrategy.REJECT,
        confidence: 0.0,
        reason: 'Unknown MIME type: application/x-unknown',
        processing: null,
      };

      const result = await dispatcher.dispatch(mockFile, unknownStrategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown MIME type');
    });

    it('should handle chunker errors gracefully', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Text processing',
        processing: {
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      const error = new Error('Chunker processing failed');
      mockTextChunker.chunk.mockRejectedValue(error);

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result).toEqual({
        success: false,
        error: 'Processing failed: Chunker processing failed',
        strategy: ProcessingStrategy.NATIVE_TEXT,
        processingTimeMs: expect.any(Number),
        metadata: {
          errorDetails: error.message,
          attemptedChunker: 'text',
        },
      });
    });

    it('should handle chunker timeout', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Text processing',
        processing: {
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      // Simulate timeout
      mockTextChunker.chunk.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Processing timeout')), 100),
          ),
      );

      const dispatcher = new ProcessingDispatcher({ timeout: 50 });
      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Performance Tracking', () => {
    it('should track processing time', async () => {
      const strategy = {
        strategy: ProcessingStrategy.NATIVE_TEXT,
        confidence: 1.0,
        reason: 'Text processing',
        processing: {
          chunker: 'text',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: null,
        },
      };

      // Add artificial delay
      mockTextChunker.chunk.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10)),
      );

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeLessThan(1000); // Sanity check
    });

    it('should include detailed metadata', async () => {
      const strategy = {
        strategy: ProcessingStrategy.PDF_NATIVE,
        confidence: 0.9,
        reason: 'PDF processing',
        processing: {
          chunker: 'pdf',
          requiresOCR: false,
          requiresUnstructured: false,
          maxPages: 10,
        },
      };

      const chunks = [
        { id: '1', content: 'Page 1', metadata: { page: 1 } },
        { id: '2', content: 'Page 2', metadata: { page: 2 } },
      ];

      mockPdfChunker.chunk.mockResolvedValue(chunks);

      const result = await dispatcher.dispatch(mockFile, strategy);

      expect(result.metadata).toEqual({
        chunker: 'pdf',
        totalChunks: 2,
        processingDetails: expect.objectContaining({
          maxPages: 10,
          requiresOCR: false,
          requiresUnstructured: false,
        }),
      });
    });
  });

  describe('Configuration', () => {
    it('should respect dispatcher configuration', async () => {
      const config = {
        timeout: 5000,
        maxChunkSize: 2048,
        enableParallel: true,
      };

      const configuredDispatcher = new ProcessingDispatcher(config);

      expect(configuredDispatcher.config).toMatchObject(config);
    });

    it('should use default configuration values', async () => {
      const defaultDispatcher = new ProcessingDispatcher();

      expect(defaultDispatcher.config.timeout).toBe(30000); // 30 seconds default
      expect(defaultDispatcher.config.maxChunkSize).toBe(4096); // 4KB default
      expect(defaultDispatcher.config.enableParallel).toBe(false); // Conservative default
    });
  });
});
