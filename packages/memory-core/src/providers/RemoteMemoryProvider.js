import { LocalMemoryProvider } from './LocalMemoryProvider.js';
function buildUrl(base, path) {
    const url = new URL(path.replace(/^(\/)*/, ''), base);
    return url.toString();
}
/**
 * Minimal remote provider that talks to a JSON HTTP service when available and
 * gracefully falls back to the in-memory implementation when the network layer
 * is unavailable.  This keeps the public API surface stable without taking a
 * dependency on the unfinished gateway utilities from the original code.
 */
export class RemoteMemoryProvider {
    baseUrl;
    apiKey;
    fetchImpl;
    fallback = new LocalMemoryProvider();
    constructor(options) {
        if (options.baseUrl) {
            this.baseUrl = new URL(options.baseUrl);
        }
        this.apiKey = options.apiKey;
        this.fetchImpl =
            options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
    }
    async request(method, path, body) {
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
            return undefined;
        }
        return (await response.json());
    }
    async store(input) {
        try {
            return await this.request('POST', '/memories', input);
        }
        catch {
            return this.fallback.store(input);
        }
    }
    async search(input) {
        try {
            return await this.request('POST', '/memories/search', input);
        }
        catch {
            return this.fallback.search(input);
        }
    }
    async get(input) {
        try {
            return await this.request('GET', `/memories/${encodeURIComponent(input.id)}`);
        }
        catch {
            return this.fallback.get(input);
        }
    }
    async remove(input) {
        try {
            await this.request('DELETE', `/memories/${encodeURIComponent(input.id)}`);
            return { id: input.id, deleted: true };
        }
        catch {
            return this.fallback.remove(input);
        }
    }
    async health() {
        try {
            const status = await this.request('GET', '/health');
            return { brand: 'brAInwav', ok: true, details: { remoteOk: status.ok ?? true } };
        }
        catch {
            return this.fallback.health();
        }
    }
}
