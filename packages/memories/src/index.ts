// Adapters (exported for consumers to avoid cross-domain src imports elsewhere)
export { InMemoryStore } from "./adapters/store.memory.js";
export { PrismaStore } from "./adapters/store.prisma/client.js";
export { SQLiteStore } from "./adapters/store.sqlite.js";
export * from "./domain/types.js";
export * from "./ports/Embedder.js";
export * from "./ports/MemoryStore.js";
export * from "./service/memory-service.js";
