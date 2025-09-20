import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webSearchTool } from '../src/tools/web-search-tool.js';

function ddgHtml(results: Array<{ href: string; title: string; snippet?: string }>) {
    let html = '<html><body>';
    for (const r of results) {
        html += `<a class="result__a" href="${r.href}">${r.title}</a>`;
        html += `<a class="result__snippet">${r.snippet ?? 'snippet here'}</a>`;
    }
    html += '</body></html>';
    return html;
}

describe('WebSearchTool', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('parses DuckDuckGo HTML and applies filters', async () => {
        const html = ddgHtml([
            { href: '/l/?uddg=https%3A%2F%2Fexample.com%2Ffoo', title: 'Example Foo', snippet: 'Foo' },
            { href: 'https://news.ycombinator.com/item?id=1', title: 'HN Post', snippet: 'YCombinator' },
            { href: 'https://localhost/internal', title: 'Local', snippet: 'Should be dropped' },
        ]);

        // Mock fetch to return our HTML
        // Use a minimal Response-like object to avoid environment coupling
        const mockResponse: Pick<Response, 'ok' | 'status' | 'statusText' | 'text'> = {
            ok: true,
            status: 200,
            statusText: 'OK',
            async text() {
                return html;
            },
        };
        globalThis.fetch = vi.fn(async () => mockResponse as unknown as Response);

        const res = await webSearchTool.execute({
            query: 'test',
            maxResults: 10,
            language: 'en',
            timeRange: 'any',
            safeSearch: true,
        });
        expect(res.results.length).toBe(2); // localhost filtered out by safeUrl
        const first = res.results[0];
        expect(first?.url.startsWith('https://example.com/')).toBe(true);
        expect(first?.snippet.length ?? 0).toBeGreaterThan(0);

        // Domain include filter
        const onlyHn = await webSearchTool.execute({
            query: 'test',
            maxResults: 10,
            domains: ['ycombinator.com'],
            language: 'en',
            timeRange: 'any',
            safeSearch: true,
        });
        expect(onlyHn.results.length).toBe(1);
        const firstHn = onlyHn.results[0];
        expect(firstHn?.domain).toContain('ycombinator.com');

        // Exclude filter
        const excludeHn = await webSearchTool.execute({
            query: 'test',
            maxResults: 10,
            excludeDomains: ['ycombinator.com'],
            language: 'en',
            timeRange: 'any',
            safeSearch: true,
        });
        expect(excludeHn.results.find((r) => r.domain.includes('ycombinator.com'))).toBeUndefined();
    });
});
