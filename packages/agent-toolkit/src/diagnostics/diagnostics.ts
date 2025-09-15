import {
    type DiagnosticsResult,
    diagnosticsResultSchema,
} from '@cortex-os/contracts';
import { metrics, trace } from '@opentelemetry/api';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const tracer = trace.getTracer('agent-toolkit-diagnostics');
const meter = metrics.getMeter('agent-toolkit-diagnostics');

const diagRunCounter = meter.createCounter('diagnostics_runs_total', {
    description: 'Total number of diagnostics runs invoked',
});
const diagRunFailures = meter.createCounter('diagnostics_runs_failed_total', {
    description: 'Number of diagnostics runs that failed validation or execution',
});
const diagLatency = meter.createHistogram('diagnostics_health_latency_ms', {
    description: 'Recorded health probe latency from diagnostics output',
    unit: 'ms',
});

export interface RunDiagnosticsOptions {
    scriptPath?: string; // path to mcp_diagnose.sh
    cwd?: string;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
}

export async function runDiagnostics(
    opts: RunDiagnosticsOptions = {},
): Promise<DiagnosticsResult> {
    const {
        scriptPath = 'scripts/mcp/mcp_diagnose.sh',
        cwd = process.cwd(),
        timeoutMs = 30_000,
        env = process.env,
    } = opts;

    return await tracer.startActiveSpan('runDiagnostics', async (span) => {
        diagRunCounter.add(1);
        try {
            const proc = spawn(scriptPath, ['--json'], { cwd, env });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (d) => {
                stdout += d.toString();
            });
            proc.stderr.on('data', (d) => {
                stderr += d.toString();
            });

            const timer = setTimeout(() => {
                proc.kill('SIGKILL');
            }, timeoutMs);
            try {
                await once(proc, 'close');
            } finally {
                clearTimeout(timer);
            }

            if (proc.exitCode !== 0 && !stdout.trim()) {
                diagRunFailures.add(1);
                span.recordException(
                    new Error(
                        `diagnostics script failed: code=${proc.exitCode} stderr=${stderr}`,
                    ),
                );
                throw new Error(
                    `Diagnostics script failed (code=${proc.exitCode}). Stderr: ${stderr}`,
                );
            }

            let parsed: DiagnosticsResult;
            try {
                const json = JSON.parse(stdout);
                parsed = diagnosticsResultSchema.parse(json);
            } catch (e) {
                diagRunFailures.add(1);
                span.recordException(e as Error);
                throw new Error('Invalid diagnostics JSON: ' + (e as Error).message);
            }

            if (parsed.health.latencyMs != null) {
                diagLatency.record(parsed.health.latencyMs);
                span.setAttribute('health.latency_ms', parsed.health.latencyMs);
            }
            span.setAttribute('summary.overall', parsed.summary.overall);
            span.end();
            return parsed;
        } catch (err) {
            span.setStatus({ code: 2, message: (err as Error).message });
            span.end();
            throw err;
        }
    });
}

// Generate Prometheus exposition text directly from a DiagnosticsResult
export function generatePrometheusMetrics(result: DiagnosticsResult): string {
    const lines: string[] = [];
    lines.push(
        '# HELP diagnostics_overall_status Overall diagnostics status (0=ok,1=degraded,2=failed)',
    );
    lines.push('# TYPE diagnostics_overall_status gauge');
    const map: Record<string, number> = { ok: 0, degraded: 1, failed: 2 };
    lines.push(`diagnostics_overall_status ${map[result.summary.overall]}`);

    if (result.health.latencyMs != null) {
        lines.push(
            '# HELP diagnostics_health_latency_ms Health probe latency in ms',
        );
        lines.push('# TYPE diagnostics_health_latency_ms gauge');
        lines.push(`diagnostics_health_latency_ms ${result.health.latencyMs}`);
    }
    const statusValue = (s: string) => {
        if (s === 'ok' || s === 'freed') return 0;
        if (s === 'degraded') return 1;
        return 2; // error
    };
    lines.push(
        '# HELP diagnostics_component_status Component status (0=ok/freed,1=degraded,2=error)',
    );
    lines.push('# TYPE diagnostics_component_status gauge');
    lines.push(
        `diagnostics_component_status{component="port_guard"} ${statusValue(result.port_guard.status)}`,
    );
    lines.push(
        `diagnostics_component_status{component="health"} ${statusValue(result.health.status)}`,
    );
    lines.push(
        `diagnostics_component_status{component="tunnel"} ${statusValue(result.tunnel.status)}`,
    );
    return lines.join('\n') + '\n';
}

export interface HomebrewFormulaOptions {
    repo: string; // e.g. jamiescottcraik/Cortex-OS
    version: string; // e.g. 0.1.0
    urlTemplate?: string; // override tarball URL
    sha256?: string; // optional precomputed sha
    desc?: string;
    license?: string;
}

export function generateHomebrewFormula(opts: HomebrewFormulaOptions): string {
    const {
        repo,
        version,
        urlTemplate,
        sha256 = 'TBD',
        desc = 'Cortex-OS MCP & Agent Toolkit',
        license = 'MIT',
    } = opts;
    const url =
        urlTemplate ??
        `https://github.com/${repo}/archive/refs/tags/v${version}.tar.gz`;
    const className = 'CortexOsAgentToolkit';
    return `class ${className} < Formula\n  desc "${desc}"\n  homepage "https://github.com/${repo}"\n  url "${url}"\n  sha256 "${sha256}"\n  license "${license}"\n\n  depends_on "node" => :build\n  depends_on "python@3.11"\n\n  def install\n    system "npm", "install", "-g", "pnpm" unless which("pnpm")\n    system "pnpm", "install"\n    system "pnpm", "build"\n    libexec.install Dir["*" ]\n    (bin/"cortex-mcp-diagnose").write <<~EOS\n      #!/bin/bash\n      cd #{libexec} && node -e 'import("./packages/agent-toolkit/dist/index.js").then(async m=>{const r=await m.runDiagnostics().catch(e=>{console.error(e);process.exit(1)});console.log(JSON.stringify(r,null,2));})'\n    EOS\n    chmod 0555, bin/"cortex-mcp-diagnose"\n  end\n\n  test do\n    system "#{bin}/cortex-mcp-diagnose" rescue nil\n  end\nend\n`;
}
