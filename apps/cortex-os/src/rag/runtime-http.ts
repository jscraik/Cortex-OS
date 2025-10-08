import { createServer } from '@cortex-os/rag-http';
import type { FastifyInstance } from 'fastify';
import {
	GraphRAGIngestService,
	GraphRAGService,
	createGraphRAGIngestService,
	createGraphRAGService,
} from '@cortex-os/memory-core';
import { createGraphRagEmbeddings } from './embeddings.js';
import type { ShutdownResult } from '../operational/shutdown-result.js';

export interface RagSurfaceConfig {
	host: string;
	port: number;
	chunkSize?: number;
	enableNeo4j: boolean;
}

export interface RagSurfaceHandle {
	server: FastifyInstance;
	service: GraphRAGService;
	ingest: GraphRAGIngestService;
	url: string;
	beginShutdown(options?: { timeoutMs?: number }): Promise<ShutdownResult>;
	close: () => Promise<void>;
}

export async function startRagHttpSurface(config: RagSurfaceConfig): Promise<RagSurfaceHandle> {
	const embeddings = createGraphRagEmbeddings();
	const service = createGraphRAGService();
	const ingest = createGraphRAGIngestService({
		chunkSize: config.chunkSize,
		neo4j: { enabled: config.enableNeo4j },
	});

	await service.initialize(embeddings.dense, embeddings.sparse);
	await ingest.initialize(embeddings.dense, embeddings.sparse);

	const server = createServer({ graph: service, ingest });

	let activeRequests = 0;
	let shuttingDown = false;
	let serverClosed = false;
	let shutdownPromise: Promise<ShutdownResult> | undefined;
	let shutdownResultPromise: Promise<ShutdownResult> | undefined;
	let resolveShutdown: ((result: ShutdownResult) => void) | undefined;
	let shutdownTimer: NodeJS.Timeout | undefined;
	let resourcesClosed = false;

	const pendingRequests = () => activeRequests;

	const closeCandidate = async (candidate: unknown) => {
		if (
			candidate &&
			typeof candidate === 'object' &&
			'close' in candidate &&
			typeof (candidate as { close?: unknown }).close === 'function'
		) {
			await (candidate as { close: () => Promise<unknown> | unknown }).close();
		}
	};

	const closeResources = async () => {
		if (resourcesClosed) return;
		resourcesClosed = true;
		await Promise.allSettled([
			service.close(),
			ingest.close(),
			closeCandidate(embeddings.dense),
			closeCandidate(embeddings.sparse),
		]);
	};

	const completeShutdown = (completed: boolean) => {
		if (!resolveShutdown) return;
		if (!completed) {
			serverClosed = true;
		}
		const resolver = resolveShutdown;
		resolveShutdown = undefined;
		if (shutdownTimer) {
			clearTimeout(shutdownTimer);
			shutdownTimer = undefined;
		}
		resolver({ completed, pendingRequests: pendingRequests() });
	};

	const checkShutdownCompletion = () => {
		if (!shuttingDown || !serverClosed) return;
		if (pendingRequests() === 0) {
			completeShutdown(true);
		}
	};

	server.addHook('onRequest', async (_request, reply) => {
		if (shuttingDown) {
			reply.code(503).send({
				status: 'unavailable',
				message: 'brAInwav: RAG surface shutting down',
				timestamp: new Date().toISOString(),
			});
			return reply;
		}

		activeRequests += 1;
		let finished = false;
		const finalize = () => {
			if (finished) return;
			finished = true;
			activeRequests = Math.max(0, activeRequests - 1);
			checkShutdownCompletion();
		};

		const raw = reply.raw;
		raw.once('finish', finalize);
		raw.once('close', finalize);
		raw.once('error', finalize);
	});

	try {
		await server.listen({ host: config.host, port: config.port });
	} catch (error) {
		await Promise.allSettled([server.close(), service.close(), ingest.close()]);
		throw error;
	}

	const boundPort = resolveBoundPort(server, config.port);
	const displayHost = config.host === '0.0.0.0' ? '127.0.0.1' : config.host;
	const url = `http://${displayHost}:${boundPort}`;

	const beginShutdown = ({ timeoutMs = 30_000 }: { timeoutMs?: number } = {}): Promise<ShutdownResult> => {
		if (shutdownResultPromise) {
			return shutdownResultPromise;
		}

		if (!shutdownPromise) {
			shuttingDown = true;
			shutdownPromise = new Promise<ShutdownResult>((resolve) => {
				resolveShutdown = resolve;
				if (timeoutMs >= 0) {
					shutdownTimer = setTimeout(() => completeShutdown(false), timeoutMs);
				}
			});

			server
				.close()
				.then(() => {
					serverClosed = true;
					checkShutdownCompletion();
				})
				.catch((error) => {
					serverClosed = true;
					console.warn('brAInwav RAG shutdown: server close error', error);
					completeShutdown(false);
				});
		}

		shutdownResultPromise = shutdownPromise.then(async (result) => {
			await closeResources();
			return result;
		});

		return shutdownResultPromise;
	};

	return {
		server,
		service,
		ingest,
		url,
		beginShutdown,
		close: async () => {
			await beginShutdown({ timeoutMs: 0 });
		},
	};
}

function resolveBoundPort(instance: FastifyInstance, fallback: number): number {
	const addresses = instance.addresses?.();
	if (Array.isArray(addresses) && addresses.length > 0) {
		const first = addresses[0];
		if (first && typeof first === 'object' && typeof (first as { port?: number }).port === 'number') {
			return (first as { port: number }).port;
		}
	}

	const addressInfo = instance.server.address();
	if (addressInfo && typeof addressInfo === 'object' && 'port' in addressInfo) {
		return (addressInfo as { port: number }).port;
	}

	return fallback;
}
