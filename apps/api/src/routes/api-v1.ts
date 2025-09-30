import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import type { ApiBusIntegration, AsyncJobEvent } from '../core/a2a-integration.js';
import type { StructuredLogger } from '../core/observability.js';
import { isPrismaFallback, prisma } from '../db/prisma-client.js';
import { API_EVENT_TYPES } from '../events/api-events.js';

const apiV1Router: ReturnType<typeof Router> = Router();

interface TaskResponse {
	readonly id: string;
	readonly title: string;
	readonly status: string;
	readonly createdAt: string;
	readonly projectId: string;
}

interface AgentResponse {
	readonly id: string;
	readonly name: string;
	readonly status: 'idle' | 'running' | 'error';
	readonly lastRunAt: string | null;
}

interface MetricsResponse {
	readonly uptimeSeconds: number;
	readonly activeAgents: number;
	readonly tasksProcessed: number;
	readonly queueDepth: number;
}

type LoggerLike = Pick<StructuredLogger, 'info' | 'warn' | 'error'>;

type ExpressLocals = {
	readonly logger?: LoggerLike;
	readonly apiBus?: ApiBusIntegration;
};

type TaskDelegate = NonNullable<typeof prisma.task>;
type PrismaTaskRecord = Awaited<
	ReturnType<TaskDelegate['findMany']>
> extends readonly (infer Entry)[]
	? Entry
	: never;

const resolveTaskDelegate = async (
	context: 'tasks-list' | 'metrics',
	logger?: LoggerLike,
): Promise<TaskDelegate | undefined> => {
	const fallbackActive = await isPrismaFallback();
	if (fallbackActive) {
		logger?.warn?.('brAInwav Prisma fallback active for tasks operations', { context });
	}

	const delegate = prisma.task;
	if (!delegate) {
		logger?.warn?.('brAInwav Prisma task delegate unavailable', { context });
		return undefined;
	}

	return delegate;
};

apiV1Router.get(
	'/tasks',
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const locals = req.app.locals as ExpressLocals;
		const logger = locals.logger;
		try {
			const tasks = await fetchTasks(logger);
			logger?.info?.('brAInwav served tasks payload', { count: tasks.length });
			res.json({ tasks });
		} catch (error) {
			logger?.error?.('brAInwav tasks endpoint failure', normalizeError(error));
			next(error);
		}
	},
);

apiV1Router.get(
	'/agents',
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const locals = req.app.locals as ExpressLocals;
		const logger = locals.logger;
		try {
			const agents = collectAgents(locals.apiBus);
			logger?.info?.('brAInwav served agents payload', { count: agents.length });
			res.json({ agents });
		} catch (error) {
			logger?.error?.('brAInwav agents endpoint failure', normalizeError(error));
			next(error);
		}
	},
);

apiV1Router.get(
	'/metrics',
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		const locals = req.app.locals as ExpressLocals;
		const logger = locals.logger;
		try {
			const metrics = await collectMetrics(locals.apiBus, logger);
			logger?.info?.('brAInwav served metrics payload', { metrics });
			res.json(metrics);
		} catch (error) {
			logger?.error?.('brAInwav metrics endpoint failure', normalizeError(error));
			next(error);
		}
	},
);

function normalizeError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return { message: error.message, stack: error.stack };
	}
	return { message: String(error) };
}

async function fetchTasks(logger?: LoggerLike): Promise<TaskResponse[]> {
	const delegate = await resolveTaskDelegate('tasks-list', logger);
	if (!delegate) {
		return [];
	}

	try {
		const records = await delegate.findMany({
			select: {
				id: true,
				title: true,
				status: true,
				createdAt: true,
				projectId: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 200,
		});

		return records.map<TaskResponse>((task: PrismaTaskRecord) => ({
			id: task.id,
			title: task.title,
			status: task.status,
			createdAt: task.createdAt.toISOString(),
			projectId: task.projectId,
		}));
	} catch (error) {
		logger?.warn?.('brAInwav tasks query degraded to empty payload', normalizeError(error));
		return [];
	}
}

function collectAgents(apiBus?: ApiBusIntegration): AgentResponse[] {
	if (!apiBus) {
		return [];
	}

	const latestByJob = new Map<string, AgentResponse>();

	const jobEvents = apiBus
		.getEventHistory()
		.filter((event) => event.type.startsWith('cortex.api.job.'));

	for (const event of jobEvents) {
		const data = event.data as Partial<AsyncJobEvent> | undefined;
		if (!data?.jobId || !data.status) {
			continue;
		}

		const status = mapAgentStatus(data.status);
		const lastRunAt = resolveTimestamp(data.timestamp, event.time);
		const name = resolveAgentName(data);

		latestByJob.set(data.jobId, {
			id: data.jobId,
			name,
			status,
			lastRunAt,
		});
	}

	for (const job of apiBus.listActiveJobs()) {
		const status = mapAgentStatus(job.status);
		const lastRunAt = resolveTimestamp(job.timestamp, undefined);
		const name = resolveAgentName(job);

		latestByJob.set(job.jobId, {
			id: job.jobId,
			name,
			status,
			lastRunAt,
		});
	}

	return Array.from(latestByJob.values()).sort(sortByLastRunDesc);
}

async function collectMetrics(
	apiBus: ApiBusIntegration | undefined,
	logger?: LoggerLike,
): Promise<MetricsResponse> {
	const [tasksProcessed, agentSnapshots] = await Promise.all([
		countCompletedTasks(logger),
		Promise.resolve(collectAgents(apiBus)),
	]);

	const queueDepth = computeQueueDepth(apiBus);

	return {
		uptimeSeconds: Math.round(process.uptime()),
		activeAgents: agentSnapshots.filter((agent) => agent.status === 'running').length,
		tasksProcessed,
		queueDepth,
	};
}

async function countCompletedTasks(logger?: LoggerLike): Promise<number> {
	const delegate = await resolveTaskDelegate('metrics', logger);
	if (!delegate) {
		return 0;
	}

	try {
		return await delegate.count({
			where: {
				status: {
					in: ['completed', 'done', 'processed'],
				},
			},
		});
	} catch (error) {
		logger?.warn?.('brAInwav metrics task counter degraded to zero', normalizeError(error));
		return 0;
	}
}

function computeQueueDepth(apiBus?: ApiBusIntegration): number {
	if (!apiBus) {
		return 0;
	}

	const pendingJobs = apiBus
		.getEventHistory()
		.filter((event) => event.type === API_EVENT_TYPES.JOB_CREATED)
		.map((event) => event.data as Partial<AsyncJobEvent>)
		.filter((event): event is Partial<AsyncJobEvent> & { jobId: string } => Boolean(event?.jobId));

	const startedJobs = new Set(
		apiBus
			.getEventHistory()
			.filter(
				(event) =>
					event.type === API_EVENT_TYPES.JOB_STARTED || event.type === API_EVENT_TYPES.JOB_PROGRESS,
			)
			.map((event) => (event.data as Partial<AsyncJobEvent> | undefined)?.jobId)
			.filter((jobId): jobId is string => typeof jobId === 'string'),
	);

	return pendingJobs.filter((event) => !startedJobs.has(event.jobId)).length;
}

function mapAgentStatus(status: AsyncJobEvent['status']): AgentResponse['status'] {
	if (status === 'failed') {
		return 'error';
	}
	if (status === 'started' || status === 'progress') {
		return 'running';
	}
	return 'idle';
}

function resolveTimestamp(
	timestamp: number | undefined,
	fallback: string | undefined,
): string | null {
	if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
		return new Date(timestamp).toISOString();
	}
	if (typeof fallback === 'string') {
		return fallback;
	}
	return null;
}

function resolveAgentName(data: Partial<AsyncJobEvent>): string {
	if (typeof data.type === 'string' && data.type.length > 0) {
		return data.type;
	}
	if (hasNameProperty(data.metadata) && typeof data.metadata.name === 'string') {
		const candidate = data.metadata.name;
		if (candidate.length > 0) {
			return candidate;
		}
	}
	return 'unidentified-agent';
}

function hasNameProperty(candidate: unknown): candidate is { name: unknown } {
	return typeof candidate === 'object' && candidate !== null && 'name' in candidate;
}

function sortByLastRunDesc(left: AgentResponse, right: AgentResponse): number {
	const leftTime = left.lastRunAt ? Date.parse(left.lastRunAt) : 0;
	const rightTime = right.lastRunAt ? Date.parse(right.lastRunAt) : 0;
	return rightTime - leftTime;
}

export { apiV1Router, countCompletedTasks, fetchTasks };

