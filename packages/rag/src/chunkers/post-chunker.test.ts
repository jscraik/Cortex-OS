import { describe, expect, it } from 'vitest';
import { postChunk } from './post-chunker.js';

describe('postChunk', () => {
    it('merges chunks up to maxChars when enabled', () => {
        const chunks = [
            { id: 'a', text: 'hello' },
            { id: 'b', text: 'world' },
            { id: 'c', text: 'this is a test' },
        ];
        const out = postChunk(chunks, 'q', { enabled: true, maxChars: 8 });
        // 'hello' + '\n' + 'world' => 11 > 8 so first emission after 'hello'
        // then 'world' merges with 'this is a test' exceeding 8 -> emit 'world', then 'this is a test'
        expect(out.length).toBe(3);
        expect(out[0].text).toBe('hello');
        expect(out[1].text).toBe('world');
        expect(out[2].text).toBe('this is a test');
    });

    it('returns original chunks when disabled or empty', () => {
        const chunks = [{ id: 'x', text: 'one two three' }];
        expect(postChunk(chunks, 'q', { enabled: false })).toEqual(chunks);
        expect(postChunk([], 'q', { enabled: true })).toEqual([]);
    });

    it.skip('intent classification stub present (will be enabled later)', () => {
        // Placeholder to ensure future intent path has test hook
        // Later: enable 'stub' and assert metadata.intent on merged outputs
    });
});
