import { createSelfRagController } from '@cortex-os/rag';
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { RagHierQuerySchema, RagIngestRequestSchema } from './schemas.js';
import type {
	GraphRagQuery,
	GraphRagResult,
	IngestRequest,
	RagHttpServerOptions,
} from './types.js';

const BRAND_SOURCE = 'brAInwav RAG HTTP Surface';

function formatZodError(error: ZodError) {
	const firstIssue = error.issues.at(0);
	const message = firstIssue?.message ?? 'brAInwav: validation failed';
	return {
		error: {
			code: 'VALIDATION_ERROR',
			message,
			details: error.issues.map((issue) => ({
				path: issue.path.join('.') || 'root',
				message: issue.message,
			})),
		},
	};
}

function mapQuestionPayload(input: ReturnType<typeof RagHierQuerySchema.parse>): GraphRagQuery {
	return {
		question: input.query,
		k: input.top_k,
		maxHops: input.graph_walk ? 2 : 1,
		includeCitations: true,
		namespace: input.namespace,
		filters: input.filters,
	};
}

function buildHierQueryResponse(
	result: GraphRagResult,
	flags: {
		multimodal: boolean;
		selfRag: boolean;
		metrics?: { rounds: number; retrievalCalls: number; critiques: string[] };
	},
) {
	const fallbackCitations = result.sources.map((source) => ({
		path: source.path ?? 'unknown',
		relevanceScore: source.score ?? 0,
		brainwavIndexed: true,
	}));

	const payload: Record<string, unknown> = {
		answer: result.answer ?? '',
		citations: result.citations ?? fallbackCitations,
		graph: result.graphContext,
		metadata: result.metadata,
		brAInwav: {
			service: BRAND_SOURCE,
			multimodal: flags.multimodal,
			selfRag: flags.selfRag,
			timestamp: new Date().toISOString(),
		},
	};

	if (flags.metrics) {
		payload.selfRag = flags.metrics;
	}

	return payload;
}

function buildIngestPayload(
	payload: ReturnType<typeof RagIngestRequestSchema.parse>,
): IngestRequest {
	return {
		documentId: payload.documentId,
		source: payload.source,
		text: payload.text,
		metadata: payload.metadata,
		hierarchical: payload.hierarchical,
		multimodal: payload.multimodal,
	};
}

export function createServer(options: RagHttpServerOptions): FastifyInstance {
	const fastify = options.fastifyInstance ?? Fastify({ logger: false });
	const selfRagController = options.selfRag ?? createSelfRagController();

	if (options.enableCors !== false) {
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		fastify.register(cors, { origin: options.corsOrigin ?? false });
	}

	fastify.setErrorHandler(async (error, request, reply) => {
		if (error instanceof ZodError) {
			await reply.status(400).send(formatZodError(error));
			return;
		}

		request.log.error(error, 'brAInwav: unhandled server error');
		await reply.status(500).send({
			error: {
				code: 'INTERNAL_ERROR',
				message: 'brAInwav: unexpected server failure',
			},
		});
	});

	fastify.post('/rag/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = RagIngestRequestSchema.parse(request.body);
		const ingestPayload = buildIngestPayload(parsed);
		const result = await options.ingest.ingest(ingestPayload);

		await reply.status(202).send({
			status: 'accepted',
			documentId: result.documentId,
			chunks: result.chunks,
			metadata: result.metadata ?? {},
			brAInwav: {
				service: BRAND_SOURCE,
				ingestedAt: new Date().toISOString(),
			},
		});
	});

	fastify.post('/rag/hier-query', async (request: FastifyRequest, reply: FastifyReply) => {
		const parsed = RagHierQuerySchema.parse(request.body);
		const baseQuery = mapQuestionPayload(parsed);

		let result: GraphRagResult;
		let metrics: { rounds: number; retrievalCalls: number; critiques: string[] } | undefined;

		if (parsed.self_rag) {
			const output = await selfRagController.run({
				initialQuery: baseQuery,
				runQuery: async (query) => options.graph.query(query),
			});
			result = output.result;
			metrics = {
				rounds: output.metrics.rounds,
				retrievalCalls: output.metrics.retrievalCalls,
				critiques: output.metrics.critiques,
			};
		} else {
			result = await options.graph.query(baseQuery);
		}

		const payload = buildHierQueryResponse(result, {
			multimodal: parsed.multimodal,
			selfRag: parsed.self_rag,
			metrics,
		});

		await reply.status(200).send(payload);
	});

	return fastify;
}

export type { RagHttpServerOptions } from './types.js';
