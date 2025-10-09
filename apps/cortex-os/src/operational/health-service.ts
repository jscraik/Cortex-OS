import { performance } from 'node:perf_hooks';
import type { OrchestrationFacade } from '@cortex-os/orchestration';
import type { ArtifactRepository } from '../persistence/artifact-repository.js';
import type { EvidenceRepository } from '../persistence/evidence-repository.js';
import type { ProfileRepository } from '../persistence/profile-repository.js';
import type { TaskRepository } from '../persistence/task-repository.js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthServiceOptions {
	version?: string;
	now?: () => Date;
}

export interface RuntimeHealthDependencies {
	tasks: TaskRepository;
	profiles: ProfileRepository;
	artifacts: ArtifactRepository;
	evidence: EvidenceRepository;
	orchestration: OrchestrationFacade;
}

export interface HealthService {
	checkHealth(): Promise<HttpResult<HealthPayload>>;
	checkReadiness(): Promise<HttpResult<ReadinessPayload>>;
	checkLiveness(): HttpResult<LivenessPayload>;
}

export interface HttpResult<TPayload> {
	statusCode: number;
	payload: TPayload;
}

export interface HealthPayload {
	status: HealthStatus;
	timestamp: string;
	components: Record<string, ComponentResult>;
	service: {
		name: string;
		brand: 'brAInwav';
		version: string;
	};
}

export interface ReadinessPayload {
	status: HealthStatus;
	ready: boolean;
	timestamp: string;
	components: Record<string, ComponentResult>;
	service: {
		name: string;
		brand: 'brAInwav';
		version: string;
	};
}

export interface LivenessPayload {
	status: 'healthy';
	timestamp: string;
	service: {
		name: string;
		brand: 'brAInwav';
	};
}

interface ComponentDefinition {
	id: string;
	category: 'critical' | 'optional';
	check: () => Promise<ComponentResult>;
}

export interface ComponentResult {
	status: HealthStatus;
	latencyMs: number;
	message: string;
	error?: string;
}

export function createHealthService(
	dependencies: RuntimeHealthDependencies,
	options: HealthServiceOptions = {},
): HealthService {
	const now = options.now ?? (() => new Date());
	const version = options.version ?? process.env.npm_package_version ?? '0.0.0';
	const components = createComponentDefinitions(dependencies);
	const service = buildServiceInfo(version);
	const buildPayload = createPayloadBuilder(now, service);

	const evaluate = () => evaluateComponents(components);

	return {
		checkHealth: async () => {
			const results = await evaluate();
			const status = aggregateStatus(results.map((entry) => entry.result));
			return {
				statusCode: status === 'unhealthy' ? 503 : 200,
				payload: buildPayload<HealthPayload>({
					status,
					components: mapComponentResults(results),
				}),
			};
		},
		checkReadiness: async () => {
			const results = await evaluate();
			const critical = results.filter((entry) => entry.category === 'critical');
			const criticalStatus = aggregateStatus(critical.map((entry) => entry.result));
			const ready = criticalStatus === 'healthy';
			return {
				statusCode: ready ? 200 : 503,
				payload: buildPayload<ReadinessPayload>({
					status: ready ? 'healthy' : 'unhealthy',
					ready,
					components: mapComponentResults(results),
				}),
			};
		},
		checkLiveness: () => ({
			statusCode: 200,
			payload: buildPayload<LivenessPayload>({ status: 'healthy' }),
		}),
	};
}

function buildServiceInfo(version: string) {
	return {
		name: 'brAInwav Cortex-OS Runtime',
		brand: 'brAInwav' as const,
		version,
	};
}

function createPayloadBuilder(now: () => Date, service: ReturnType<typeof buildServiceInfo>) {
	return <TPayload extends { timestamp: string; service: typeof service }>(
		payload: Omit<TPayload, 'timestamp' | 'service'>,
	): TPayload => ({
		...payload,
		timestamp: now().toISOString(),
		service,
	});
}

function createComponentDefinitions(
	dependencies: RuntimeHealthDependencies,
): ComponentDefinition[] {
	return [
		{
			id: 'tasks',
			category: 'critical',
			check: () => checkFileRepository('Tasks repository', () => dependencies.tasks.list()),
		},
		{
			id: 'profiles',
			category: 'critical',
			check: () => checkFileRepository('Profiles repository', () => dependencies.profiles.list()),
		},
		{
			id: 'artifacts',
			category: 'critical',
			check: () => checkFileRepository('Artifacts repository', () => dependencies.artifacts.list()),
		},
		{
			id: 'evidence',
			category: 'critical',
			check: () => checkEvidenceRepository(dependencies.evidence),
		},
		{
			id: 'orchestration',
			category: 'optional',
			check: () => checkOrchestrationFacade(dependencies.orchestration),
		},
	];
}

async function evaluateComponents(components: ComponentDefinition[]): Promise<
	Array<{
		id: string;
		category: ComponentDefinition['category'];
		result: ComponentResult;
	}>
> {
	return Promise.all(
		components.map(async (component) => ({
			id: component.id,
			category: component.category,
			result: await component.check(),
		})),
	);
}

function mapComponentResults(
	entries: Array<{ id: string; result: ComponentResult }>,
): Record<string, ComponentResult> {
	return entries.reduce<Record<string, ComponentResult>>((acc, entry) => {
		acc[entry.id] = entry.result;
		return acc;
	}, {});
}

function aggregateStatus(results: ComponentResult[]): HealthStatus {
	if (results.some((result) => result.status === 'unhealthy')) {
		return 'unhealthy';
	}
	if (results.some((result) => result.status === 'degraded')) {
		return 'degraded';
	}
	return 'healthy';
}

function checkFileRepository(
	description: string,
	action: () => Promise<unknown>,
): Promise<ComponentResult> {
	const start = performance.now();
	return action()
		.then(() => buildSuccessResult(start, `${description} reachable`))
		.catch((error: unknown) => buildFailureResult(start, description, error));
}

async function checkEvidenceRepository(repository: EvidenceRepository): Promise<ComponentResult> {
	const start = performance.now();
	try {
		await repository.list();
		return buildSuccessResult(start, 'Evidence repository reachable');
	} catch (error) {
		return buildFailureResult(start, 'Evidence repository', error);
	}
}

async function checkOrchestrationFacade(facade: OrchestrationFacade): Promise<ComponentResult> {
	const start = performance.now();
	try {
		const policyVersion = (facade.router as { policy?: { version?: string } })?.policy?.version;
		if (!policyVersion) {
			return buildDegradedResult(start, 'Orchestration router degraded - policy missing');
		}
		return buildSuccessResult(start, 'Orchestration facade responsive');
	} catch (error) {
		return buildFailureResult(start, 'Orchestration facade', error);
	}
}

function buildSuccessResult(start: number, message: string): ComponentResult {
	return {
		status: 'healthy',
		latencyMs: roundMs(performance.now() - start),
		message: `brAInwav: ${message}`,
	};
}

function buildDegradedResult(start: number, message: string): ComponentResult {
	return {
		status: 'degraded',
		latencyMs: roundMs(performance.now() - start),
		message: `brAInwav: ${message}`,
	};
}

function buildFailureResult(start: number, description: string, error: unknown): ComponentResult {
	return {
		status: 'unhealthy',
		latencyMs: roundMs(performance.now() - start),
		message: `brAInwav: ${description} failure`,
		error: error instanceof Error ? error.message : String(error),
	};
}

function roundMs(duration: number): number {
	return Math.round(duration * 100) / 100;
}
