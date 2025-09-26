import type { PrismaClient as PrismaClientType } from '@prisma/client';

const resolveLogLevels = () => {
  if (process.env.NODE_ENV === 'development') {
    return ['query', 'info', 'warn', 'error'] as const;
  }

  return ['warn', 'error'] as const;
};

type PrismaClientSingleton = {
  readonly client: PrismaClientType;
  readonly disconnect: () => Promise<void>;
  readonly isFallback: boolean;
};

type GlobalWithPrisma = typeof globalThis & {
  __cortexPrisma?: PrismaClientSingleton;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

const loadPrismaClient = async (): Promise<PrismaClientType | null> => {
  try {
    const module = (await import('@prisma/client')) as { PrismaClient: new (...args: ReadonlyArray<unknown>) => PrismaClientType };
    const PrismaClientCtor = module.PrismaClient;
    const datasourceUrl = process.env.DATABASE_URL;
    const log = resolveLogLevels();

    return new PrismaClientCtor(
      datasourceUrl
        ? {
          log,
          datasources: {
            db: { url: datasourceUrl },
          },
        }
        : { log },
    );
  } catch (error) {
    console.warn('brAInwav Prisma client unavailable; using fallback stub', { error });
    return null;
  }
};

const noopAsync = async () => undefined;
const noopArray = async <T>() => [] as T[];
const noopNumber = async () => 0;
const noopNullable = async <T>() => null as T | null;
const proxyDelegateHandler: ProxyHandler<Record<PropertyKey, unknown>> = {
  get: (_target, prop) => {
    if (prop === 'findMany') {
      return () => noopArray<never>();
    }
    if (prop === 'count') {
      return () => noopNumber();
    }
    if (prop === 'create' || prop === 'update') {
      return async (args?: { data?: unknown }) => args?.data ?? {};
    }
    if (prop === 'findUnique' || prop === 'findFirst' || prop === 'delete') {
      return () => noopNullable<never>();
    }
    if (prop === 'upsert' || prop === 'deleteMany' || prop === 'updateMany') {
      return () => noopArray<never>();
    }
    if (prop === 'aggregate' || prop === 'groupBy') {
      return async () => ({});
    }
    return () => noopNullable<never>();
  },
};

const createFallbackClient = (): PrismaClientType => {
  const clientHandler: ProxyHandler<PrismaClientType> = {
    get: (_target, prop) => {
      if (prop === '$disconnect' || prop === '$connect') {
        return noopAsync;
      }
      if (prop === '$transaction') {
        return async (callback: unknown) => {
          if (typeof callback === 'function') {
            const result = (callback as (tx: unknown) => unknown)(
              new Proxy({}, proxyDelegateHandler),
            );
            return await Promise.resolve(result);
          }
          return [];
        };
      }
      return new Proxy({}, proxyDelegateHandler);
    },
  };

  return new Proxy({} as PrismaClientType, clientHandler);
};

const getSingleton = async (): Promise<PrismaClientSingleton> => {
  const existing = globalForPrisma.__cortexPrisma;

  if (existing) {
    return existing;
  }

  const client = await loadPrismaClient();
  if (client) {
    const entry: PrismaClientSingleton = {
      client,
      disconnect: async () => {
        await client.$disconnect();
        if (process.env.NODE_ENV !== 'production') {
          delete globalForPrisma.__cortexPrisma;
        }
      },
      isFallback: false,
    };

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.__cortexPrisma = entry;
    }

    return entry;
  }

  const fallbackClient = createFallbackClient();
  const entry: PrismaClientSingleton = {
    client: fallbackClient,
    disconnect: noopAsync,
    isFallback: true,
  };

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.__cortexPrisma = entry;
  }

  return entry;
};

const prismaSingleton = await getSingleton();

export const prisma = prismaSingleton.client;

export const disconnectPrisma = async () => {
  const singleton = await getSingleton();
  await singleton.disconnect();
};
