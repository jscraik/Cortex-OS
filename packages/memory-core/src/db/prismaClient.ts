import { createRequire } from 'node:module';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

const requirePrisma = createRequire(import.meta.url);
const { PrismaClient } = requirePrisma('@prisma/client') as typeof import('@prisma/client');

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		datasourceUrl: process.env.MEMORY_GRAPH_DB_URL ?? process.env.DATABASE_URL,
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}

export async function shutdownPrisma(): Promise<void> {
	await prisma.$disconnect();
}
