import { describe, expect, it, vi } from 'vitest';
import { RedteamOptions, runRedteamSuite } from './redteam.js';

describe('runRedteamSuite', () => {
        it('passes when results stay within limits', async () => {
                const deps = {
                        run: vi.fn().mockResolvedValue({ total: 4, failures: 0, critical: 0 }),
                };
                const options = RedteamOptions.parse({ attackFiles: ['redteam/injections.yaml'] });
                const result = await runRedteamSuite('redteam', options, deps);
                expect(result.pass).toBe(true);
                expect(result.metrics.failures).toBe(0);
        });

        it('fails when critical failures exceed allowance', async () => {
                const deps = {
                        run: vi.fn().mockResolvedValue({ total: 4, failures: 1, critical: 1 }),
                };
                const options = RedteamOptions.parse({
                        attackFiles: ['redteam/injections.yaml'],
                        thresholds: { maxCritical: 0 },
                });
                const result = await runRedteamSuite('redteam', options, deps);
                expect(result.pass).toBe(false);
                expect(result.metrics.critical).toBe(1);
        });
});
