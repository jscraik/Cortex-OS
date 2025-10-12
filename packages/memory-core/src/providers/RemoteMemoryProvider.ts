import type {
  DeleteMemoryInput,
  DeleteMemoryResult,
  GetMemoryInput,
  GetMemoryResult,
  HealthStatus,
  MemoryProvider,
  SearchMemoryInput,
  SearchMemoryResult,
  StoreMemoryInput,
  StoreMemoryResult,
} from '../provider/MemoryProvider.js';
import { LocalMemoryProvider } from './LocalMemoryProvider.js';

export interface RemoteMemoryProviderOptions {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

function buildUrl(base: URL, path: string): string {
  const url = new URL(path.replace(/^(\/)*/, ''), base);
  return url.toString();
}

/**
 * Minimal remote provider that talks to a JSON HTTP service when available and
 * gracefully falls back to the in-memory implementation when the network layer
 * is unavailable.  This keeps the public API surface stable without taking a
 * dependency on the unfinished gateway utilities from the original code.
 */
export class RemoteMemoryProvider implements MemoryProvider {
  private readonly baseUrl?: URL;
  private readonly apiKey?: string;
  private readonly fetchImpl?: typeof fetch;
  private readonly fallback = new LocalMemoryProvider();

  constructor(options: RemoteMemoryProviderOptions) {
    if (options.baseUrl) {
      this.baseUrl = new URL(options.baseUrl);
    }
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl || !this.fetchImpl) {
      throw new Error('Remote memory API is not configured');
    }
    const response = await this.fetchImpl(buildUrl(this.baseUrl, path), {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Remote memory request failed (${response.status}): ${text}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async store(input: StoreMemoryInput): Promise<StoreMemoryResult> {
    try {
      return await this.request<StoreMemoryResult>('POST', '/memories', input);
    } catch {
      return this.fallback.store(input);
    }
  }

  async search(input: SearchMemoryInput): Promise<SearchMemoryResult> {
    try {
      return await this.request<SearchMemoryResult>('POST', '/memories/search', input);
    } catch {
      return this.fallback.search(input);
    }
  }

  async get(input: GetMemoryInput): Promise<GetMemoryResult> {
    try {
      return await this.request<GetMemoryResult>('GET', `/memories/${encodeURIComponent(input.id)}`);
    } catch {
      return this.fallback.get(input);
    }
  }

  async remove(input: DeleteMemoryInput): Promise<DeleteMemoryResult> {
    try {
      await this.request('DELETE', `/memories/${encodeURIComponent(input.id)}`);
      return { id: input.id, deleted: true };
    } catch {
      return this.fallback.remove(input);
    }
  }

  async health(): Promise<HealthStatus> {
    try {
      const status = await this.request<{ ok?: boolean }>('GET', '/health');
      return { brand: 'brAInwav', ok: true, details: { remoteOk: status.ok ?? true } };
    } catch {
      return this.fallback.health();
    }
  }
}
