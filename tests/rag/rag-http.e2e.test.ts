import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startRagHttpSurface } from '../../apps/cortex-os/src/rag/runtime-http.js';

const shouldRunE2E = process.env.CORTEX_RAG_E2E === 'true';
const describeE2E = shouldRunE2E ? describe : describe.skip;

describeE2E('brAInwav RAG HTTP end-to-end', () => {
	const enableNeo4j =
		(process.env.EXTERNAL_KG_ENABLED === 'true' && Boolean(process.env.NEO4J_URI)) ||
		Boolean(process.env.NEO4J_URI && process.env.NEO4J_USER && process.env.NEO4J_PASSWORD);

	let surface: Awaited<ReturnType<typeof startRagHttpSurface>> | undefined;

	beforeAll(async () => {
		surface = await startRagHttpSurface({
			host: process.env.CORTEX_RAG_HTTP_HOST ?? '127.0.0.1',
			port: Number(process.env.CORTEX_RAG_HTTP_PORT ?? '0'),
			chunkSize: Number(process.env.CORTEX_RAG_CHUNK_SIZE ?? '800'),
			enableNeo4j,
		});
	});

	afterAll(async () => {
		if (surface) {
			await surface.close();
		}
	});

	it('ingests content and retrieves hierarchical answer', async () => {
		if (!surface) throw new Error('Surface not initialized');
		const documentId = `doc-${Date.now()}`;
		const ingestResponse = await surface.server.inject({
			method: 'POST',
			url: '/rag/ingest',
			payload: {
				documentId,
				source: 'docs/e2e.md',
				text: 'brAInwav integration test content highlights SLO posture and latency trends.',
				metadata: { namespace: 'e2e-suite', title: 'Integration Test Doc' },
				hierarchical: true,
			},
		});

		expect(ingestResponse.statusCode).toBe(202);
		const ingestBody = ingestResponse.json() as { status: string; documentId: string };
		expect(ingestBody.status).toBe('accepted');
		expect(ingestBody.documentId).toBe(documentId);

		const queryResponse = await surface.server.inject({
			method: 'POST',
			url: '/rag/hier-query',
			payload: {
				query: 'How does the brAInwav integration test describe latency trends?',
				top_k: 8,
				graph_walk: true,
				self_rag: false,
				multimodal: false,
				filters: { namespace: 'e2e-suite' },
			},
		});

		expect(queryResponse.statusCode).toBe(200);
		const body = queryResponse.json() as { answer?: string; citations?: unknown[] };
		expect(body.answer).toMatch(/latency/i);
		expect(Array.isArray(body.citations)).toBe(true);
		expect((body.citations ?? []).length).toBeGreaterThan(0);
		expect(
			(body.citations ?? []).some(
				(citation) =>
					typeof (citation as { path?: unknown }).path === 'string' &&
					/^[Nn]eo4j:/.test((citation as { path: string }).path),
			),
		).toBe(true);
	});
});
