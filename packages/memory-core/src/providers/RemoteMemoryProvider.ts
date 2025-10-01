import type {
	MemoryAnalysisInput,
	MemoryRelationshipsInput,
	MemorySearchInput,
	MemoryStatsInput,
	MemoryStoreInput,
} from '@cortex-os/tool-spec';
import type {
	Memory,
	MemoryAnalysisResult,
	MemoryGraph,
	MemoryProvider,
	MemoryRelationship,
	MemorySearchResult,
	MemoryStats,
} from '../types.js';
import { MemoryProviderError } from '../types.js';

interface RemoteMemoryProviderOptions {
	baseUrl: string;
	apiKey?: string;
	fetchImpl?: typeof fetch;
}

interface RemoteResponse<T> {
	data: T;
	success?: boolean;
	error?: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
}

export class RemoteMemoryProvider implements MemoryProvider {
	private readonly baseUrl: string;
	private readonly apiKey?: string;
	private readonly fetchImpl: typeof fetch;

	constructor(options: RemoteMemoryProviderOptions) {
		this.baseUrl = options.baseUrl.replace(/\/$/, '');
		this.apiKey = options.apiKey;
		this.fetchImpl = options.fetchImpl ?? fetch;
	}

	async store(input: MemoryStoreInput): Promise<{ id: string; vectorIndexed: boolean }> {
		return this.post('/memory/store', input);
	}

	async get(id: string): Promise<Memory | null> {
		try {
			const memory = await this.fetch<Memory>(`/memory/${id}`);
			return this.reviveMemory(memory);
		} catch (error) {
			// If it's a 404, return null; otherwise re-throw
			if (error instanceof MemoryProviderError && error.details?.status === 404) {
				return null;
			}
			throw error;
		}
	}

	async search(input: MemorySearchInput): Promise<MemorySearchResult[]> {
		const results = await this.post<MemorySearchResult[]>('/memory/search', input);
		return results.map((result) => this.reviveSearchResult(result));
	}

	async analysis(input: MemoryAnalysisInput): Promise<MemoryAnalysisResult> {
		return this.post('/memory/analysis', input);
	}

	async relationships(
		input: MemoryRelationshipsInput,
	): Promise<MemoryRelationship | MemoryGraph | MemoryRelationship[]> {
		return this.post('/memory/relationships', input);
	}

	async stats(input?: MemoryStatsInput): Promise<MemoryStats> {
		return this.post('/memory/stats', input ?? {});
	}

	async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
		return this.fetch('/healthz');
	}

	async cleanup(): Promise<void> {
		await this.post('/maintenance/cleanup', {});
	}

	async optimize(): Promise<void> {
		await this.post('/maintenance/optimize', {});
	}

	private buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		return headers;
	}

	private async post<T>(path: string, body: unknown): Promise<T> {
		const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: this.buildHeaders(),
			body: JSON.stringify(body),
		});

		return this.parseResponse<T>(response);
	}

	private async fetch<T>(path: string): Promise<T> {
		const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
			method: 'GET',
			headers: this.buildHeaders(),
		});

		return this.parseResponse<T>(response);
	}

	private async parseResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			const message = `${response.status} ${response.statusText}`;
			throw new MemoryProviderError('NETWORK', message, {
				status: response.status,
			});
		}

		const payload = (await response.json()) as RemoteResponse<T>;

		if (payload.error) {
			throw new MemoryProviderError(
				payload.error.code as any,
				payload.error.message,
				payload.error.details,
			);
		}

		return payload.data;
	}

	private reviveMemory(data: Memory | (Memory & { createdAt: string; updatedAt: string })): Memory {
		const createdAt = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt);
		const updatedAt = data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt);

		return {
			...data,
			createdAt,
			updatedAt,
		};
	}

	private reviveSearchResult(
		result: MemorySearchResult | (MemorySearchResult & { createdAt: string; updatedAt: string }),
	): MemorySearchResult {
		const revived = this.reviveMemory(result);
		return {
			...result,
			...revived,
			createdAt: revived.createdAt,
			updatedAt: revived.updatedAt,
		} as MemorySearchResult;
	}
}
