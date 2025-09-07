#!/usr/bin/env node
/**
 * Playbook Consistency Check
 *
 * Guards:
 * 1. No reach-through imports across feature packages (apps/cortex-os/packages/<feature>) using relative paths that traverse up into siblings (e.g. ../otherFeature)
 * 2. No direct infra layer imports from another feature (e.g. packages/foo/src/infra/* imported by packages/bar)
 * 3. Warn (not fail) on overly small new feature packages (<3 .ts source files) to nudge consolidation
 *
 * Exit codes:
 * 0 = OK (no violations; warnings may exist)
 * 1 = Violations found
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const featureRoot = path.join(root, 'apps', 'cortex-os', 'packages');

function* walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
            yield* walk(full);
        } else if (e.isFile() && /\.[cm]?tsx?$/.test(e.name)) {
            yield full;
        }
    }
}

function read(file) {
    return fs.readFileSync(file, 'utf8');
}

const violations = [];
const warnings = [];
const featureInfraPaths = new Map(); // feature -> infra absolute path

if (!fs.existsSync(featureRoot)) {
    console.error('[check-playbook] feature root not found:', featureRoot);
    process.exit(0); // skip gracefully
}

const featureDirs = fs.readdirSync(featureRoot).filter(d => fs.statSync(path.join(featureRoot, d)).isDirectory());

for (const feature of featureDirs) {
    const featurePath = path.join(featureRoot, feature);
    const infraPath = path.join(featurePath, 'src', 'infra');
    featureInfraPaths.set(feature, infraPath);
    const sourceFiles = Array.from(walk(featurePath));

    // Small package warning
    const tsSources = sourceFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'))
        .filter(f => !f.includes('__tests__'));
    if (tsSources.length > 0 && tsSources.length < 3) {
        warnings.push(`Feature package '${feature}' has only ${tsSources.length} source files (<3). Consider merging until boundary is clear.`);
    }

    const handleImport = (params) => {
        const { spec, file, rel, idx } = params;
        // reach-through sibling feature via relative path
        if (spec.startsWith('..')) {
            const resolved = path.normalize(path.join(path.dirname(file), spec));
            if (resolved.startsWith(featureRoot)) {
                const parts = path.relative(featureRoot, resolved).split(path.sep);
                const targetFeature = parts[0];
                if (targetFeature && targetFeature !== feature) {
                    violations.push(`${rel}:${idx + 1} reach-through relative import to sibling feature '${targetFeature}' -> '${spec}'`);
                }
            }
        }
        // cross-feature infra import
        if (spec.startsWith('.') && spec.includes('/infra/')) {
            const resolved = path.normalize(path.join(path.dirname(file), spec));
            if (!resolved.startsWith(featurePath) && resolved.startsWith(featureRoot)) {
                const parts = path.relative(featureRoot, resolved).split(path.sep);
                const targetFeature = parts[0];
                if (targetFeature !== feature) {
                    violations.push(`${rel}:${idx + 1} direct infra import from feature '${targetFeature}' -> '${spec}'`);
                }
            }
        }
    };

    for (const file of sourceFiles) {
        const rel = path.relative(root, file);
        const lines = read(file).split(/\r?\n/);
        lines.forEach((line, idx) => {
            const m = line.match(/import\s+[^'"`]*from\s+['"](.+?)['"]/);
            if (m) handleImport({ spec: m[1], file, rel, idx });
        });
    }
}

// SECOND PASS: detect imports targeting any feature's infra from outside that feature root
// Strategy: regex scan all ts/tsx files under repo (limited to apps/cortex-os/packages & packages/) and identify patterns ending with /src/infra or deeper inside it
function collectAllTsFiles(dir, acc = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) collectAllTsFiles(full, acc); else if (/\.[cm]?tsx?$/.test(e.name)) acc.push(full);
    }
    return acc;
}

const scanRoots = [path.join(root, 'apps', 'cortex-os', 'packages'), path.join(root, 'packages')].filter(p => fs.existsSync(p));
const globalFiles = scanRoots.flatMap(r => collectAllTsFiles(r));

for (const f of globalFiles) {
    const content = read(f);
    const rel = path.relative(root, f);
    const importRegex = /import\s+[^'"`]*from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content))) {
        const spec = match[1];
        if (!spec.startsWith('.')) continue; // only relative for deep infra
        const resolved = path.normalize(path.join(path.dirname(f), spec));
        for (const [feature, infraAbs] of featureInfraPaths.entries()) {
            if (resolved.startsWith(infraAbs)) {
                // If file itself is not inside the same feature root, violation
                const featureRootPath = path.join(featureRoot, feature);
                if (!f.startsWith(featureRootPath)) {
                    violations.push(`${rel}: import into ${feature}/src/infra from outside feature -> '${spec}'`);
                }
            }
        }
    }
}

if (warnings.length) {
    console.warn('\n[check-playbook] Warnings:');
    for (const w of warnings) console.warn('  -', w);
}

if (violations.length) {
    console.error('\n[check-playbook] Violations:');
    for (const v of violations) console.error('  -', v);
    console.error(`\n[check-playbook] ✖ ${violations.length} violation(s) found.`);
    process.exit(1);
}

console.log('\n[check-playbook] ✓ No violations found.');
process.exit(0);
