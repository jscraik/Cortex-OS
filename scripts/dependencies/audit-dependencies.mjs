#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import fg from 'fast-glob';
import madge from 'madge';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const tsconfigPath = resolve(repoRoot, 'tsconfig.base.json');
const lockfilePath = resolve(repoRoot, 'pnpm-lock.yaml');

function heading(title) {
        console.log(`\n=== ${title} ===`);
}

function formatCycles(cycles) {
        return cycles
                .map((cycle) =>
                        cycle
                                .map((entry) =>
                                        entry.startsWith('.') || entry.startsWith('/')
                                                ? relative(repoRoot, resolve(repoRoot, entry))
                                                : entry,
                                )
                                .join(' -> '),
                )
                .sort();
}

async function checkImports() {
        const importStart = performance.now();
        const entryGlobs = [
                'packages/*/src/index.{ts,tsx}',
                'packages/*/src/main.{ts,tsx}',
                'packages/*/src/lib/index.{ts,tsx}',
                'apps/*/src/main.{ts,tsx}',
                'apps/*/src/index.{ts,tsx}',
                'src/index.{ts,tsx}',
        ];

        const entries = await fg(entryGlobs, {
                cwd: repoRoot,
                absolute: true,
                unique: true,
        });

        heading('Import graph analysis');

        if (entries.length === 0) {
                console.warn('No entry points found for madge import analysis.');
                return { cycles: [], orphans: [], skipped: [], notFound: [] };
        }

        const result = await madge(entries, {
                baseDir: repoRoot,
                tsConfig: tsconfigPath,
                fileExtensions: ['ts', 'tsx'],
                detectiveOptions: {
                        ts: { skipTypeImports: false },
                },
                includeNpm: false,
        });

        const cycles = typeof result.circular === 'function' ? await result.circular() : [];
        const orphans = typeof result.orphans === 'function' ? await result.orphans() : [];
        let skipped = [];
        if (typeof result.skipped === 'function') {
                skipped = (await result.skipped()) ?? [];
        } else if (Array.isArray(result.skipped)) {
                skipped = result.skipped;
        }
        const notFound = typeof result.notFound === 'function' ? await result.notFound() : {};

        if (cycles.length === 0) {
                console.log('✔ No circular dependencies detected across analyzed entry points.');
        } else {
                console.log('✖ Circular dependencies detected:');
                for (const cycle of formatCycles(cycles)) {
                        console.log(`  - ${cycle}`);
                }
        }

        if (orphans.length === 0) {
                console.log('✔ No orphaned modules detected.');
        } else {
                console.log('⚠️ Orphaned modules (no imports):');
                for (const orphan of orphans) {
                        console.log(`  - ${orphan}`);
                }
        }

        if (skipped.length > 0) {
                console.log('ℹ️ Skipped entries during analysis:');
                for (const entry of skipped) {
                        console.log(`  - ${entry}`);
                }
        }

        const missing = Object.entries(notFound ?? {});
        if (missing.length > 0) {
                console.log('⚠️ Unresolved import targets:');
                for (const [source, targets] of missing) {
                        console.log(`  - ${source}`);
                        for (const target of targets) {
                                console.log(`      • ${target}`);
                        }
                }
        } else {
                console.log('✔ No unresolved import targets detected.');
        }

        const importDurationMs = Math.round(performance.now() - importStart);
        console.log(`Import graph analysis completed in ${importDurationMs}ms.`);

        return { cycles, orphans, skipped, notFound };
}

function parsePnpmKey(key) {
        if (!key.startsWith('/')) return null;
        const trimmed = key.slice(1);
        const lastAt = trimmed.lastIndexOf('@');
        if (lastAt === -1) return null;
        const name = trimmed.slice(0, lastAt);
        const version = trimmed.slice(lastAt + 1);
        return { name, version };
}

async function analyzeLockfile() {
        heading('Lockfile divergence check');
        const content = await readFile(lockfilePath, 'utf8');
        const parsed = YAML.parse(content);
        const packages = parsed?.packages ?? {};
        const versionMap = new Map();

        for (const key of Object.keys(packages)) {
                const parsedKey = parsePnpmKey(key);
                if (!parsedKey) continue;
                const versions = versionMap.get(parsedKey.name) ?? new Set();
                versions.add(parsedKey.version);
                versionMap.set(parsedKey.name, versions);
        }

        const multiVersion = Array.from(versionMap.entries())
                .map(([name, versions]) => ({ name, versions: Array.from(versions).sort() }))
                .filter((entry) => entry.versions.length > 1)
                .sort((a, b) => a.name.localeCompare(b.name));

        if (multiVersion.length === 0) {
                console.log('✔ No packages have multiple versions pinned in pnpm-lock.yaml.');
        } else {
                console.log('⚠️ Packages with multiple versions detected:');
                for (const entry of multiVersion) {
                        console.log(`  - ${entry.name}: ${entry.versions.join(', ')}`);
                }
                console.log(
                        '\nConsider deduping the above packages or verifying that version skew is intentional. `pnpm dedupe --check` may help.',
                );
        }

        return { multiVersion };
}

async function main() {
        try {
                const importReport = await checkImports();
                const lockReport = await analyzeLockfile();

                const hasCycles = (importReport.cycles ?? []).length > 0;
                const hasMissing = Object.keys(importReport.notFound ?? {}).length > 0;
                const hasConflicts = (lockReport.multiVersion ?? []).length > 0;

                if (hasCycles || hasMissing || hasConflicts) {
                        console.log('\nDependency audit finished with findings.');
                        if (hasCycles) console.log(' - Circular dependencies present.');
                        if (hasMissing) console.log(' - Unresolved import targets present.');
                        if (hasConflicts) console.log(' - Multiple versions detected in lockfile.');
                        process.exitCode = 1;
                } else {
                        console.log('\nDependency audit completed successfully with no findings.');
                }
        } catch (error) {
                console.error('Dependency audit failed to complete:', error);
                process.exitCode = 1;
        }
}

await main();
