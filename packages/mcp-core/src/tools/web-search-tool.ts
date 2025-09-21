import { z } from 'zod';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const WebSearchInputSchema = z.object({
	query: z.string().min(1, 'query is required'),
	maxResults: z.number().int().min(1).max(20).default(10),
	domains: z.array(z.string()).optional(),
	excludeDomains: z.array(z.string()).optional(),
	language: z.string().default('en'),
	region: z.string().optional(),
	timeRange: z.enum(['day', 'week', 'month', 'year', 'any']).default('any'),
	safeSearch: z.boolean().default(true),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export interface WebSearchResult {
	title: string;
	url: string;
	snippet: string;
	displayUrl: string;
	datePublished?: string;
	domain: string;
	language?: string;
}

export interface WebSearchToolResult {
	query: string;
	results: WebSearchResult[];
	totalResults: number;
	searchTime: number;
	language: string;
	region?: string;
	filtered: boolean;
	timestamp: string;
}

export class WebSearchTool implements McpTool<unknown, WebSearchToolResult> {
	readonly name = 'web-search';
	readonly description = 'Performs web searches with domain filtering and advanced search options.';
	readonly inputSchema = WebSearchInputSchema;
	private readonly baseUrl: string;

	constructor(opts?: { baseUrl?: string }) {
		// Default to DuckDuckGo HTML endpoint; allow override for integration testing
		this.baseUrl = opts?.baseUrl ?? 'https://duckduckgo.com/html/';
	}

	async execute(
		input: WebSearchInput,
		context?: ToolExecutionContext,
	): Promise<WebSearchToolResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('WebSearch tool execution aborted.', { code: 'E_TOOL_ABORTED' });
		}

		const start = Date.now();

		try {
			const url = this.buildDDGUrl(input);
			const html = await this.fetchHtml(url, context);
			const parsed = this.parseResults(html, input);

			// Apply domain filters
			let results = parsed;
			let filtered = false;

			if (input.domains?.length) {
				const domains = input.domains;
				results = results.filter((r) => domains?.some((d) => r.domain.includes(d)) === true);
				filtered = true;
			}
			if (input.excludeDomains?.length) {
				const exclude = input.excludeDomains;
				results = results.filter((r) => exclude?.some((d) => r.domain.includes(d)) !== true);
				filtered = true;
			}

			results = results.slice(0, input.maxResults);

			return {
				query: input.query,
				results,
				totalResults: results.length,
				searchTime: Date.now() - start,
				language: input.language,
				region: input.region,
				filtered,
				timestamp: new Date().toISOString(),
			};
		} catch (err) {
			if (err instanceof ToolExecutionError) throw err;
			const msg = err instanceof Error ? err.message : String(err);
			throw new ToolExecutionError(
				`Web search failed: ${msg} \nNote: Provider may throttle automated requests.`,
				{
					code: 'E_SEARCH_FAILED',
					cause: err,
				},
			);
		}
	}

	private buildDDGUrl(input: WebSearchInput): string {
		const params = new URLSearchParams();
		params.set('q', input.query);
		if (input.language) params.set('kl', input.language);
		const timeMap: Record<WebSearchInput['timeRange'], string | undefined> = {
			day: 'd',
			week: 'w',
			month: 'm',
			year: 'y',
			any: undefined,
		};
		const df = timeMap[input.timeRange];
		if (df) params.set('df', df);
		// Safe search: 1 on, -2 off (historical convention)
		params.set('kp', input.safeSearch ? '1' : '-2');
		const sep = this.baseUrl.includes('?') || this.baseUrl.endsWith('/') ? '' : '/';
		return `${this.baseUrl}${sep}?${params.toString()}`;
	}

	private async fetchHtml(url: string, context?: ToolExecutionContext): Promise<string> {
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Cortex-OS MCP WebSearch Tool/1.0' },
			signal: context?.signal,
		});
		if (!res.ok) {
			throw new ToolExecutionError(`Search provider error: ${res.status} ${res.statusText}`, {
				code: 'E_SEARCH_PROVIDER',
			});
		}
		return res.text();
	}

	private parseResults(html: string, input: WebSearchInput): WebSearchResult[] {
		const results: WebSearchResult[] = [];
		// Simple anchor extraction for result titles/links
		const anchorRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;

		let match: RegExpExecArray | null = anchorRegex.exec(html);
		const anchors: Array<{ href: string; titleHtml: string; index: number }> = [];
		while (match && anchors.length < 50) {
			anchors.push({ href: match[1], titleHtml: match[2], index: match.index });
			match = anchorRegex.exec(html);
		}

		for (const a of anchors) {
			const title = this.stripTags(a.titleHtml);
			const urlStr = this.resolveDDGRedirect(a.href);
			const urlObj = this.safeUrl(urlStr);
			if (!urlObj) continue;
			const domain = urlObj.hostname;
			const snippet = this.extractSnippetNear(html, a.index);

			results.push({
				title,
				url: urlObj.toString(),
				snippet,
				displayUrl: domain,
				domain,
				language: input.language,
			});
		}
		return results;
	}

	private extractSnippetNear(html: string, fromIndex: number): string {
		// Find the next element with class result__snippet after the anchor
		const clsIdx = html.indexOf('result__snippet', fromIndex);
		if (clsIdx === -1) return '';
		const openTagEnd = html.indexOf('>', clsIdx);
		if (openTagEnd === -1) return '';
		const closeIdx = html.indexOf('</a>', openTagEnd);
		if (closeIdx === -1) return '';
		return this.stripTags(html.slice(openTagEnd + 1, closeIdx));
	}

	private stripTags(s: string): string {
		return s
			.replace(/<[^>]*>/g, '')
			.replace(/\s+/g, ' ')
			.trim();
	}

	private resolveDDGRedirect(href: string): string {
		try {
			const u = new URL(href, 'https://duckduckgo.com');
			if (u.pathname.startsWith('/l/') && u.searchParams.has('uddg')) {
				const t = u.searchParams.get('uddg');
				if (t) return decodeURIComponent(t);
			}
			return u.toString();
		} catch {
			return href;
		}
	}

	private safeUrl(u: string): URL | null {
		try {
			const url = new URL(u);
			if (!['http:', 'https:'].includes(url.protocol)) return null;
			const host = url.hostname;
			if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return null;

			const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
			const ipv4Match = ipv4Regex.exec(host);
			if (ipv4Match) {
				const a = Number.parseInt(ipv4Match[1], 10);
				const b = Number.parseInt(ipv4Match[2], 10);
				if (a === 10) return null; // 10.0.0.0/8
				if (a === 192 && b === 168) return null; // 192.168.0.0/16
				if (a === 172 && b >= 16 && b <= 31) return null; // 172.16.0.0/12
				if (a === 127) return null; // loopback
			}
			return url;
		} catch {
			return null;
		}
	}
}

export const webSearchTool = new WebSearchTool();
