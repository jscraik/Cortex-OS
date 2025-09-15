import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

// Accept a generic diagnostics-like object; typed as unknown to avoid implicit any and keep flexibility.
function createMockDiagScript(json: unknown): string {
    const dir = mkdtempSync(join(tmpdir(), 'diag-cli-'));
    const path = join(dir, 'mcp_diagnose.sh');
    const payload = JSON.stringify(json).replace(/'/g, "'\\''");
    writeFileSync(
        path,
        `#!/usr/bin/env bash\n# mock diagnostics script\n echo '${payload}'`,
        { mode: 0o755 },
    );
    chmodSync(path, 0o755);
    return path;
}

let scriptPath: string;

beforeAll(() => {
    scriptPath = createMockDiagScript({
        timestamp: new Date().toISOString(),
        port_guard: { status: 'ok' },
        health: { status: 'ok', latencyMs: 7 },
        tunnel: { status: 'ok' },
        summary: { overall: 'ok' },
    });
    // Ensure the CLI picks up our script via env override if supported; fallback relies on default path resolution.
    process.env.DIAGNOSTICS_SCRIPT_PATH = scriptPath;
});

describe('diagnostics CLI e2e', () => {
    const cli = join(
        process.cwd(),
        'packages/agent-toolkit/dist/cli/diagnostics.js',
    );

    it('emits JSON by default', () => {
        const out = execFileSync('node', [cli], {
            encoding: 'utf8',
            env: { ...process.env },
        });
        const parsed = JSON.parse(out);
        expect(parsed.summary.overall).toBe('ok');
        expect(parsed.health.latencyMs).toBe(7);
    });

    it('emits Prometheus metrics with --prom', () => {
        const out = execFileSync('node', [cli, '--prom'], {
            encoding: 'utf8',
            env: { ...process.env },
        });
        expect(out).toContain('diagnostics_overall_status');
        expect(out).toContain('diagnostics_health_latency_ms 7');
    });
});
