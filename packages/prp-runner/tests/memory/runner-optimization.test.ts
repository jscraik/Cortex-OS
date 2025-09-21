import { describe, expect, it } from 'vitest';
import {
    createMemorySafeWatcher,
    runTestsWithMemoryLimit,
} from '../../src/lib/testing/test-runner';

describe('Test Runner Optimization', () => {
    it('should run tests within memory budget', async () => {
        const result = await runTestsWithMemoryLimit({
            maxMemory: 512 * 1024 * 1024,
            timeout: 30_000,
            bail: true,
            patterns: ['tests/memory/memory-profile.test.ts'],
        });

        expect(result.success).toBe(true);
        expect(result.maxMemoryUsed).toBeLessThan(512 * 1024 * 1024);
    });

    it('should support watch mode with memory constraints', async () => {
        const watcher = createMemorySafeWatcher({
            maxMemory: 256 * 1024 * 1024,
            restartOnHighMemory: true,
        });

        expect(watcher.isRunning()).toBe(true);
        expect(watcher.canRunTests()).toBe(true);

        await watcher.shutdown();
    });
});
