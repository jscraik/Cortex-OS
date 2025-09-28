import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LanggraphHarness } from '../setup/langgraph-integration.js';

type FixtureThermalState = 'nominal' | 'warning' | 'critical';

export interface FullSystemFixture {
        input: string;
        expectedOutput: string;
        thermalState: FixtureThermalState;
        streaming?: boolean;
        tools: unknown[];
        messages: unknown[];
}

export function loadFullSystemFixture(): FullSystemFixture {
        const fixturePath = path.join(
                path.dirname(fileURLToPath(import.meta.url)),
                '../fixtures/langgraph/full-system.json',
        );
        const raw = readFileSync(fixturePath, 'utf8');
        return JSON.parse(raw) as FullSystemFixture;
}

export async function runFullSystemScenario(
        harness: LanggraphHarness,
        overrides: Partial<FullSystemFixture> = {},
) {
        const fixture = loadFullSystemFixture();
        const input = overrides.input ?? fixture.input;
        const streaming = overrides.streaming ?? fixture.streaming ?? false;
        const thermalState = (overrides.thermalState ?? fixture.thermalState) as FixtureThermalState;
        harness.thermal.setState(thermalState);
        return harness.run(input, { streaming });
}

export function ensureBrandedLogs(logs: string[]): void {
        for (const entry of logs) {
                if (!entry.startsWith('brAInwav')) {
                        throw new Error(`Log entry missing brAInwav prefix: ${entry}`);
                }
        }
}
