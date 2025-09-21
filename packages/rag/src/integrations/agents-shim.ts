// Local shim for agent MCP client to avoid hard dependency during typecheck in other projects

// Vendor-neutral MCP integration config shape
// Local shim and HTTP client for MCP, avoiding hard dependency on external packages

export type MCPIntegrationConfig = Record<string, unknown>;

export interface KnowledgeSearchFilters {
	category?: string[];
	source?: string[];
	dateRange?: { from?: string; to?: string };
	tags?: string[];
	contentType?: string[];
}

export interface KnowledgeSearchResult {
	id: string;
	title: string;
	content: string;
	score: number;
	source: string;
	metadata: Record<string, unknown>;
	timestamp: string;
}

export interface AgentMCPClient {
	initialize(): Promise<unknown>;
	callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown>;
	searchKnowledgeBase(
		query: string,
		options?: { limit?: number; filters?: KnowledgeSearchFilters },
	): Promise<KnowledgeSearchResult[]>;
	createTask(
		title: string,
		description: string,
		options?: Record<string, unknown>,
	): Promise<unknown>;
	updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown>;
	uploadDocument(
		content: string,
		filename: string,
		options?: { tags?: string[]; metadata?: Record<string, unknown> },
	): Promise<{ documentId: string; url: string }>;
	healthCheck(): Promise<boolean>;
	disconnect(): Promise<void>;
}

// Real HTTP JSON-RPC MCP client targeting cortex-mcp `/mcp` endpoint
class HTTPMCPClient implements AgentMCPClient {
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	private idCounter = 1;
	private initialized = false;
	private capabilities: string[] = [];

	constructor(config: MCPIntegrationConfig) {
		const cfg = (config ?? {}) as Record<string, unknown>;
		const envUrl = (typeof process !== 'undefined' && process.env?.MCP_BASE_URL) || undefined;
		const url = (cfg.mcpServerUrl as string | undefined) || envUrl || 'http://localhost:3024';
		this.baseUrl = `${url.replace(/\/$/, '')}/mcp`;
		this.apiKey =
			(cfg.apiKey as string | undefined) ||
			(typeof process !== 'undefined' ? process.env?.MCP_API_KEY : undefined);
	}

	private nextId(): string {
		return `mcprpc-${Date.now()}-${this.idCounter++}`;
	}

	private async postRPC(
		method: string,
		params: Record<string, unknown> = {},
		timeoutMs?: number,
	): Promise<unknown> {
		const body = { jsonrpc: '2.0', id: this.nextId(), method, params };
		const headers: Record<string, string> = { 'content-type': 'application/json' };
		if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;

		// Use global fetch when available; throw clear error otherwise
		const f = (
			globalThis as { fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response> }
		).fetch;
		if (typeof f !== 'function') {
			throw new Error(
				'fetch is not available in this runtime. Node 18+ or a fetch polyfill is required.',
			);
		}

		let controller: AbortController | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (typeof AbortController !== 'undefined' && typeof timeoutMs === 'number' && timeoutMs > 0) {
			controller = new AbortController();
			timer = setTimeout(() => controller?.abort(), timeoutMs);
		}
		const res = await f(this.baseUrl, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
			signal: controller?.signal ?? null,
		});
		if (timer) clearTimeout(timer);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`MCP HTTP error ${res.status}: ${text || res.statusText}`);
		}
		type JSONRPCError = { code: number; message: string; data?: unknown };
		type JSONRPCResponse =
			| { jsonrpc?: string; id?: unknown; result?: unknown; error?: JSONRPCError }
			| Record<string, unknown>;
		const data: JSONRPCResponse = await res.json().catch(() => ({}) as Record<string, unknown>);
		const hasError = (v: JSONRPCResponse): v is { error: JSONRPCError } => {
			if (!v || typeof v !== 'object') return false;
			const rec = v as Record<string, unknown>;
			return typeof rec.error === 'object' && rec.error !== null;
		};
		const hasResult = (v: JSONRPCResponse): v is { result: unknown } =>
			Boolean(v && typeof v === 'object' && 'result' in v);
		if (hasError(data)) {
			const msg = data.error?.message ?? 'unknown error';
			throw new Error(`MCP RPC error: ${msg}`);
		}
		if (hasResult(data)) return data.result;
		return data as unknown;
	}

	async initialize(): Promise<unknown> {
		try {
			// Try to list capabilities if available
			const result = (await this.postRPC('list_capabilities').catch(() => ({}))) as Record<
				string,
				unknown
			>;
			const tools = Array.isArray(result.tools) ? (result.tools as unknown[]) : [];
			if (tools.length) {
				this.capabilities = tools.map((t) => String(t));
			}
			this.initialized = true;
			return { capabilities: this.capabilities };
		} catch (err) {
			// Non-fatal: allow lazy usage of methods; log at debug level
			console.debug?.('[MCP] list_capabilities failed; continuing without capabilities', err);
			this.initialized = true;
			return { capabilities: [] };
		}
	}

	private ensureInit() {
		if (!this.initialized)
			throw new Error('MCP client is not initialized. Call initialize() first.');
	}

	async callTool(name: string, args: Record<string, unknown>, timeout?: number): Promise<unknown> {
		this.ensureInit();
		return await this.postRPC(name, args, timeout);
	}

	async searchKnowledgeBase(
		query: string,
		options?: { limit?: number; filters?: KnowledgeSearchFilters },
	): Promise<KnowledgeSearchResult[]> {
		this.ensureInit();
		const limit = options?.limit ?? 10;
		const result = (await this.postRPC('search', { query, max_results: limit })) as Record<
			string,
			unknown
		>;
		const items = Array.isArray(result.results)
			? (result.results as Array<Record<string, unknown>>)
			: [];
		const now = new Date().toISOString();
		return items.map((r) => ({
			id: String(r.id ?? r.resourceId ?? r.docId ?? ''),
			title: String(r.title ?? ''),
			content: String(r.text ?? r.content ?? ''),
			score: Number(r.score ?? 0),
			source: String(r.source ?? 'cortex-mcp'),
			metadata: {
				url: r.url ?? undefined,
			} as Record<string, unknown>,
			timestamp: now,
		}));
	}

	async uploadDocument(
		content: string,
		filename: string,
		options?: { tags?: string[]; metadata?: Record<string, unknown> },
	): Promise<{ documentId: string; url: string }> {
		this.ensureInit();
		const result = (await this.postRPC('upload_document', {
			content,
			filename,
			options: options ?? {},
		})) as Record<string, unknown>;
		const id = String((result.documentId ?? result.id ?? 'doc-unknown') as string);
		const url = String((result.url ?? `mcp://${id}`) as string);
		return { documentId: id, url };
	}

	async createTask(
		title: string,
		description: string,
		options?: Record<string, unknown>,
	): Promise<unknown> {
		this.ensureInit();
		return await this.postRPC('create_task', { title, description, options: options ?? {} });
	}

	async updateTaskStatus(taskId: string, status: string, notes?: string): Promise<unknown> {
		this.ensureInit();
		return await this.postRPC('update_task_status', { taskId, status, notes });
	}

	async healthCheck(): Promise<boolean> {
		try {
			const res = await this.postRPC('health_check').catch(async () => this.postRPC('ping'));
			if (res && typeof res === 'object') {
				const status = (res as Record<string, unknown>).status;
				return String(status ?? '').toLowerCase() === 'ok' || Boolean(res);
			}
			return Boolean(res);
		} catch {
			return false;
		}
	}

	async disconnect(): Promise<void> {
		// No persistent connection for HTTP transport; noop
		return Promise.resolve();
	}
}

export function createAgentMCPClient(config: MCPIntegrationConfig): AgentMCPClient {
	return new HTTPMCPClient(config);
}
