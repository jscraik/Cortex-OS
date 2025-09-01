import { describe, it, expect } from 'vitest';
import { ProcessingDispatcher } from '../src/chunkers/dispatch';
import { ProcessingStrategy } from '../src/policy/mime';

describe('semantic and sliding chunkers', () => {
  const dispatcher = new ProcessingDispatcher();
  const file = {
    path: 'doc',
    content: Buffer.from('Sentence one. Sentence two. Sentence three. Sentence four.'),
    mimeType: 'text/plain',
    size: 60,
  };

  it('semantic splits by sentences', async () => {
    const res = await dispatcher.dispatch(file, {
      strategy: ProcessingStrategy.NATIVE_TEXT,
      confidence: 1,
      reason: '',
      processing: {
        chunker: 'semantic',
        requiresOCR: false,
        requiresUnstructured: false,
        maxPages: null,
        semantic: { sentences: 2 },
      },
    });
    expect(res.chunks?.length).toBe(2);
  });

  it('sliding uses overlap', async () => {
    const res = await dispatcher.dispatch(file, {
      strategy: ProcessingStrategy.NATIVE_TEXT,
      confidence: 1,
      reason: '',
      processing: {
        chunker: 'sliding',
        requiresOCR: false,
        requiresUnstructured: false,
        maxPages: null,
        sliding: { size: 20, overlap: 10 },
      },
    });
    expect(res.chunks?.length).toBeGreaterThan(1);
    const first = res.chunks![0].content;
    const second = res.chunks![1].content;
    expect(first.slice(-10)).toBe(second.slice(0, 10));
  });
});
