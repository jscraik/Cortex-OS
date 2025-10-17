import { createRequire } from 'node:module';
const requirePrisma = createRequire(import.meta.url);
const { PrismaClient } = requirePrisma('@prisma/client');
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: process.env.MEMORY_GRAPH_DB_URL ?? process.env.DATABASE_URL,
    });
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
export async function shutdownPrisma() {
    await prisma.$disconnect();
}
