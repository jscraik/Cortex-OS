import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSearchTool } from '../src/tools/web-search-tool.js';

// Minimal HTML responder that mimics the parts of DDG HTML we parse
function makeHtml(results: Array<{ href: string; title: string; snippet?: string }>) {
	let html = '<html><body>';
	for (const r of results) {
		html += `<a class="result__a" href="${r.href}">${r.title}</a>`;
		html += `<a class="result__snippet">${r.snippet ?? 'snippet here'}</a>`;
	}
	html += '</body></html>';
	return html;
}

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
	server = http.createServer((req, res) => {
		// Validate query string shape (q=, kl=, df=, kp=)
		const url = new URL(req.url || '/', `http://${req.headers.host}`);
		const q = url.searchParams.get('q');
		const kl = url.searchParams.get('kl');
		const kp = url.searchParams.get('kp');
		if (!q || !kl || !kp) {
			res.writeHead(400, { 'Content-Type': 'text/html' });
			res.end('<html><body>Bad request</body></html>');
			return;
		}

		// Return a simple HTML page with a few results, including a localhost one which should be filtered
		const html = makeHtml([
			{ href: '/l/?uddg=https%3A%2F%2Fexample.com%2Ffoo', title: 'Example Foo', snippet: 'Foo' },
			{ href: 'https://news.ycombinator.com/item?id=1', title: 'HN Post', snippet: 'YCombinator' },
			{ href: 'https://localhost/internal', title: 'Local', snippet: 'Should be dropped' },
		]);

		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.end(html);
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('failed to bind');
	baseUrl = `http://127.0.0.1:${address.port}/html/`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('WebSearchTool integration (no mocks)', () => {
	it('fetches from a live local server and parses results with filters', async () => {
		const tool = new WebSearchTool({ baseUrl });
		const res = await tool.execute({
			query: 'test integration',
			maxResults: 10,
			language: 'en',
			timeRange: 'any',
			safeSearch: true,
		});

		expect(res.query).toContain('test');
		// localhost result should be filtered by safeUrl
		expect(res.results.find((r) => r.domain.includes('localhost'))).toBeUndefined();
		// Example.com link should be de-redirected and present
		const first = res.results[0];
		expect(first?.url.startsWith('https://example.com/')).toBe(true);
	});

	it('applies include and exclude domain filters', async () => {
		const tool = new WebSearchTool({ baseUrl });
		const onlyHn = await tool.execute({
			query: 'filters',
			maxResults: 10,
			domains: ['ycombinator.com'],
			language: 'en',
			timeRange: 'any',
			safeSearch: true,
		});
		expect(onlyHn.results.length).toBe(1);
		expect(onlyHn.results[0]?.domain).toContain('ycombinator.com');

		const excludeHn = await tool.execute({
			query: 'filters',
			maxResults: 10,
			excludeDomains: ['ycombinator.com'],
			language: 'en',
			timeRange: 'any',
			safeSearch: true,
		});
		expect(excludeHn.results.find((r) => r.domain.includes('ycombinator.com'))).toBeUndefined();
	});

	it('surfaces provider errors clearly', async () => {
		// Start a temporary server that returns 503
		const bad = http.createServer((_req, res) => {
			res.writeHead(503, { 'Content-Type': 'text/html' });
			res.end('<html><body>Service Unavailable</body></html>');
		});
		await new Promise<void>((resolve) => bad.listen(0, '127.0.0.1', () => resolve()));
		const addr = bad.address();
		if (!addr || typeof addr === 'string') throw new Error('bind failure');
		const badBase = `http://127.0.0.1:${addr.port}/html/`;

		const tool = new WebSearchTool({ baseUrl: badBase });
		await expect(
			tool.execute({
				query: 'x',
				maxResults: 5,
				language: 'en',
				timeRange: 'any',
				safeSearch: true,
			}),
		).rejects.toThrow(/Search provider error: 503/);

		await new Promise<void>((resolve) => bad.close(() => resolve()));
	});
});
