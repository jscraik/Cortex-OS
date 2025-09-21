import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgVectorStore } from './pgvector-store.js';

// Mock dynamic import of 'pg' and observability
const obs = vi.hoisted(() => ({
    generateRunId: vi.fn(() => 'RUN'),
    recordLatency: vi.fn(),
    recordOperation: vi.fn(),
}));

vi.mock('@cortex-os/observability', () => ({
    generateRunId: obs.generateRunId,
    recordLatency: obs.recordLatency,
    recordOperation: obs.recordOperation,
}));

// Minimal Pool mock
class MockClient {
    async query(): Promise<{ rows: unknown[] }> {
        return { rows: [] };
    }
    release(): void { }
}

class MockPool {
    async connect() {
        return new MockClient();
    }
}

vi.mock('pg', () => ({
    Pool: MockPool,
}));

describe('PgVectorStore.init metrics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('emits init metrics on successful initialization', async () => {
        const store = new PgVectorStore({ connectionString: 'postgres://user:pass@localhost:5432/db' });
        await store.init();

        // Ensure we record a metric for init operation and latency
        expect(obs.recordLatency).toHaveBeenCalledWith(
            'pgvector.init',
            expect.any(Number),
            expect.objectContaining({ component: 'rag', store: 'pgvector' }),
        );
        expect(obs.recordOperation).toHaveBeenCalledWith(
            'pgvector.init',
            true,
            'RUN',
            expect.objectContaining({ component: 'rag', store: 'pgvector' }),
        );
    });
});
