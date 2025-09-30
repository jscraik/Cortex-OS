import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type LoggerMock = {
	warn: ReturnType<typeof vi.fn>;
	info: ReturnType<typeof vi.fn>;
	error: ReturnType<typeof vi.fn>;
};

const createLogger = (): LoggerMock => ({
	warn: vi.fn(),
	info: vi.fn(),
	error: vi.fn(),
});

describe('api v1 tasks fetch', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.doUnmock('../src/db/prisma-client.js');
	});

	const setup = async ({
		records = [],
		isFallback = false,
		findManyImplementation,
	}: {
		records?: Array<{ id: string; title: string; status: string; createdAt: Date }>;
		isFallback?: boolean;
		findManyImplementation?: (args: unknown) => Promise<unknown>;
	}) => {
		const delegate = {
			findMany: findManyImplementation ?? vi.fn(async () => records),
		};

		const prismaMock = { task: delegate } as const;
		const fallbackSpy = vi.fn(async () => isFallback);

		vi.doMock('../src/db/prisma-client.js', () => ({
			prisma: prismaMock,
			isPrismaFallback: fallbackSpy,
			getPrismaSingleton: vi.fn(),
			disconnectPrisma: vi.fn(),
		}));

		const module = await import('../src/routes/api-v1.js');

		return {
			fetchTasks: module.fetchTasks as typeof module.fetchTasks,
			delegate,
			fallbackSpy,
		};
	};

	it('returns serialized tasks using Prisma delegate arguments', async () => {
		const createdAt = new Date('2024-01-01T00:00:00.000Z');
		const logger = createLogger();
		const { fetchTasks, delegate } = await setup({
			records: [
				{
					id: 'task-1',
					title: 'Refactor prisma client',
					status: 'open',
					createdAt,
				},
			],
		});

		const tasks = await fetchTasks(logger);

		expect(delegate.findMany).toHaveBeenCalledWith({
			select: {
				id: true,
				title: true,
				status: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 200,
		});
		expect(tasks).toEqual([
			{
				id: 'task-1',
				title: 'Refactor prisma client',
				status: 'open',
				createdAt: createdAt.toISOString(),
			},
		]);
	});

	it('logs fallback warnings when Prisma delegate is degraded', async () => {
		const logger = createLogger();
		const { fetchTasks, fallbackSpy } = await setup({ isFallback: true });

		await fetchTasks(logger);

		expect(fallbackSpy).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'brAInwav Prisma fallback active for tasks operations',
			{ context: 'tasks-list' },
		);
	});

	it('returns empty list when delegate throws and logs degradation', async () => {
		const logger = createLogger();
		const { fetchTasks } = await setup({
			findManyImplementation: vi.fn(async () => {
				throw new Error('test failure');
			}),
		});

		const result = await fetchTasks(logger);

		expect(result).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'brAInwav tasks query degraded to empty payload',
			expect.objectContaining({ message: 'test failure' }),
		);
	});
});
