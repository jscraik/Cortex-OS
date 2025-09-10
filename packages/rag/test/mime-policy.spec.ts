import { describe, it, expect } from 'vitest';
import { MimePolicyEngine, ProcessingStrategy } from '../src/policy/mime';

describe('MimePolicyEngine.parseStrategy', () => {
  it('routes text/plain to native text chunker', () => {
    const engine = new MimePolicyEngine();
    const res = engine.parseStrategy('text/plain');
    expect(res.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
    expect(res.processing?.chunker).toBe('text');
    expect(res.processing?.requiresOCR).toBe(false);
  });

  it('routes text/markdown to markdown chunker', () => {
    const engine = new MimePolicyEngine();
    const res = engine.parseStrategy('text/markdown');
    expect(res.strategy).toBe(ProcessingStrategy.NATIVE_TEXT);
    expect(res.processing?.chunker).toBe('markdown');
  });

  it('routes application/pdf to PDF native, and OCR if no text layer', () => {
    const engine = new MimePolicyEngine();
    const pdf = engine.parseStrategy('application/pdf', { hasText: true });
    expect(pdf.strategy).toBe(ProcessingStrategy.PDF_NATIVE);
    expect(pdf.processing?.chunker).toBe('pdf');

    const pdfNoText = engine.parseStrategy('application/pdf', { hasText: false });
    expect(pdfNoText.strategy).toBe(ProcessingStrategy.OCR);
    expect(pdfNoText.processing?.chunker).toBe('ocr');
  });

  it('routes Office docs to Unstructured', () => {
    const engine = new MimePolicyEngine();
    const res = engine.parseStrategy(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(res.strategy).toBe(ProcessingStrategy.UNSTRUCTURED);
    expect(res.processing?.chunker).toBe('unstructured');
  });
});

