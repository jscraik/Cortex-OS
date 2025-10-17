#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import madge from 'madge';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const baselineDir = path.join(repoRoot, 'reports', 'baseline');
const baselinePath = path.join(baselineDir, 'dependency-audit.json');

const analysisRoots = [path.join(repoRoot, 'packages'), path.join(repoRoot, 'apps')];
const excludePatterns = [
        '\\.(spec|e2e)\\.',
        '\\.(test|stories|cy)\\.',
        'tests?/',
        '__tests__',
        'fixtures?/',
        'mocks?/',
        '__mocks__',
        'playwright',
        'vitest\\.config',
        '__generated__',
];
const madgeOptions = {
        tsConfig: path.join(repoRoot, 'tsconfig.base.json'),
        fileExtensions: ['ts', 'tsx'],
        includeNpm: false,
        excludeRegExp: excludePatterns,
};

function normalizePath(p) {
        if (!p) return p;
        const absolute = path.isAbsolute(p) ? p : path.join(repoRoot, p);
        return path.relative(repoRoot, absolute).replace(/\\/g, '/');
}

function cycleCompare(a, b) {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i += 1) {
                const diff = a[i].localeCompare(b[i]);
                if (diff !== 0) return diff;
        }
        return a.length - b.length;
}

function canonicalizeCycle(rawCycle) {
        const normalized = (Array.isArray(rawCycle) ? rawCycle : [rawCycle])
                .map((segment) => normalizePath(segment))
                .filter(Boolean);
        if (normalized.length <= 1) return normalized;
        let best = null;
        for (let i = 0; i < normalized.length; i += 1) {
                const rotated = normalized.slice(i).concat(normalized.slice(0, i));
                if (!best || cycleCompare(rotated, best) < 0) {
                        best = rotated;
                }
        }
        return best ?? normalized;
}

function sortCycles(cycles) {
        return cycles
                .map((cycle) => [...cycle])
                .sort((a, b) => cycleKey(a).localeCompare(cycleKey(b)));
}

function sortOrphans(orphans) {
        return Array.from(new Set(orphans)).sort((a, b) => a.localeCompare(b));
}

function cycleKey(cycle) {
        return cycle.join(' -> ');
}

function isActionableOrphan(relPath) {
        if (!relPath) return false;
        if ((!relPath.endsWith('.ts') && !relPath.endsWith('.tsx')) || relPath.endsWith('.d.ts')) return false;
        if (relPath.includes('/__tests__/') || relPath.includes('/tests/')) return false;
        if (relPath.includes('/__fixtures__/') || relPath.includes('/fixtures/')) return false;
        if (relPath.includes('/__mocks__/') || relPath.includes('/mocks/')) return false;
        if (relPath.includes('/__generated__/')) return false;
        return true;
}

async function analyzeDependencies() {
        const result = await madge(analysisRoots, madgeOptions);
        const canonicalCycles = sortCycles(result.circular().map((cycle) => canonicalizeCycle(cycle)));
        const orphanList = sortOrphans(
                result
                        .orphans()
                        .map((entry) => normalizePath(entry))
                        .filter((entry) => isActionableOrphan(entry)),
        );
        const warnings = typeof result.warnings === 'function' ? result.warnings() : {};
        const warningSummary = Object.fromEntries(
                Object.entries(warnings).map(([key, value]) => [
                        key,
                        Array.isArray(value)
                                ? value.length
                                : typeof value === 'number'
                                  ? value
                                  : Array.isArray(value?.skipped)
                                        ? value.skipped.length
                                        : 0,
                ]),
        );
        return {
                generatedAt: new Date().toISOString(),
                config: {
                        roots: analysisRoots.map((root) => normalizePath(root) || '.'),
                        excludeRegExp: excludePatterns,
                        fileExtensions: madgeOptions.fileExtensions,
                        includeNpm: madgeOptions.includeNpm,
                        tsConfig: normalizePath(madgeOptions.tsConfig),
                },
                totals: {
                        circular: canonicalCycles.length,
                        orphans: orphanList.length,
                },
                warnings: warningSummary,
                issues: {
                        circular: canonicalCycles,
                        orphans: orphanList,
                },
        };
}

function ensureBaselineDir() {
        if (!existsSync(baselineDir)) {
                mkdirSync(baselineDir, { recursive: true });
        }
}

function writeBaseline(payload) {
        ensureBaselineDir();
        writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function loadBaseline() {
        if (!existsSync(baselinePath)) return null;
        try {
                const raw = JSON.parse(readFileSync(baselinePath, 'utf8'));
                const canonical = {
                        circular: sortCycles((raw.issues?.circular ?? []).map((cycle) => canonicalizeCycle(cycle))),
                        orphans: sortOrphans((raw.issues?.orphans ?? []).map((entry) => normalizePath(entry))),
                };
                return { raw, canonical };
        } catch (error) {
                throw new Error(`Failed to parse baseline at ${baselinePath}: ${error.message}`);
        }
}

function diffIssues(baselineIssues, currentIssues) {
        const baselineCycleMap = new Map(
                baselineIssues.circular.map((cycle) => [cycleKey(cycle), cycle]),
        );
        const currentCycleMap = new Map(currentIssues.circular.map((cycle) => [cycleKey(cycle), cycle]));
        const newCircular = currentIssues.circular.filter((cycle) => !baselineCycleMap.has(cycleKey(cycle)));
        const resolvedCircular = Array.from(baselineCycleMap.entries())
                .filter(([key]) => !currentCycleMap.has(key))
                .map(([, cycle]) => cycle);

        const baselineOrphanSet = new Set(baselineIssues.orphans);
        const currentOrphanSet = new Set(currentIssues.orphans);
        const newOrphans = currentIssues.orphans.filter((orphan) => !baselineOrphanSet.has(orphan));
        const resolvedOrphans = Array.from(baselineOrphanSet)
                .filter((orphan) => !currentOrphanSet.has(orphan))
                .sort((a, b) => a.localeCompare(b));

        return { newCircular, resolvedCircular, newOrphans, resolvedOrphans };
}

function logList(label, items, formatter = (value) => value) {
        console.log(label);
        items.forEach((item) => {
                console.log(`  - ${formatter(item)}`);
        });
}

async function main() {
        const args = new Set(process.argv.slice(2));
        const updateBaseline = args.has('--update-baseline') || args.has('--refresh-baseline');

        const current = await analyzeDependencies();
        console.log(`[dependency:audit] Circular dependencies: ${current.totals.circular}`);
        console.log(`[dependency:audit] Orphan modules: ${current.totals.orphans}`);
        const warningKeys = Object.keys(current.warnings || {});
        if (warningKeys.length > 0) {
                console.log(
                        `[dependency:audit] Madge warnings: ${warningKeys
                                .map((key) => `${key}=${current.warnings[key]}`)
                                .join(', ')}`,
                );
        } else {
                console.log('[brAInwav dependency:audit] Madge warnings: none');
        }

        const baseline = loadBaseline();
        if (!baseline) {
                writeBaseline(current);
                console.log(
                        `[dependency:audit] Baseline created at ${normalizePath(baselinePath)}. ` +
                                'Existing cycles/orphans recorded for follow-up triage.',
                );
                console.log('[brAInwav][dependency:audit] Re-run after addressing issues to fail on regressions.');
                return;
        }

        if (updateBaseline) {
                writeBaseline(current);
                console.log(`[brAInwav dependency:audit] Baseline updated at ${normalizePath(baselinePath)}.`);
                return;
        }

        const diff = diffIssues(baseline.canonical, current.issues);
        let failed = false;

        if (diff.newCircular.length > 0) {
                failed = true;
                console.error('❌ New circular dependencies detected:');
                diff.newCircular.forEach((cycle) => {
                        console.error(`  - ${cycleKey(cycle)}`);
                });
        }

        if (diff.newOrphans.length > 0) {
                failed = true;
                console.error('❌ New orphan modules detected:');
                diff.newOrphans.forEach((orphan) => {
                        console.error(`  - ${orphan}`);
                });
        }

        if (!failed) {
                console.log('[brAInwav][dependency:audit] No new dependency structural issues detected.');
        } else {
                console.error(
                        '[brAInwav] 🚫 Dependency audit failed. Resolve the issues above or refresh the baseline once they are triaged.',
                );
                process.exitCode = 1;
        }

        if (diff.resolvedCircular.length > 0 || diff.resolvedOrphans.length > 0) {
                console.log('[dependency:audit] ✅ Some baseline issues were resolved.');
                if (diff.resolvedCircular.length > 0) {
                        logList('Resolved circular dependencies:', diff.resolvedCircular, (cycle) => cycleKey(cycle));
                }
                if (diff.resolvedOrphans.length > 0) {
                        logList('Resolved orphan modules:', diff.resolvedOrphans);
                }
                console.log(
                        '[dependency:audit] Run "pnpm dependency:audit --update-baseline" after verifying the fixes to refresh baseline data.',
                );
        }
}

main().catch((error) => {
        console.error('[brAInwav dependency:audit] Unexpected failure:', error?.stack || error);
        process.exitCode = 2;
});
