import type { PrismaClient as PrismaClientType } from '@prisma/client';
export declare const prisma: PrismaClientType<import("@prisma/client").Prisma.PrismaClientOptions, import("@prisma/client").Prisma.LogLevel, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function shutdownPrisma(): Promise<void>;
