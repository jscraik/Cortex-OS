import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generatePrometheusMetrics, runDiagnostics } from '../diagnostics/diagnostics.js';

function createMockDiagScript(content: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'diag-test-'));
	const path = join(dir, 'mcp_diagnose.sh');
	writeFileSync(path, content, { mode: 0o755 });
	chmodSync(path, 0o755);
	return path;
}

describe('runDiagnostics integration', () => {
	it('parses valid diagnostics JSON and produces metrics output', async () => {
		const mockJson = JSON.stringify({
			timestamp: new Date().toISOString(),
			port_guard: { status: 'ok' },
			health: { status: 'ok', latencyMs: 5 },
			tunnel: { status: 'ok' },
			summary: { overall: 'ok' },
		});
		const script = createMockDiagScript(`#!/usr/bin/env bash\n echo '${mockJson}'`);
		const result = await runDiagnostics({ scriptPath: script });
		expect(result.summary?.overall).toBe('ok');
		const prom = generatePrometheusMetrics(result);
		expect(prom).toContain('diagnostics_overall_status 0');
		expect(prom).toContain('diagnostics_health_latency_ms 5');
	});

	it('fails on malformed JSON', async () => {
		const script = createMockDiagScript("#!/usr/bin/env bash\n echo '{bad json}'");
		await expect(runDiagnostics({ scriptPath: script })).rejects.toThrow();
	});
});
