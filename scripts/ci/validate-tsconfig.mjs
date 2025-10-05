#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { validateTsconfigs } from './tsconfig-validator.mjs';

async function main() {
    const args = process.argv.slice(2);
    const fix = args.includes('--fix');
    function parsePreviewMode(argv) {
        const p = argv.find((a) => a.startsWith('--preview'));
        if (p) {
            const parts = p.split('=');
            return parts.length > 1 ? parts[1] : 'diff';
        }
        if (argv.includes('--dry')) return 'diff';
        return undefined;
    }
    const previewMode = parsePreviewMode(args);
    const rootArgIndex = args.indexOf('--root');
    const root = rootArgIndex !== -1 && args.length > rootArgIndex + 1
        ? path.resolve(process.cwd(), args[rootArgIndex + 1])
        : process.cwd();
    const out = await validateTsconfigs({ root, fix, preview: !!previewMode, previewMode });
    const reportDir = path.resolve(process.cwd(), 'reports', 'logs');
    try {
        fs.mkdirSync(reportDir, { recursive: true });
    } catch {
        // ignore: best-effort report directory creation
    }
    const reportPath = path.join(reportDir, 'tsconfig-validator.txt');
    const lines = [];
    lines.push(`brAInwav: tsconfig validator report - ${new Date().toISOString()}`);
    lines.push(`scanned: ${out.files.length} files`);
    lines.push('');
    if (out.failures.length === 0) {
        lines.push('Result: OK — no issues found.');
        fs.writeFileSync(reportPath, lines.join('\n'));
        console.log('brAInwav: tsconfig validator passed — no issues found.');
        process.exit(0);
    }
    lines.push('Result: FAIL — issues discovered:');
    for (const f of out.failures) {
        lines.push(`- ${f.file}: ${f.reason}`);
    }
    if (out.diffs && out.diffs.length > 0) {
        lines.push('\nPreview of intended fixes:');
        for (const d of out.diffs) {
            lines.push('\n===== ' + d.file + ' =====');
            lines.push(d.diff);
        }
        if (previewMode === 'patch') {
            // Write a consolidated .patch file for reviewers and git apply
            const patchPath = path.join(reportDir, 'tsconfig-validator.patch');
            const allPatches = out.diffs.map((d) => d.diff).join('\n\n');
            fs.writeFileSync(patchPath, allPatches);
            lines.push('\nPatch file written to: ' + patchPath);
        }
    }
    fs.writeFileSync(reportPath, lines.join('\n'));
    console.error('brAInwav: tsconfig validator failed — see', reportPath);
    // If preview mode, exit 0 so local inspections do not fail scripts.
    process.exit(previewMode ? 0 : 1);
}

main().catch((err) => {
    console.error('brAInwav: tsconfig validator error:', err);
    process.exit(2);
});
