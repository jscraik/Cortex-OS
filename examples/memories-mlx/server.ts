import http from 'node:http';
import { URL } from 'node:url';
import { createMemoryProviderFromEnv, type MemoryProvider } from '@cortex-os/memory-core';
import type { MemoryStoreInput } from '@cortex-os/tool-spec';

const PORT = Number(process.env.DEMO_PORT || process.env.PORT || 8088);

function applyDefaults(): void {
	process.env.MEMORY_DB_PATH = process.env.MEMORY_DB_PATH || './data/unified-memories.db';
	process.env.MEMORY_DEFAULT_LIMIT = process.env.MEMORY_DEFAULT_LIMIT || '8';
	process.env.MEMORY_MAX_LIMIT = process.env.MEMORY_MAX_LIMIT || '25';
	process.env.MEMORY_DEFAULT_THRESHOLD = process.env.MEMORY_DEFAULT_THRESHOLD || '0.3';
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	});
	res.end(JSON.stringify(payload));
}

function parseStoreInput(body: unknown): MemoryStoreInput {
	const now = new Date().toISOString();
	const content = String(body.text ?? '').trim();
	return {
		content,
		domain: body.domain || 'demo',
		tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
		importance: Number.isInteger(body.importance) ? body.importance : 5,
		metadata: {
			source: body.source || 'mlx-demo',
			createdAt: body.createdAt || now,
			updatedAt: body.updatedAt || now,
		},
	};
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', (chunk) => {
			data += chunk;
		});
		req.on('end', () => {
			try {
				resolve(data ? JSON.parse(data) : {});
			} catch (_error) {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', reject);
	});
}

async function handleHealth(provider: MemoryProvider, res: http.ServerResponse): Promise<void> {
	const health = await provider.healthCheck();
	sendJson(res, 200, { status: health.healthy ? 'ok' : 'degraded', details: health.details });
}

async function handleIngest(
	provider: MemoryProvider,
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	const body = (await readJson(req)) as Record<string, unknown>;
	const input = parseStoreInput(body);
	if (!input.content) {
		sendJson(res, 400, { error: 'text is required' });
		return;
	}
	const result = await provider.store(input);
	sendJson(res, 201, { id: result.id, vectorIndexed: result.vectorIndexed });
}

async function handleSearch(
	provider: MemoryProvider,
	url: URL,
	res: http.ServerResponse,
): Promise<void> {
	const query = url.searchParams.get('query');
	if (!query) {
		sendJson(res, 400, { error: 'query parameter is required' });
		return;
	}
	const limit = Number(url.searchParams.get('limit') || '5');
	const searchType = url.searchParams.get('searchType') || 'hybrid';
	const results = await provider.search({
		query,
		limit,
		search_type: searchType === 'keyword' ? 'keyword' : 'hybrid',
		domain: url.searchParams.get('domain') || undefined,
	});
	sendJson(res, 200, {
		count: results.length,
		results: results.map((memory) => ({
			id: memory.id,
			score: memory.score,
			content: memory.content,
			tags: memory.tags,
			matchType: memory.matchType,
		})),
	});
}

async function routeRequest(
	provider: MemoryProvider,
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	if (req.method === 'OPTIONS') {
		sendJson(res, 204, {});
		return;
	}

	try {
		const url = new URL(req.url || '/', `http://${req.headers.host}`);
		if (req.method === 'GET' && url.pathname === '/health') {
			await handleHealth(provider, res);
			return;
		}
		if (req.method === 'POST' && url.pathname === '/ingest') {
			await handleIngest(provider, req, res);
			return;
		}
		if (req.method === 'GET' && url.pathname === '/search') {
			await handleSearch(provider, url, res);
			return;
		}
		sendJson(res, 404, { error: 'Not Found' });
	} catch (error) {
		sendJson(res, 500, { error: (error as Error).message });
	}
}

async function bootstrap(): Promise<void> {
	applyDefaults();
	const provider = createMemoryProviderFromEnv();
	const server = http.createServer((req, res) => {
		routeRequest(provider, req, res).catch((error) => {
			sendJson(res, 500, { error: (error as Error).message });
		});
	});

	server.listen(PORT, () => {
		console.error(`Local memory demo running at http://127.0.0.1:${PORT}`);
	});
}

bootstrap().catch((error) => {
	console.error(error);
	process.exit(1);
});
