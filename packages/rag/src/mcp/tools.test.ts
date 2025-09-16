import { beforeEach, describe, expect, it } from 'vitest';
import {
	__resetRagPipelineForTesting,
	ragCitationTool,
	ragDocumentIngestTool,
	ragRerankTool,
	ragRetrieveTool,
	ragSearchTool,
} from './tools';

type ToolResponse = Awaited<ReturnType<typeof ragDocumentIngestTool.handler>>;

function parseResponse(response: ToolResponse) {
	const [first] = response.content;
	expect(first, 'tool response should include text content').toBeDefined();
	return JSON.parse(first.text);
}

describe('RAG MCP tools', () => {
	beforeEach(() => {
		__resetRagPipelineForTesting();
	});

	describe('document ingestion tool', () => {
		it('persists ingested documents for downstream search', async () => {
			const ingestResult = await ragDocumentIngestTool.handler({
				documentId: 'doc-animals',
				text: 'The quick brown fox jumps over the lazy dog while exploring the forest.',
				metadata: { topic: 'animals', source: 'test-suite' },
				chunkSize: 64,
			});

			const ingestPayload = parseResponse(ingestResult);
			expect(ingestPayload.status).toBe('ingested');
			expect(ingestPayload.documentId).toBe('doc-animals');
			expect(ingestPayload.chunks).toBeGreaterThan(0);

			const searchResult = await ragSearchTool.handler({
				query: 'quick fox in forest',
				topK: 1,
			});

			const searchPayload = parseResponse(searchResult);
			expect(searchPayload.results).toHaveLength(1);
			expect(searchPayload.results[0].documentId).toBe('doc-animals');
			expect(searchPayload.results[0].metadata).toMatchObject({
				topic: 'animals',
			});
			expect(searchPayload.results[0].score).toBeGreaterThan(0);
		});
	});

	describe('search tool', () => {
		it('orders results by semantic similarity', async () => {
			await ragDocumentIngestTool.handler({
				documentId: 'doc-energy',
				text: 'Solar energy reduces greenhouse gas emissions and provides reliable renewable power.',
			});
			await ragDocumentIngestTool.handler({
				documentId: 'doc-history',
				text: 'Medieval history explores knights, castles, and feudal societies.',
			});

			const searchResult = await ragSearchTool.handler({
				query: 'renewable energy power',
				topK: 2,
			});

			const payload = parseResponse(searchResult);
			expect(payload.results[0].documentId).toBe('doc-energy');
			expect(payload.results[0].score).toBeGreaterThan(
				payload.results[1].score,
			);
		});
	});

	describe('retrieval tool', () => {
		it('aggregates relevant context with citations', async () => {
			await ragDocumentIngestTool.handler({
				documentId: 'doc-solar',
				text: 'Solar panels convert sunlight into energy and reduce electricity costs.',
			});
			await ragDocumentIngestTool.handler({
				documentId: 'doc-wind',
				text: 'Wind turbines capture kinetic energy from the wind to generate clean power.',
			});

			const retrievalResult = await ragRetrieveTool.handler({
				query: 'clean energy sources',
				topK: 2,
			});

			const payload = parseResponse(retrievalResult);
			expect(payload.citations.length).toBeGreaterThan(0);
			expect(payload.context).toContain('Solar panels');
			expect(payload.citations[0].text).toContain('energy');
			expect(payload.noEvidence).toBeFalsy();
		});
	});

	describe('reranking tool', () => {
		it('prioritizes documents matching the query intent', async () => {
			const rerankResult = await ragRerankTool.handler({
				query: 'cat care tips',
				documents: [
					{
						id: 'doc-cats',
						content:
							'Cats require gentle grooming and enjoy quiet naps in sunny spaces.',
					},
					{
						id: 'doc-dogs',
						content:
							'Dogs thrive on daily walks, obedience training, and interactive play.',
					},
				],
				topK: 2,
			});

			const payload = parseResponse(rerankResult);
			expect(payload.documents[0].id).toBe('doc-cats');
			expect(payload.documents[0].similarity).toBeGreaterThan(
				payload.documents[1].similarity,
			);
		});
	});

	describe('citation tool', () => {
		it('maps claims to supporting evidence when available', async () => {
			await ragDocumentIngestTool.handler({
				documentId: 'doc-claims',
				text: 'Solar power reduces carbon emissions and lowers long-term electricity costs.',
			});

			const citationResult = await ragCitationTool.handler({
				query: 'benefits of solar power',
				claims: [
					'Solar power reduces carbon emissions',
					'Cats operate solar farms on the moon',
				],
				topK: 3,
			});

			const payload = parseResponse(citationResult);
			expect(payload.citations.length).toBeGreaterThan(0);

			const supportedClaim = payload.claimCitations.find(
				(claim: { claim: string }) =>
					claim.claim.includes('reduces carbon emissions'),
			);
			expect(supportedClaim?.citations.length).toBeGreaterThan(0);

			const unsupportedClaim = payload.claimCitations.find(
				(claim: { claim: string }) =>
					claim.claim.includes('Cats operate solar farms'),
			);
			expect(unsupportedClaim?.noEvidence).toBe(true);
		});
	});
});
