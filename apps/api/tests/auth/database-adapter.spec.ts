import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createBetterAuthPrismaAdapter', () => {
	const envBackup = { ...process.env };

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		process.env = { ...envBackup, CORTEX_SKIP_PRISMA_PUSH: '1' };
	});

	afterEach(() => {
		process.env = { ...envBackup };
	});

        it('wires the official Better Auth Prisma adapter with brAInwav defaults', async () => {
                const adapterMock = {
                        adapterId: 'prisma',
                        createUser: vi.fn(),
                        getUserById: vi.fn(),
                };
                const adapterFactoryMock = vi.fn(() => adapterMock);
                const prismaAdapterMock = vi.fn(() => adapterFactoryMock);
                vi.doMock('better-auth/adapters/prisma', () => ({ prismaAdapter: prismaAdapterMock }));

                const prismaMock = {
                        $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({})),
                        $use: vi.fn(),
                };
		vi.doMock('../../src/db/prisma-client.js', () => ({ prisma: prismaMock }));

		const module = await import('../../src/auth/database-adapter.js');

		const { createBetterAuthPrismaAdapter } = module as {
			createBetterAuthPrismaAdapter: () => unknown;
		};

		const factory = createBetterAuthPrismaAdapter();

                expect(prismaAdapterMock).toHaveBeenCalledTimes(1);
                expect(prismaAdapterMock).toHaveBeenCalledWith(
                        prismaMock,
                        expect.objectContaining({
                                provider: 'postgresql',
                                transaction: true,
                        }),
                );
                expect(adapterFactoryMock).toHaveBeenCalledTimes(0);

                const adapter = factory({});

                expect(adapterFactoryMock).toHaveBeenCalledTimes(1);
                expect(adapterFactoryMock).toHaveBeenCalledWith({});
                expect(adapter).toBeInstanceOf(Object);
                expect((adapter as { adapterId: string }).adapterId).toBe('prisma');
        });
});
