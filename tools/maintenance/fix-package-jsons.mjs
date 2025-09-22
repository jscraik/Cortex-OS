#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'reports']);
const TARGET_DIRS = ['packages', 'libs', 'apps'];

const isIgnored = (p) => {
    return p.split(path.sep).some((seg) => IGNORED_DIRS.has(seg));
};

async function walk(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (isIgnored(full)) continue;
        if (ent.isDirectory()) {
            out.push(...(await walk(full)));
        } else if (ent.isFile() && ent.name === 'package.json') {
            out.push(full);
        }
    }
    return out;
}

function tryParse(text) {
    try {
        return { ok: true, data: JSON.parse(text) };
    } catch (e) {
        return { ok: false, error: e };
    }
}

function sanitize(text) {
    // Remove BOM and NULs
    let t = text.replace(/\u0000/g, '');
    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
    return t;
}

function trimToLastBrace(text) {
    const idx = text.lastIndexOf('}');
    if (idx === -1) return text;
    return text.slice(0, idx + 1);
}

async function fixFile(file) {
    const original = await fs.readFile(file, 'utf8');
    let txt = sanitize(original);
    let parsed = tryParse(txt);
    if (parsed.ok) return { file, status: 'ok' };

    // Attempt trimming to last closing brace
    const trimmed = trimToLastBrace(txt);
    if (trimmed !== txt) {
        parsed = tryParse(trimmed);
        if (parsed.ok) {
            const normalized = JSON.stringify(parsed.data, null, 2) + '\n';
            await fs.writeFile(file, normalized, 'utf8');
            return { file, status: 'fixed', method: 'trim-last-brace' };
        }
    }

    // As a last resort, attempt to find the first valid JSON substring
    // by progressively shrinking from the end.
    for (let i = txt.length - 1; i >= 0 && i > txt.length - 2048; i--) {
        const slice = txt.slice(0, i);
        const res = tryParse(slice);
        if (res.ok) {
            const normalized = JSON.stringify(res.data, null, 2) + '\n';
            await fs.writeFile(file, normalized, 'utf8');
            return { file, status: 'fixed', method: 'shrink' };
        }
    }

    return { file, status: 'failed', error: parsed.error?.message };
}

async function main() {
    const roots = TARGET_DIRS.map((d) => path.join(ROOT, d));
    const exists = async (p) => !!(await fs
        .stat(p)
        .then((s) => s.isDirectory())
        .catch(() => false));

    const toScan = [];
    for (const r of roots) {
        if (await exists(r)) toScan.push(r);
    }
    const files = [];
    for (const r of toScan) {
        files.push(...(await walk(r)));
    }

    const results = [];
    for (const f of files) {
        // Skip if under node_modules (double-check)
        if (f.includes(`${path.sep}node_modules${path.sep}`)) continue;
        // Attempt a quick read + parse; only fix if broken
        const content = await fs.readFile(f, 'utf8');
        const res = tryParse(content);
        if (res.ok) continue;
        // Try to fix
        const fixed = await fixFile(f);
        results.push(fixed);
    }

    const summary = {
        scanned: files.length,
        fixed: results.filter((r) => r.status === 'fixed').length,
        failed: results.filter((r) => r.status === 'failed').length,
    };
    console.log('[fix-package-jsons] Summary:', summary);
    if (results.length) {
        for (const r of results) {
            console.log('-', r.status, r.method ? `(${r.method})` : '', r.file, r.error ? `=> ${r.error}` : '');
        }
    } else {
        console.log('[fix-package-jsons] No malformed package.json files detected.');
    }
}

main().catch((err) => {
    console.error('[fix-package-jsons] Fatal error:', err);
    process.exit(1);
});
