import { describe, it, expect } from 'vitest';
import { ingestFile } from '../ingest';

describe('Ingestion Pipeline Entry', () => {
  it('ingests a plain text file using policy + dispatcher', async () => {
    const file = {
      path: '/tmp/test.txt',
      content: Buffer.from('Hello world\n'.repeat(50), 'utf-8'),
      mimeType: 'text/plain',
      size: Buffer.byteLength('Hello world\n'.repeat(50)),
    };

    const result = await ingestFile(file);

    expect(result.success).toBe(true);
    expect(result.strategy).toBeDefined();
    expect(result.metadata.chunker).toBe('text');
    expect(result.metadata.totalChunks ?? 0).toBeGreaterThan(0);
  });

  it('applies policy overrides where defined (image/*)', async () => {
    const file = {
      path: '/tmp/test.png',
      content: Buffer.from('PNGDATA'),
      mimeType: 'image/png',
      size: 1024,
    };

    const result = await ingestFile(file);
    expect(result.success).toBe(true);
    // From config/retrieval.policy.json image/* override -> maxPages: 5
    expect(result.metadata.processingDetails?.maxPages).toBe(5);
  });
});
