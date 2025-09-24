import { describe, expect, it } from 'vitest';
import { chunkText, createSemanticChunker } from '../semantics/SemanticChunker.js';

describe('SemanticChunker', () => {
    const jsSample = `export function foo(a, b) {\n  return a + b;\n}\n\nconst bar = (x) => {\n  return x * 2;\n};\n\nclass Baz {\n  method() { return 1; }\n}`;

    it('splits on JS/TS boundaries', () => {
        const chunks = chunkText(jsSample, { language: 'ts', maxChunkChars: 80, overlap: 0 });
        expect(chunks.length).toBeGreaterThanOrEqual(3);
        expect(chunks[0].text).toMatch(/export function foo/);
        expect(chunks[1].text).toMatch(/const bar/);
        expect(chunks[chunks.length - 1].text).toMatch(/class Baz/);
    });

    it('applies overlap between chunks', () => {
        const chunks = chunkText(jsSample, { language: 'ts', maxChunkChars: 60, overlap: 10 });
        expect(chunks.length).toBeGreaterThan(1);
        for (let i = 1; i < chunks.length; i++) {
            const prev = chunks[i - 1];
            const cur = chunks[i];
            // Overlap means the start of current is <= prev.end
            expect(cur.start).toBeLessThanOrEqual(prev.end);
        }
    });

    it('falls back to fixed-size slicing when no boundaries', () => {
        const text = 'a'.repeat(250);
        const chunks = chunkText(text, { language: 'any', maxChunkChars: 100, overlap: 0 });
        expect(chunks.length).toBe(3);
        expect(chunks[0].text.length).toBe(100);
        expect(chunks[1].text.length).toBe(100);
        expect(chunks[2].text.length).toBe(50);
    });

    it('exposes factory with same behavior', () => {
        const chunker = createSemanticChunker();
        const chunks = chunker.chunkText(jsSample, { language: 'js', maxChunkChars: 80, overlap: 0 });
        expect(chunks.length).toBeGreaterThanOrEqual(3);
    });
});
