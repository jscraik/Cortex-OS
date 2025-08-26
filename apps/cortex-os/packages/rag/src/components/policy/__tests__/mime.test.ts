import { describe, it, expect, beforeEach } from 'vitest';
import { MimePolicyEngine, ProcessingStrategy } from '../mime';

describe('MimePolicyEngine', () => {
  let engine: MimePolicyEngine;

  beforeEach(() => {
    engine = new MimePolicyEngine();
  });

  describe('parseStrategy', () => {
    describe('Native Text Processing', () => {
      it('should return native strategy for plain text', () => {
        const result = engine.parseStrategy('text/plain');

        expect(result).toEqual({
          strategy: ProcessingStrategy.NATIVE_TEXT,
          confidence: 1.0,
          reason: 'Direct text processing',
          processing: {
            chunker: 'text',
            requiresOCR: false,
            requiresUnstructured: false,
            maxPages: null,
          },
        });
      });

      it('should return native strategy for markdown', () => {
        const result = engine.parseStrategy('text/markdown');

        expect(result.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
        expect(result.processing.chunker).toBe('markdown');
      });

      it('should return native strategy for code files', () => {
        const result = engine.parseStrategy('application/javascript');

        expect(result.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
        expect(result.processing.chunker).toBe('code');
      });

      it('should handle CSV files as structured text', () => {
        const result = engine.parseStrategy('text/csv');

        expect(result.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
        expect(result.processing.chunker).toBe('structured');
      });
    });

    describe('PDF Native Processing', () => {
      it('should return PDF native strategy for standard PDFs', () => {
        const result = engine.parseStrategy('application/pdf');

        expect(result).toEqual({
          strategy: ProcessingStrategy.PDF_NATIVE,
          confidence: 0.8,
          reason: 'PDF with extractable text (assumed)',
          processing: {
            chunker: 'pdf',
            requiresOCR: false,
            requiresUnstructured: false,
            maxPages: 100,
          },
        });
      });

      it('should handle PDF with text extraction hint', () => {
        const result = engine.parseStrategy('application/pdf', {
          hasText: true,
        });

        expect(result.confidence).toBe(0.9);
        expect(result.reason).toBe('PDF with confirmed extractable text');
      });

      it('should lower confidence for potentially scanned PDFs', () => {
        const result = engine.parseStrategy('application/pdf', {
          hasText: false,
        });

        expect(result.strategy).toBe(ProcessingStrategy.OCR);
        expect(result.confidence).toBe(0.6);
        expect(result.reason).toBe('PDF appears to be scanned/image-based');
      });
    });

    describe('OCR Processing', () => {
      it('should return OCR strategy for image files', () => {
        const result = engine.parseStrategy('image/png');

        expect(result).toEqual({
          strategy: ProcessingStrategy.OCR,
          confidence: 0.7,
          reason: 'Image file requires OCR processing',
          processing: {
            chunker: 'ocr',
            requiresOCR: true,
            requiresUnstructured: false,
            maxPages: 10,
          },
        });
      });

      it('should handle JPEG images', () => {
        const result = engine.parseStrategy('image/jpeg');

        expect(result.strategy).toBe(ProcessingStrategy.OCR);
        expect(result.processing.requiresOCR).toBe(true);
      });

      it('should handle TIFF images with page limit', () => {
        const result = engine.parseStrategy('image/tiff');

        expect(result.strategy).toBe(ProcessingStrategy.OCR);
        expect(result.processing.maxPages).toBe(10);
      });
    });

    describe('Unstructured API Processing', () => {
      it('should return Unstructured strategy for Word documents', () => {
        const result = engine.parseStrategy(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        );

        expect(result).toEqual({
          strategy: ProcessingStrategy.UNSTRUCTURED,
          confidence: 0.9,
          reason: 'Complex document format best handled by Unstructured API',
          processing: {
            chunker: 'unstructured',
            requiresOCR: false,
            requiresUnstructured: true,
            maxPages: 50,
          },
        });
      });

      it('should handle PowerPoint files', () => {
        const result = engine.parseStrategy('application/vnd.ms-powerpoint');

        expect(result.strategy).toBe(ProcessingStrategy.UNSTRUCTURED);
        expect(result.processing.requiresUnstructured).toBe(true);
      });

      it('should handle Excel files', () => {
        const result = engine.parseStrategy('application/vnd.ms-excel');

        expect(result.strategy).toBe(ProcessingStrategy.UNSTRUCTURED);
        expect(result.processing.chunker).toBe('unstructured');
      });
    });

    describe('Rejection Strategy', () => {
      it('should reject executable files', () => {
        const result = engine.parseStrategy('application/x-executable');

        expect(result).toEqual({
          strategy: ProcessingStrategy.REJECT,
          confidence: 1.0,
          reason: 'Executable files not supported for security reasons',
          processing: null,
        });
      });

      it('should reject binary files', () => {
        const result = engine.parseStrategy('application/octet-stream');

        expect(result.strategy).toBe(ProcessingStrategy.REJECT);
        expect(result.reason).toContain('Binary data');
      });

      it('should reject archive files', () => {
        const result = engine.parseStrategy('application/zip');

        expect(result.strategy).toBe(ProcessingStrategy.REJECT);
        expect(result.reason).toContain('Archive files');
      });

      it('should reject video files', () => {
        const result = engine.parseStrategy('video/mp4');

        expect(result.strategy).toBe(ProcessingStrategy.REJECT);
        expect(result.reason).toContain('Video files');
      });
    });

    describe('Unknown MIME Types', () => {
      it('should handle unknown MIME types conservatively', () => {
        const result = engine.parseStrategy('application/x-unknown-format');

        expect(result.strategy).toBe(ProcessingStrategy.REJECT);
        expect(result.confidence).toBeLessThan(0.5);
        expect(result.reason).toContain('Unknown MIME type');
      });

      it('should handle malformed MIME types', () => {
        const result = engine.parseStrategy('not-a-mime-type');

        expect(result.strategy).toBe(ProcessingStrategy.REJECT);
        expect(result.reason).toContain('Invalid MIME type format');
      });
    });
  });

  describe('maybeScanned heuristic', () => {
    it('should detect potentially scanned PDFs', () => {
      const scannedIndicators = {
        fileSize: 50 * 1024 * 1024, // 50MB - large for text-only PDF
        hasText: false,
        metadata: { producer: 'Scanner Pro' },
      };

      const result = engine.parseStrategy('application/pdf', scannedIndicators);

      expect(result.strategy).toBe(ProcessingStrategy.OCR);
      expect(result.reason).toContain('scanned');
    });

    it('should detect text-based PDFs', () => {
      const textIndicators = {
        fileSize: 2 * 1024 * 1024, // 2MB - reasonable for text PDF
        hasText: true,
        metadata: { producer: 'LaTeX' },
      };

      const result = engine.parseStrategy('application/pdf', textIndicators);

      expect(result.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
      expect(result.confidence).toBe(0.9);
    });

    it('should handle missing metadata gracefully', () => {
      const minimalInfo = {
        fileSize: 1024 * 1024, // 1MB
      };

      const result = engine.parseStrategy('application/pdf', minimalInfo);

      expect(result.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
      expect(result.confidence).toBe(0.8); // Default confidence
    });
  });

  describe('Configuration-driven behavior', () => {
    it('should respect custom OCR page limits', () => {
      const customEngine = new MimePolicyEngine({
        ocrMaxPages: 5,
        unstructuredMaxPages: 25,
      });

      const result = customEngine.parseStrategy('image/png');

      expect(result.processing?.maxPages).toBe(5);
    });

    it('should respect security policies', () => {
      const strictEngine = new MimePolicyEngine({
        allowExecutables: false,
        allowArchives: false,
      });

      const result = strictEngine.parseStrategy('application/x-executable');

      expect(result.strategy).toBe(ProcessingStrategy.REJECT);
    });

    it('should handle lenient security policies', () => {
      const lenientEngine = new MimePolicyEngine({
        allowUnknownTypes: true,
      });

      const result = lenientEngine.parseStrategy('application/x-unknown-format');

      expect(result.strategy).not.toBe(ProcessingStrategy.REJECT);
    });
  });

  describe('Performance and caching', () => {
    it('should cache strategy decisions for repeated MIME types', () => {
      const mimeType = 'text/plain';

      const result1 = engine.parseStrategy(mimeType);
      const result2 = engine.parseStrategy(mimeType);

      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Same object reference due to caching
    });

    it('should provide deterministic results', () => {
      const mimeType = 'application/pdf';
      const options = { hasText: true, fileSize: 1024 * 1024 };

      const results = Array.from({ length: 10 }, () => engine.parseStrategy(mimeType, options));

      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toEqual(firstResult);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty MIME type', () => {
      const result = engine.parseStrategy('');

      expect(result.strategy).toBe(ProcessingStrategy.REJECT);
      expect(result.reason).toContain('Invalid');
    });

    it('should handle null/undefined MIME type', () => {
      const result = engine.parseStrategy(null as any);

      expect(result.strategy).toBe(ProcessingStrategy.REJECT);
    });

    it('should handle very long MIME types', () => {
      const longMimeType = 'application/' + 'x'.repeat(1000);

      const result = engine.parseStrategy(longMimeType);

      expect(result.strategy).toBe(ProcessingStrategy.REJECT);
      expect(result.reason).toContain('Invalid');
    });

    it('should handle MIME types with parameters', () => {
      const result = engine.parseStrategy('text/plain; charset=utf-8');

      expect(result.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
    });
  });
});
