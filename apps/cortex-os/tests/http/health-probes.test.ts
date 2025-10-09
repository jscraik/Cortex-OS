import type { OrchestrationFacade } from '@cortex-os/orchestration';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRuntimeHttpServer, type RuntimeHttpServer } from '../../src/http/runtime-server.js';
import { resetMetricsForTest } from '../../src/observability/metrics.js';
import type { ArtifactRepository } from '../../src/persistence/artifact-repository.js';
import type { EvidenceRepository } from '../../src/persistence/evidence-repository.js';
import type { ProfileRepository } from '../../src/persistence/profile-repository.js';
import type { TaskRepository } from '../../src/persistence/task-repository.js';

interface TestServer {
	server: RuntimeHttpServer;
	url: string;
}

const BASE_HOST = '127.0.0.1';

async function startTestServer(
	overrides: Partial<{
		tasks: TaskRepository;
		profiles: ProfileRepository;
		artifacts: ArtifactRepository;
		evidence: EvidenceRepository;
		orchestration: OrchestrationFacade;
	}> = {},
): Promise<TestServer> {
	const dependencies = {
		tasks: createRepositoryStub<TaskRepository>('list', overrides.tasks),
		profiles: createRepositoryStub<ProfileRepository>('list', overrides.profiles),
		artifacts: createRepositoryStub<ArtifactRepository>('list', overrides.artifacts),
		evidence: createRepositoryStub<EvidenceRepository>('list', overrides.evidence),
		orchestration:
			overrides.orchestration ??
			({
				router: { policy: { version: 'test-policy' } },
				shutdown: vi.fn(),
			} as unknown as OrchestrationFacade),
	};

	const server = createRuntimeHttpServer(dependencies);
	const { port } = await server.listen(0, BASE_HOST);
	return { server, url: `http://${BASE_HOST}:${port}` };
}

function createRepositoryStub<T>(method: keyof T, override?: T): T {
	if (override) return override;
	return { [method]: vi.fn().mockResolvedValue([]) } as unknown as T;
}

function createDeferred<T = void>() {
	let resolve: (value: T | PromiseLike<T>) => void;
	let reject: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve: resolve!, reject: reject! };
}

describe('Runtime health probes', () => {
	const servers: RuntimeHttpServer[] = [];

	afterEach(async () => {
		await Promise.all(
			servers.splice(0).map(async (srv) => {
				await srv.close();
			}),
		);
		resetMetricsForTest();
	});

	it('returns healthy component statuses for /health', async () => {
		const { server, url } = await startTestServer();
		servers.push(server);

		const response = await fetch(`${url}/health`);
		expect(response.status).toBe(200);
		const payload = (await response.json()) as {
			status: string;
			components: Record<string, { status: string }>;
			service: { brand: string };
		};
		expect(payload.status).toBe('healthy');
		expect(payload.components.tasks.status).toBe('healthy');
		expect(payload.service.brand).toBe('brAInwav');
	});

	it('returns 503 for /ready when a critical dependency fails', async () => {
		const failingTasks = {
			list: vi.fn().mockRejectedValue(new Error('disk failure')),
		} as unknown as TaskRepository;
		const { server, url } = await startTestServer({ tasks: failingTasks });
		servers.push(server);

		const readiness = await fetch(`${url}/ready`);
		expect(readiness.status).toBe(503);
		const body = await readiness.json();
		expect(body.ready).toBe(false);
		expect(body.components.tasks.status).toBe('unhealthy');

		const health = await fetch(`${url}/health`);
		expect(health.status).toBe(503);
	});

	it('drains in-flight health requests before completing shutdown', async () => {
		const inFlight = createDeferred<void>();
		const release = createDeferred<void>();
		const listMock = vi.fn(async () => {
			inFlight.resolve();
			await release.promise;
			return [];
		});
		const slowTasks = { list: listMock } as unknown as TaskRepository;
		const { server, url } = await startTestServer({ tasks: slowTasks });
		servers.push(server);

		const firstResponsePromise = fetch(`${url}/health`);
		await inFlight.promise;

		const shutdownResultPromise = server.beginShutdown({ timeoutMs: 1_000 });

		const rejected = await fetch(`${url}/health`);
		expect(rejected.status).toBe(503);
		const rejectedBody = (await rejected.json()) as { status: string; message: string };
		expect(rejectedBody.status).toBe('unavailable');
		expect(rejectedBody.message).toContain('brAInwav');

		release.resolve();

		const firstResponse = await firstResponsePromise;
		expect(firstResponse.status).toBe(200);

		const shutdownResult = await shutdownResultPromise;
		expect(shutdownResult.completed).toBe(true);
		expect(shutdownResult.pendingRequests).toBe(0);
		expect(listMock).toHaveBeenCalledTimes(1);
	});

	it('keeps readiness green and liveness healthy when orchestration is degraded', async () => {
		const degradedOrchestration = {
			router: {},
			shutdown: vi.fn(),
		} as unknown as OrchestrationFacade;
		const { server, url } = await startTestServer({ orchestration: degradedOrchestration });
		servers.push(server);

		const health = await fetch(`${url}/health`);
		expect(health.status).toBe(200);
		const payload = (await health.json()) as {
			status: string;
			components: Record<string, { status: string }>;
		};
		expect(payload.status).toBe('degraded');
		expect(payload.components.orchestration.status).toBe('degraded');

		const readiness = await fetch(`${url}/ready`);
		expect(readiness.status).toBe(200);
		const liveness = await fetch(`${url}/live`);
		expect(liveness.status).toBe(200);
	});

	it('records RED metrics for health requests', async () => {
		const { server, url } = await startTestServer();
		servers.push(server);

		const response = await fetch(`${url}/health`);
		expect(response.status).toBe(200);

		const metrics = await fetch(`${url}/metrics`);
		expect(metrics.status).toBe(200);
		const body = await metrics.text();
		expect(body).toContain('brainwav_http_requests_total');
		expect(body).toContain('service="cortex-os/runtime-http"');
		expect(body).toContain('path="/health"');
	});
});
