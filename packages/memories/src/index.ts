// Adapters (exported for consumers to avoid cross-domain src imports elsewhere)

export { EncryptedStore } from './adapters/store.encrypted.js';
export { PolicyEncryptedStore } from './adapters/store.encrypted.policy.js';
export { LayeredMemoryStore } from './adapters/store.layered.js';
export { LocalMemoryStore } from './adapters/store.localmemory.js';
export { InMemoryStore } from './adapters/store.memory.js';
export { PrismaStore } from './adapters/store.prisma/client.js';
export { SQLiteStore } from './adapters/store.sqlite.js';
export {
    createStoreFromEnv,
    resolveStoreKindFromEnv
} from './config/store-from-env.js';
export * from './domain/types.js';
export * from './ports/Embedder.js';
export * from './ports/MemoryStore.js';
export * from './service/memory-service.js';
export * from './service/store-factory.js';
export * from './service/embedder-factory.js';
