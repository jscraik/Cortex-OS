import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { performance } from 'node:perf_hooks';
import { URL } from 'node:url';
import type { ObservabilityBus } from '@cortex-os/observability';
import { OBSERVABILITY_EVENT_TYPES } from '@cortex-os/observability';
import type {
	OrchestrationFacade,
	RoutingDecision,
	RoutingRequest,
} from '@cortex-os/orchestration';
import { ALLOWED_ORIGINS } from '@cortex-os/security';
import { z } from 'zod';
import { createRequestId, logHttpError, logHttpInfo } from '../observability/logger.js';
import {
	getMetricsContentType,
	getMetricsSnapshot,
	recordHttpMetrics,
} from '../observability/metrics.js';
import { completeHttpTrace, startHttpTrace } from '../observability/tracing.js';
import { createHealthService, type HealthService } from '../operational/health-service.js';
import type { ShutdownResult } from '../operational/shutdown-result.js';
import type { ArtifactRepository } from '../persistence/artifact-repository.js';
import { OptimisticLockError } from '../persistence/errors.js';
import type { EvidenceRepository, SaveEvidenceInput } from '../persistence/evidence-repository.js';
import type { ProfileRecord, ProfileRepository } from '../persistence/profile-repository.js';
import type { TaskRecord, TaskRepository } from '../persistence/task-repository.js';
import {
	loadRunRecord,
	REQUIRED_FILES,
	RunBundleNotFoundError,
	RunBundleValidationError,
	streamRunBundleArchive,
} from '../run-bundle/exporter.js';
import { resolveRunPath } from '../run-bundle/paths.js';
import { AuthHttpError, authenticateRequest } from '../security/auth.js';

export interface RuntimeHttpServer {
	listen(port: number, host?: string): Promise<{ port: number }>;
	close(): Promise<void>;
	beginShutdown(options?: { timeoutMs?: number }): Promise<ShutdownResult>;
	broadcast(event: { type: string; data: unknown }): void;
	dependencies: RuntimeHttpDependencies;
}

export interface RuntimeHttpDependencies {
	tasks: TaskRepository;
	profiles: ProfileRepository;
	artifacts: ArtifactRepository;
	evidence: EvidenceRepository;
	orchestration: OrchestrationFacade;
	observability?: ObservabilityBus;
}

interface RequestLifecycleControl {
	isShuttingDown(): boolean;
	sendUnavailable(res: ServerResponse): void;
}

const SERVICE_NAME = 'cortex-os/runtime-http';

class HttpError extends Error {
	public code: string;
	constructor(
		public status: number,
		message: string,
		code?: string,
	) {
		super(message);
		this.name = 'HttpError';
		this.code = code ?? 'HTTP_ERROR';
	}
}

const CORS_ALLOWED_METHODS = 'GET,POST,PUT,DELETE,OPTIONS';
const CORS_ALLOWED_HEADERS = 'Content-Type, Authorization, Accept';

const RUN_ID_SCHEMA = z
	.string()
	.min(1)
	.max(128)
	.regex(/^[A-Za-z0-9._-]+$/);

/**
 * Apply CORS headers with whitelist validation
 * CodeQL Fix #213, #212: Replaces origin reflection with whitelist validation
 * @param req - Incoming HTTP request
 * @param res - Server response
 */
function applyCors(req: IncomingMessage, res: ServerResponse): void {
	const requestOrigin = req.headers.origin;

	// Validate origin against whitelist
	const allowedOrigin =
		requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]; // Default to first allowed origin

	res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
	res.setHeader('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS);
	res.setHeader(
		'Access-Control-Allow-Headers',
		req.headers['access-control-request-headers'] ?? CORS_ALLOWED_HEADERS,
	);
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Vary', 'Origin');
}

function handleCorsPreflight(req: IncomingMessage, res: ServerResponse): boolean {
	if (req.method !== 'OPTIONS') return false;
	applyCors(req, res);
	res.writeHead(204);
	res.end();
	return true;
}

export function createRuntimeHttpServer(dependencies: RuntimeHttpDependencies): RuntimeHttpServer {
	const clients = new Set<ServerResponse>();
	const healthService = createHealthService(dependencies);

	let activeRequests = 0;
	let shuttingDown = false;
	let shutdownPromise: Promise<ShutdownResult> | undefined;
	let resolveShutdown: ((result: ShutdownResult) => void) | undefined;
	let shutdownTimer: NodeJS.Timeout | undefined;

	const pendingRequests = () => activeRequests + clients.size;

	const completeShutdown = (completed: boolean) => {
		if (!resolveShutdown) return;
		const resolver = resolveShutdown;
		resolveShutdown = undefined;
		if (shutdownTimer) {
			clearTimeout(shutdownTimer);
			shutdownTimer = undefined;
		}
		resolver({ completed, pendingRequests: pendingRequests() });
	};

	const checkShutdownCompletion = () => {
		if (!shuttingDown) return;
		if (pendingRequests() === 0) {
			completeShutdown(true);
		}
	};

	const trackRequest = (res: ServerResponse) => {
		activeRequests += 1;
		let finished = false;
		const finalize = () => {
			if (finished) return;
			finished = true;
			activeRequests = Math.max(0, activeRequests - 1);
			checkShutdownCompletion();
		};
		res.once('close', finalize);
		res.once('finish', finalize);
		res.once('error', finalize);
	};

	const sendUnavailable = (res: ServerResponse) => {
		sendJson(res, 503, {
			status: 'unavailable',
			message: 'brAInwav: runtime shutting down',
			timestamp: new Date().toISOString(),
		});
	};

	const signalClients = () => {
		const payload = 'event: shutdown\ndata: {"message":"brAInwav: runtime shutting down"}\n\n';
		for (const client of [...clients]) {
			try {
				client.write(payload);
			} catch (error) {
				console.warn('brAInwav shutdown: SSE client close failed', error);
			}
			clients.delete(client);
			client.end();
		}
		checkShutdownCompletion();
	};

	const onClientClosed = () => {
		checkShutdownCompletion();
	};

	const server = createServer((req, res) => {
		void (async () => {
			const requestId = createRequestId();
			const method = (req.method ?? 'UNKNOWN').toUpperCase();
			const startTime = performance.now();
			let path = '/unknown';
			let errorMessage: string | undefined;
			let traceContext: ReturnType<typeof startHttpTrace> | undefined;

			trackRequest(res);

			try {
				if (!req.url) {
					throw new HttpError(400, 'Request URL missing');
				}

				const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
				path = normalizePath(url.pathname);

				if (handleCorsPreflight(req, res)) {
					return;
				}

				applyCors(req, res);

				traceContext = startHttpTrace(
					dependencies.observability,
					`HTTP ${method} ${path}`,
					SERVICE_NAME,
					{ method, path, requestId },
				);

				await handleRequest(
					req,
					res,
					clients,
					dependencies,
					healthService,
					{
						isShuttingDown: () => shuttingDown,
						sendUnavailable,
					},
					onClientClosed,
					url,
				);
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : String(error);
				handleError(res, error);
			} finally {
				const durationMs = performance.now() - startTime;
				const status = res.statusCode ?? 500;

				recordHttpMetrics({
					service: SERVICE_NAME,
					method,
					path,
					status,
					durationMs,
				});

				if (dependencies.observability) {
					const timestamp = new Date().toISOString();
					void dependencies.observability
						.publish(OBSERVABILITY_EVENT_TYPES.METRIC_RECORDED, {
							name: 'http.server.duration_ms',
							value: durationMs,
							type: 'histogram',
							timestamp,
							tags: {
								service: SERVICE_NAME,
								method,
								path,
								status: String(status),
							},
						})
						.catch((publishError) => {
							console.warn('brAInwav observability: metric publish failed', publishError);
						});
				}

				if (status >= 500 && errorMessage) {
					logHttpError({
						service: SERVICE_NAME,
						method,
						path,
						status,
						durationMs,
						requestId,
						error: errorMessage,
					});
				}

				logHttpInfo({
					service: SERVICE_NAME,
					method,
					path,
					status,
					durationMs,
					requestId,
					message: errorMessage ? 'HTTP request completed with error' : 'HTTP request completed',
					metadata: { shuttingDown },
				});

				if (traceContext) {
					completeHttpTrace(dependencies.observability, traceContext, durationMs, status < 500);
				}
			}
		})();
	});

	const beginShutdown = ({
		timeoutMs = 30_000,
	}: {
		timeoutMs?: number;
	} = {}): Promise<ShutdownResult> => {
		if (shutdownPromise) {
			return shutdownPromise;
		}
		shuttingDown = true;
		signalClients();
		server.close((error) => {
			if (error) {
				console.warn('brAInwav runtime shutdown: server close error', error);
			}
			checkShutdownCompletion();
		});
		shutdownPromise = new Promise<ShutdownResult>((resolve) => {
			resolveShutdown = resolve;
			if (timeoutMs >= 0) {
				shutdownTimer = setTimeout(() => completeShutdown(false), timeoutMs);
			}
			checkShutdownCompletion();
		});
		return shutdownPromise;
	};

	return {
		dependencies,
		async listen(port, host = '127.0.0.1') {
			await new Promise<void>((resolve) => {
				server.listen(port, host, () => resolve());
			});
			const address = server.address();
			if (address && typeof address === 'object') {
				return { port: address.port };
			}
			return { port };
		},
		async close() {
			await beginShutdown({ timeoutMs: 0 });
		},
		beginShutdown,
		broadcast(event) {
			const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
			for (const client of clients) {
				client.write(payload);
			}
		},
	};
}

async function handleRequest(
	req: IncomingMessage,
	res: ServerResponse,
	clients: Set<ServerResponse>,
	dependencies: RuntimeHttpDependencies,
	health: HealthService,
	lifecycle: RequestLifecycleControl,
	onClientClosed: () => void,
	url: URL,
): Promise<void> {
	if (lifecycle.isShuttingDown()) {
		lifecycle.sendUnavailable(res);
		return;
	}

	if (req.method === 'GET' && url.pathname === '/health') {
		await respondWithHealth(res, health);
		return;
	}

	if (req.method === 'GET' && (url.pathname === '/ready' || url.pathname === '/health/ready')) {
		await respondWithReadiness(res, health);
		return;
	}

	if (req.method === 'GET' && (url.pathname === '/live' || url.pathname === '/health/live')) {
		respondWithLiveness(res, health);
		return;
	}

	if (req.method === 'GET' && url.pathname === '/metrics') {
		await handleMetrics(res);
		return;
	}

	if (
		req.method === 'GET' &&
		url.pathname === '/v1/events' &&
		url.searchParams.get('stream') === 'sse'
	) {
		handleSse(req, res, clients, onClientClosed);
		return;
	}

	if (url.pathname.startsWith('/v1/')) {
		await handleApiRequest(req, res, url, dependencies);
		return;
	}

	sendNotFound(res, 'Route not found', { path: url.pathname, method: req.method });
}

async function handleApiRequest(
	req: IncomingMessage,
	res: ServerResponse,
	url: URL,
	dependencies: RuntimeHttpDependencies,
): Promise<void> {
	if (process.env.VITEST_DEBUG?.includes('runtime-http')) {
		console.debug('[runtime-http] request', req.method, url.pathname);
	}
	// Authenticate all API requests under /v1/* (except SSE handled earlier)
	const authHeaderRaw = req.headers.authorization;
	const authorizationHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
	await authenticateRequest({
		authorizationHeader,
		clientIp: req.socket.remoteAddress ?? '',
	});

	const segments = url.pathname.split('/').filter(Boolean);
	if (segments.length < 2) {
		sendNotFound(res, 'Invalid API path');
		return;
	}

	const resource = segments[1];

	switch (resource) {
		case 'tasks':
			await handleTasksRoute(req, res, url, segments, dependencies.tasks);
			return;
		case 'profiles':
			await handleProfilesRoute(req, res, url, segments, dependencies.profiles);
			return;
		case 'artifacts':
			await handleArtifactsRoute(req, res, url, segments, dependencies.artifacts);
			return;
		case 'routing':
			await handleRoutingRoute(req, res, url, segments, dependencies.orchestration);
			return;
		case 'evidence':
			await handleEvidenceRoute(req, res, url, segments, dependencies.evidence);
			return;
		case 'runs':
			await handleRunsRoute(req, res, segments);
			return;
		default:
			sendNotFound(res, `Unknown resource '${resource}'`);
	}
}

async function handleTasksRoute(
	req: IncomingMessage,
	res: ServerResponse,
	_url: URL,
	segments: string[],
	tasks: TaskRepository,
): Promise<void> {
	if (segments.length === 2) {
		if (req.method === 'GET') {
			const entries = await tasks.list();
			sendJson(res, 200, { tasks: entries });
			return;
		}

		if (req.method === 'POST') {
			const body = await readJsonBody(req);
			const task = (body as { task?: Partial<TaskRecord> })?.task;
			if (!task || typeof task !== 'object') {
				throw new HttpError(400, 'task payload required');
			}
			if (typeof task.id !== 'string' || task.id.trim().length === 0) {
				throw new HttpError(400, 'task id required');
			}
			const saved = await tasks.save(task as TaskRecord);
			sendJson(res, 201, { task: saved.record, digest: saved.digest });
			return;
		}
	}

	if (segments.length === 3) {
		const id = segments[2];

		if (req.method === 'GET') {
			const entry = await tasks.get(id);
			if (!entry) throw new HttpError(404, 'Task not found');
			sendJson(res, 200, { task: entry.record, digest: entry.digest });
			return;
		}

		if (req.method === 'PUT') {
			const body = (await readJsonBody(req)) as {
				expectedDigest?: string;
				mode?: 'replace' | 'merge';
				record?: Partial<TaskRecord>;
				patch?: Partial<TaskRecord>;
			};
			const expectedDigest: string | undefined = body?.expectedDigest;
			const mode = body?.mode ?? (body?.record ? 'replace' : 'merge');

			if (mode === 'replace') {
				const record = body?.record;
				if (!record || typeof record !== 'object') {
					throw new HttpError(400, 'record payload required for replace');
				}
				record.id = id;
				const entry = await tasks.replace(id, record as TaskRecord, { expectedDigest });
				sendJson(res, 200, { task: entry.record, digest: entry.digest });
				return;
			}

			const patch = body?.patch;
			if (!patch || typeof patch !== 'object') {
				throw new HttpError(400, 'patch payload required for merge');
			}
			const entry = await tasks.update(id, patch, { expectedDigest });
			if (!entry) throw new HttpError(404, 'Task not found');
			sendJson(res, 200, { task: entry.record, digest: entry.digest });
			return;
		}

		if (req.method === 'DELETE') {
			await tasks.delete(id);
			sendNoContent(res);
			return;
		}
	}

	sendNotFound(res, 'Unsupported task route');
}

async function handleProfilesRoute(
	req: IncomingMessage,
	res: ServerResponse,
	_url: URL,
	segments: string[],
	profiles: ProfileRepository,
): Promise<void> {
	if (segments.length === 2) {
		if (req.method === 'GET') {
			const entries = await profiles.list();
			sendJson(res, 200, { profiles: entries });
			return;
		}

		if (req.method === 'POST') {
			const body = await readJsonBody(req);
			const profile = (body as { profile?: Partial<ProfileRecord> })?.profile;
			if (!profile || typeof profile !== 'object')
				throw new HttpError(400, 'profile payload required');
			if (!profile.id) profile.id = randomUUID();
			const saved = await profiles.save(profile as ProfileRecord);
			sendJson(res, 201, { profile: saved.record, digest: saved.digest });
			return;
		}
	}

	if (segments.length === 3) {
		const id = segments[2];

		if (req.method === 'GET') {
			const entry = await profiles.get(id);
			if (!entry) throw new HttpError(404, 'Profile not found');
			sendJson(res, 200, { profile: entry.record, digest: entry.digest });
			return;
		}

		if (req.method === 'PUT') {
			const body = (await readJsonBody(req)) as {
				expectedDigest?: string;
				mode?: 'replace' | 'merge';
				profile?: Partial<ProfileRecord>;
				patch?: Partial<ProfileRecord>;
			};
			const expectedDigest: string | undefined = body?.expectedDigest;
			const mode = body?.mode ?? (body?.profile ? 'replace' : 'merge');

			if (mode === 'replace') {
				const profile = body?.profile;
				if (!profile || typeof profile !== 'object') {
					throw new HttpError(400, 'profile payload required for replace');
				}
				profile.id = id;
				const entry = await profiles.replace(id, profile as ProfileRecord, { expectedDigest });
				sendJson(res, 200, { profile: entry.record, digest: entry.digest });
				return;
			}

			const patch = body?.patch;
			if (!patch || typeof patch !== 'object') {
				throw new HttpError(400, 'patch payload required for merge');
			}
			const entry = await profiles.update(id, patch, { expectedDigest });
			if (!entry) throw new HttpError(404, 'Profile not found');
			sendJson(res, 200, { profile: entry.record, digest: entry.digest });
			return;
		}

		if (req.method === 'DELETE') {
			await profiles.delete(id);
			sendNoContent(res);
			return;
		}
	}

	sendNotFound(res, 'Unsupported profile route');
}

async function handleArtifactsRoute(
	req: IncomingMessage,
	res: ServerResponse,
	url: URL,
	segments: string[],
	artifacts: ArtifactRepository,
): Promise<void> {
	if (segments.length === 2) {
		if (req.method === 'GET') {
			const filter = {
				taskId: url.searchParams.get('taskId') ?? undefined,
				tag: url.searchParams.get('tag') ?? undefined,
				filename: url.searchParams.get('filename') ?? undefined,
			};
			const list = await artifacts.list(filter);
			sendJson(res, 200, { artifacts: list });
			return;
		}

		if (req.method === 'POST') {
			const body = (await readJsonBody(req)) as {
				artifact?: {
					id?: string;
					filename?: string;
					contentType?: string;
					base64Payload?: string;
					taskId?: string;
					tags?: string[];
				};
			};
			const artifact = body?.artifact;
			if (!artifact || typeof artifact !== 'object')
				throw new HttpError(400, 'artifact payload required');
			const base64 = artifact.base64Payload;
			if (typeof base64 !== 'string') throw new HttpError(400, 'base64Payload required');
			if (typeof artifact.filename !== 'string') throw new HttpError(400, 'filename required');
			if (typeof artifact.contentType !== 'string')
				throw new HttpError(400, 'contentType required');
			const binary = Buffer.from(base64, 'base64');
			const saved = await artifacts.save({
				id: artifact.id,
				filename: artifact.filename,
				contentType: artifact.contentType,
				binary,
				taskId: artifact.taskId,
				tags: artifact.tags,
			});
			sendJson(res, 201, { metadata: saved, digest: saved.digest });
			return;
		}
	}

	if (segments.length === 3) {
		const id = segments[2];

		if (req.method === 'GET') {
			const record = await artifacts.get(id);
			if (!record) throw new HttpError(404, 'Artifact not found');
			sendJson(res, 200, {
				metadata: record.metadata,
				base64Payload: record.binary.toString('base64'),
			});
			return;
		}

		if (req.method === 'PUT') {
			const body = (await readJsonBody(req)) as {
				artifact?: {
					filename?: string;
					contentType?: string;
					base64Payload?: string;
					taskId?: string;
					tags?: string[];
				};
				expectedDigest?: string;
			};
			const artifact = body?.artifact;
			if (!artifact || typeof artifact !== 'object')
				throw new HttpError(400, 'artifact payload required');
			const base64 = artifact.base64Payload;
			if (typeof base64 !== 'string') throw new HttpError(400, 'base64Payload required');
			if (typeof artifact.filename !== 'string') throw new HttpError(400, 'filename required');
			if (typeof artifact.contentType !== 'string')
				throw new HttpError(400, 'contentType required');
			const binary = Buffer.from(base64, 'base64');
			const saved = await artifacts.save({
				id,
				filename: artifact.filename,
				contentType: artifact.contentType,
				binary,
				taskId: artifact.taskId,
				tags: artifact.tags,
				expectedDigest: body?.expectedDigest,
			});
			sendJson(res, 200, { metadata: saved, digest: saved.digest });
			return;
		}

		if (req.method === 'DELETE') {
			await artifacts.delete(id);
			sendNoContent(res);
			return;
		}
	}

	sendNotFound(res, 'Unsupported artifact route');
}

type OrchestrationRouter = OrchestrationFacade['router'];

async function handleRoutingRoute(
	req: IncomingMessage,
	res: ServerResponse,
	_url: URL,
	segments: string[],
	orchestration: OrchestrationFacade,
): Promise<void> {
	const router = orchestration?.router;
	if (!router) {
		throw new HttpError(503, 'Routing service unavailable', 'ROUTING_UNAVAILABLE');
	}
	if (segments.length === 3 && segments[2] === 'dry-run') {
		await handleRoutingDryRun(req, res, router);
		return;
	}
	if (segments.length === 4 && segments[2] === 'explain') {
		await handleRoutingExplain(req, res, segments[3], router);
		return;
	}
	sendNotFound(res, 'Unsupported routing route');
}

async function handleRoutingDryRun(
	req: IncomingMessage,
	res: ServerResponse,
	router: OrchestrationRouter,
): Promise<void> {
	if (req.method !== 'POST') {
		throw new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
	}
	const body = await readJsonBody(req);
	const request = buildRoutingRequest(body);
	try {
		const decision = await router.route(request);
		sendJson(res, 200, { decision });
	} catch (error) {
		const mapped = mapRoutingError(error);
		if (mapped) throw mapped;
		throw error;
	}
}

async function handleRoutingExplain(
	req: IncomingMessage,
	res: ServerResponse,
	requestId: string,
	router: OrchestrationRouter,
): Promise<void> {
	if (req.method !== 'GET') {
		throw new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
	}
	const decision: RoutingDecision | undefined = router.explain(requestId);
	if (!decision) {
		sendNotFound(res, 'Routing decision not found', { requestId });
		return;
	}
	sendJson(res, 200, { decision });
}

function buildRoutingRequest(payload: unknown): RoutingRequest {
	const candidate =
		payload && typeof payload === 'object' && !Array.isArray(payload)
			? (payload as Record<string, unknown>)
			: {};
	const metadata = parseRoutingMetadata(candidate.metadata);
	return {
		requestId: getStringField(candidate.requestId),
		interfaceId:
			getStringField(candidate.interfaceId) ?? getStringField(candidate.interface) ?? 'cli',
		capabilities: toStringArray(candidate.capabilities),
		tags: toStringArray(candidate.tags),
		source: getStringField(candidate.source) ?? 'runtime-http',
		command: getStringField(candidate.command),
		env: getStringField(candidate.env),
		operation: getStringField(candidate.operation),
		metadata,
	};
}

function getStringField(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	const unique = new Set<string>();
	for (const entry of value) {
		if (typeof entry === 'string') {
			const trimmed = entry.trim();
			if (trimmed.length > 0) unique.add(trimmed);
		}
	}
	return Array.from(unique);
}

function parseRoutingMetadata(value: unknown): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	if (Array.isArray(value) || typeof value !== 'object') {
		throw new HttpError(400, 'metadata must be an object', 'ROUTING_METADATA_INVALID');
	}
	return { ...(value as Record<string, unknown>) };
}

function mapRoutingError(error: unknown): HttpError | undefined {
	if (!(error instanceof Error)) return undefined;
	const message = error.message;
	if (message === 'routing_policy:not_loaded') {
		return new HttpError(503, 'Routing policy not loaded', 'ROUTING_POLICY_NOT_LOADED');
	}
	if (message.startsWith('routing_policy:interface_missing:')) {
		const parts = message.split(':');
		const interfaceId = parts[parts.length - 1] ?? 'unknown';
		return new HttpError(
			404,
			`Routing interface '${interfaceId}' not found`,
			'ROUTING_INTERFACE_NOT_FOUND',
		);
	}
	return undefined;
}

async function handleEvidenceRoute(
	req: IncomingMessage,
	res: ServerResponse,
	url: URL,
	segments: string[],
	evidence: EvidenceRepository,
): Promise<void> {
	if (segments.length === 2) {
		if (req.method === 'GET') {
			const filter = {
				taskId: url.searchParams.get('taskId') ?? undefined,
				type: url.searchParams.get('type') ?? undefined,
				tag: url.searchParams.get('tag') ?? undefined,
			};
			const list = await evidence.list(filter);
			sendJson(res, 200, { evidence: list });
			return;
		}

		if (req.method === 'POST') {
			const body = (await readJsonBody(req)) as { evidence?: Partial<SaveEvidenceInput> };
			const record = body?.evidence;
			if (!record || typeof record !== 'object')
				throw new HttpError(400, 'evidence payload required');
			const saved = await evidence.save(record as SaveEvidenceInput);
			sendJson(res, 201, { evidence: saved.record, digest: saved.digest });
			return;
		}
	}

	if (segments.length === 3) {
		const id = segments[2];

		if (req.method === 'GET') {
			const entry = await evidence.get(id);
			if (!entry) throw new HttpError(404, 'Evidence not found');
			sendJson(res, 200, { evidence: entry.record, digest: entry.digest });
			return;
		}

		if (req.method === 'PUT') {
			const body = (await readJsonBody(req)) as {
				evidence?: Partial<SaveEvidenceInput>;
				expectedDigest?: string;
			};
			const record = body?.evidence;
			if (!record || typeof record !== 'object')
				throw new HttpError(400, 'evidence payload required');
			const saved = await evidence.save(
				{ ...(record as SaveEvidenceInput), id },
				{ expectedDigest: body?.expectedDigest },
			);
			sendJson(res, 200, { evidence: saved.record, digest: saved.digest });
			return;
		}

		if (req.method === 'DELETE') {
			await evidence.delete(id);
			sendNoContent(res);
			return;
		}
	}

	sendNotFound(res, 'Unsupported evidence route');
}

async function handleRunsRoute(
	req: IncomingMessage,
	res: ServerResponse,
	segments: string[],
): Promise<void> {
	if (segments.length === 4 && segments[3] === 'bundle') {
		if (req.method !== 'GET') {
			throw new HttpError(405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
		}
		const idResult = RUN_ID_SCHEMA.safeParse(segments[2]);
		if (!idResult.success) {
			throw new HttpError(400, 'Invalid run identifier', 'RUN_ID_INVALID');
		}
		const runId = idResult.data;
		const runDir = resolveRunPath(runId);

		let summary: Awaited<ReturnType<typeof loadRunRecord>>;
		try {
			summary = await loadRunRecord(runDir);
		} catch (error) {
			if (error instanceof RunBundleNotFoundError) {
				throw new HttpError(404, error.message, 'RUN_BUNDLE_NOT_FOUND');
			}
			if (error instanceof RunBundleValidationError) {
				throw new HttpError(422, error.message, 'RUN_BUNDLE_INVALID');
			}
			throw error;
		}

		if (summary.id !== runId) {
			throw new HttpError(409, 'Run metadata mismatch', 'RUN_ID_MISMATCH');
		}

		if (summary.status === 'running') {
			throw new HttpError(409, 'Run bundle not finalized', 'RUN_NOT_FINALIZED');
		}

		res.writeHead(200, {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${runId}.pbrun"`,
			'Cache-Control': 'no-store',
			'X-Run-Id': runId,
			'X-Run-Status': summary.status,
			'X-Run-Started-At': summary.startedAt ?? '',
			'X-Run-Finished-At': summary.finishedAt ?? '',
			'X-Run-Duration-Ms': summary.durationMs !== undefined ? String(summary.durationMs) : '0',
			'X-Run-Prompt-Count': summary.promptCount !== undefined ? String(summary.promptCount) : '0',
			'X-Run-Message-Count':
				summary.messageCount !== undefined ? String(summary.messageCount) : '0',
			'X-Run-Energy-Sample-Count':
				summary.energySampleCount !== undefined ? String(summary.energySampleCount) : '0',
			'X-Run-Bundle-Entries': String(REQUIRED_FILES.length),
		});

		try {
			await streamRunBundleArchive({ runDir, output: res });
		} catch (error) {
			if (!res.headersSent) {
				throw error;
			}
			res.destroy(error as Error);
		}
		return;
	}

	sendNotFound(res, 'Unsupported runs route');
}

async function respondWithHealth(res: ServerResponse, health: HealthService) {
	const { statusCode, payload } = await health.checkHealth();
	sendJson(res, statusCode, payload);
}

async function respondWithReadiness(res: ServerResponse, health: HealthService) {
	const { statusCode, payload } = await health.checkReadiness();
	sendJson(res, statusCode, payload);
}

function respondWithLiveness(res: ServerResponse, health: HealthService) {
	const { statusCode, payload } = health.checkLiveness();
	sendJson(res, statusCode, payload);
}

function handleSse(
	req: IncomingMessage,
	res: ServerResponse,
	clients: Set<ServerResponse>,
	onClientClosed: () => void,
) {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
	});

	clients.add(res);
	res.write('event: heartbeat\n');
	res.write(`data: {"ts":"${new Date().toISOString()}"}\n\n`);

	const onClose = () => {
		clients.delete(res);
		onClientClosed();
	};

	req.on('close', onClose);
	req.on('aborted', onClose);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
	const body = await readBody(req);
	if (!body) return {};
	try {
		return JSON.parse(body);
	} catch (error) {
		// Provide a helpful parse error for clients
		console.warn('Invalid JSON body', error);
		throw new HttpError(400, 'Invalid JSON body', 'INVALID_JSON');
	}
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		let data = '';
		req.setEncoding('utf8');
		req.on('data', (chunk) => {
			data += chunk;
		});
		req.on('end', () => resolve(data));
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(body),
	});
	res.end(body);
}

function _sendText(res: ServerResponse, status: number, body: string): void {
	res.writeHead(status, {
		'Content-Type': 'text/plain; version=0.0.4',
		'Content-Length': Buffer.byteLength(body),
	});
	res.end(body);
}

async function handleMetrics(res: ServerResponse): Promise<void> {
	try {
		const snapshot = await getMetricsSnapshot();
		res.writeHead(200, {
			'Content-Type': getMetricsContentType(),
			'Content-Length': Buffer.byteLength(snapshot),
		});
		res.end(snapshot);
	} catch (error) {
		console.warn('brAInwav metrics: failed to collect snapshot', error);
		sendJson(res, 500, {
			status: 'error',
			message: 'brAInwav: failed to collect metrics snapshot',
			timestamp: new Date().toISOString(),
		});
	}
}

function sendNoContent(res: ServerResponse): void {
	res.writeHead(204);
	res.end();
}

function normalizePath(pathname: string): string {
	if (!pathname || pathname === '/') return '/';
	const segments = pathname
		.split('/')
		.filter(Boolean)
		.map((segment) => {
			if (/^\d+$/.test(segment)) return ':param';
			if (/^[0-9a-f-]{12,}$/i.test(segment)) return ':param';
			return segment;
		});
	return segments.length > 0 ? `/${segments.join('/')}` : '/';
}

function sendNotFound(
	res: ServerResponse,
	message: string,
	meta: Record<string, unknown> = {},
): void {
	if (process.env.VITEST_DEBUG?.includes('runtime-http')) {
		console.debug('[runtime-http] not-found', message, meta);
	}
	sendJson(res, 404, { error: 'NotFound', code: 'NOT_FOUND', message, ...meta });
}

function handleError(res: ServerResponse, error: unknown): void {
	if (process.env.VITEST_DEBUG?.includes('runtime-http')) {
		console.error('[runtime-http] error', error);
	}
	if (res.headersSent) {
		res.end();
		return;
	}

	if (error instanceof AuthHttpError) {
		sendJson(res, error.statusCode, {
			error: 'AuthError',
			code: error.code,
			message: error.message,
			// expose any structured body fields to help clients (safe metadata only)
			...error.body,
		});
		return;
	}

	if (error instanceof HttpError) {
		sendJson(res, error.status, { error: error.name, code: error.code, message: error.message });
		return;
	}

	if (error instanceof OptimisticLockError) {
		sendJson(res, 409, {
			error: 'OptimisticLockError',
			code: 'OPTIMISTIC_LOCK',
			message: error.message,
			expected: error.expected,
			actual: error.actual,
		});
		return;
	}

	console.error('Unhandled HTTP error', error);
	sendJson(res, 500, {
		error: 'InternalError',
		code: 'INTERNAL_ERROR',
		message: 'Unexpected server error',
	});
}
