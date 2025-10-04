import { provideOrchestration as coreProvideOrchestration } from '@cortex-os/orchestration';
import { isPrivateHostname, safeFetchJson } from '@cortex-os/utils';
import { trace } from '@opentelemetry/api';
import { createMcpGateway, type McpGateway, type MemoriesLike } from './mcp/gateway.js';
import { ArtifactRepository } from './persistence/artifact-repository.js';
import { EvidenceRepository } from './persistence/evidence-repository.js';
import { ProfileRepository } from './persistence/profile-repository.js';
import { TaskRepository } from './persistence/task-repository.js';

const DEFAULT_IMPORTANCE = 5;

type NormalizedMemoryResponse = { data?: unknown };

function buildHeaders(apiKey?: string): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	};
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
	return headers;
}

function normalizeMemoryPayload(payload: unknown): NormalizedMemoryResponse {
	if (!payload || typeof payload !== 'object') return {};
	const record = payload as Record<string, unknown>;
	if ('success' in record) {
		if (!record.success) {
			const error = record.error as Record<string, unknown> | undefined;
			const message =
				(typeof error?.message === 'string' && error.message) ||
				(typeof record.message === 'string' && record.message) ||
				'Local Memory request failed';
			throw new Error(message);
		}
		return { data: record.data };
	}
	return { data: payload };
}

function extractStoreResult(payload: unknown): { id: string; vectorIndexed: boolean } {
	const normal = normalizeMemoryPayload(payload);
	const candidate = normal.data;
	if (candidate && typeof candidate === 'object' && 'id' in candidate) {
		const record = candidate as Record<string, unknown>;
		return {
			id: String(record.id),
			vectorIndexed: Boolean(record.vectorIndexed),
		};
	}
	if (payload && typeof payload === 'object' && 'id' in payload) {
		const record = payload as Record<string, unknown>;
		return {
			id: String(record.id),
			vectorIndexed: Boolean(record.vectorIndexed),
		};
	}
	throw new Error('Local Memory store response missing identifier');
}

function mergeMetadata(
	metadata: Record<string, unknown> | undefined,
	remoteId: string,
): Record<string, unknown> | undefined {
	if (!metadata) return { remoteId };
	if (metadata.remoteId && metadata.remoteId !== remoteId) {
		return { ...metadata, previousRemoteId: metadata.remoteId, remoteId };
	}
	return { ...metadata, remoteId };
}

function buildStorePayload(input: MemoryCreateInput) {
	return {
		content: input.content,
		importance: input.importance ?? DEFAULT_IMPORTANCE,
		tags: input.tags ?? [],
		domain: input.domain,
		metadata: input.metadata,
	};
}

function deriveSafeFetchOptions(baseUrl: string, fetchImpl: typeof fetch) {
	const parsed = new URL(baseUrl);
	const hostname = parsed.hostname.toLowerCase();
	return {
		allowedHosts: [hostname],
		allowedProtocols: [parsed.protocol],
		allowLocalhost: isPrivateHostname(hostname),
		fetchImpl,
	};
}

async function performMemoryRequest(options: {
	baseUrl: string;
	fetchImpl: typeof fetch;
	apiKey?: string;
	method: 'GET' | 'POST';
	path: string;
	body?: Record<string, unknown>;
}): Promise<unknown> {
	const { baseUrl, fetchImpl, apiKey, method, path, body } = options;
	const requestInit: RequestInit = {
		method,
		headers: buildHeaders(apiKey),
		body: body ? JSON.stringify(body) : undefined,
	};
	return safeFetchJson(`${baseUrl}${path}`, {
		...deriveSafeFetchOptions(baseUrl, fetchImpl),
		fetchOptions: requestInit,
		allowEmptyResponse: true,
		emptyResponseValue: {} as unknown,
	});
}

export interface MemoryCreateInput {
	content: string;
	id?: string;
	importance?: number;
	tags?: string[];
	domain?: string;
	metadata?: Record<string, unknown>;
}

export interface MemoryRecord extends MemoryCreateInput {
	id: string;
	vectorIndexed: boolean;
}

export interface MemoryService {
	save(input: MemoryCreateInput): Promise<MemoryRecord>;
	get(id: string): Promise<MemoryRecord | undefined>;
}

function createRemoteMemoryService(
	baseUrl: string,
	fetchImpl: typeof fetch,
	apiKey?: string,
): MemoryService {
	const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
	const cache = new Map<string, MemoryRecord>();

	const save = async (input: MemoryCreateInput): Promise<MemoryRecord> => {
		const payload = buildStorePayload(input);
		const response = await performMemoryRequest({
			baseUrl: normalizedBaseUrl,
			fetchImpl,
			apiKey,
			method: 'POST',
			path: '/memory/store',
			body: payload,
		});
		const remote = extractStoreResult(response);
		const id = input.id ?? remote.id;
		const record: MemoryRecord = {
			id,
			content: payload.content,
			importance: payload.importance,
			tags: payload.tags,
			domain: payload.domain,
			metadata: mergeMetadata(payload.metadata, remote.id),
			vectorIndexed: remote.vectorIndexed,
		};
		cache.set(id, record);
		return record;
	};

	const get = async (id: string): Promise<MemoryRecord | undefined> => {
		return cache.get(id);
	};

	return { save, get };
}

export function provideMemories(): MemoryService {
	const baseUrl = process.env.LOCAL_MEMORY_BASE_URL;
	if (!baseUrl) {
		throw new Error(
			'LOCAL_MEMORY_BASE_URL must be configured so cortex-os can reach the memory-core service.',
		);
	}
	const fetchImpl = (globalThis as { __memoryFetchStub?: typeof fetch }).__memoryFetchStub ?? fetch;
	return createRemoteMemoryService(baseUrl, fetchImpl, process.env.LOCAL_MEMORY_API_KEY);
}

export function provideOrchestration() {
	return coreProvideOrchestration();
}

export function provideTaskRepository(): TaskRepository {
	return new TaskRepository();
}

export function provideProfileRepository(): ProfileRepository {
	return new ProfileRepository();
}

export function provideArtifactRepository(): ArtifactRepository {
	return new ArtifactRepository();
}

export function provideEvidenceRepository(): EvidenceRepository {
	return new EvidenceRepository();
}

let globalPublishMcpEvent:
	| ((evt: { type: string; payload: Record<string, unknown> }) => void)
	| undefined;
let globalPublishToolEvent:
	| ((evt: { type: string; payload: Record<string, unknown> }) => void)
	| undefined;

export function setA2aPublishers(publishers: {
	publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void;
	publishToolEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void;
}) {
	globalPublishMcpEvent = publishers.publishMcpEvent ?? globalPublishMcpEvent;
	globalPublishToolEvent = publishers.publishToolEvent ?? globalPublishToolEvent;
}

export function provideMCP(opts?: {
	audit?: (e: Record<string, unknown>) => void;
	publishMcpEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void;
	publishToolEvent?: (evt: { type: string; payload: Record<string, unknown> }) => void;
}): McpGateway {
	return createMcpGateway({
		memories: provideMemories() as unknown as MemoriesLike,
		orchestration: provideOrchestration(),
		config: { runtime: {} },
		audit: opts?.audit,
		publishMcpEvent: opts?.publishMcpEvent ?? globalPublishMcpEvent,
		publishToolEvent: opts?.publishToolEvent ?? globalPublishToolEvent,
		security: {
			allowTool: (name: string) => {
				if (['system.restart_service', 'config.set'].includes(name)) {
					return process.env.CORTEX_MCP_ALLOW_MUTATIONS === 'true';
				}
				return true;
			},
		},
	});
}

// Real tracer (no-op if no SDK registered in runtime)
export const tracer = trace.getTracer('cortex-os');

export function configureAuditPublisherWithBus(
	publishMcp?: (evt: { type: string; payload: Record<string, unknown> }) => void,
) {
	if (!publishMcp) return { publishMcpEvent: undefined };
	return { publishMcpEvent: publishMcp };
}
