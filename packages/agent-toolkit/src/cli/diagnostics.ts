#!/usr/bin/env node
// Lightweight import; relies on build including Node types via root tsconfig
import {
    generatePrometheusMetrics,
    runDiagnostics,
} from '../diagnostics/diagnostics.js';

// Fallback typing if ambient node types not resolved in some partial builds
// Provide a minimal process typing fallback if not present (should be overridden by node types)
declare const process: {
    argv: string[];
    stdout: { write: (data: string) => unknown };
    exit: (code?: number) => never;
};

async function main() {
    const args: string[] = process.argv.slice(2);
    const asProm = args.includes('--prom');
    try {
        const result = await runDiagnostics();
        if (asProm) {
            process.stdout.write(generatePrometheusMetrics(result));
        } else {
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        }
    } catch (e) {
        console.error('[diagnostics] failure:', (e as Error).message);
        process.exit(1);
    }
}

main();
