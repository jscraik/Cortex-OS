import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_PATTERNS = [/\bTODO\b/i, /\bFIXME\b/i];
const BASELINE_PATH = path.resolve(__dirname, '__fixtures__/todo-baseline.json');

const RUNTIME_GLOBS = [
        'apps/**/src/**/*.{ts,tsx,js,jsx}',
        'packages/**/src/**/*.{ts,tsx,js,jsx}',
        'services/**/src/**/*.{ts,tsx,js,jsx}',
        'servers/**/src/**/*.{ts,tsx,js,jsx}',
        'libs/**/src/**/*.{ts,tsx,js,jsx}',
];

const IGNORE_GLOBS = [
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        '**/dist/**',
        '**/build/**',
        '**/generated/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/migrations/**',
        'tests/**',
        'docs/**',
        'examples/**',
];

describe('Security regression: TODO/FIXME banned in runtime code', () => {
        it('fails when TODO or FIXME markers exist in runtime paths', async () => {
                const repoRoot = path.resolve(__dirname, '..', '..');
                const runtimeFiles = await fg(RUNTIME_GLOBS, {
                        cwd: repoRoot,
                        ignore: IGNORE_GLOBS,
                        onlyFiles: true,
                        absolute: true,
                });

                const baseline = loadBaseline();
                const baselineKeys = new Set(baseline.map((entry) => createKey(entry.file, entry.line, entry.token)));
                const violations: Array<{ file: string; line: number; token: string }> = [];

                for (const filePath of runtimeFiles) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const lines = content.split(/\r?\n/);
                        lines.forEach((line, index) => {
                                for (const pattern of FORBIDDEN_PATTERNS) {
                                        if (pattern.test(line)) {
                                                const file = path.relative(repoRoot, filePath);
                                                const token = pattern.source.replace(/\\b/g, '');
                                                violations.push({
                                                        file,
                                                        line: index + 1,
                                                        token,
                                                });
                                                break;
                                        }
                                }
                        });
                }

                const newViolations = violations.filter(
                        (violation) => !baselineKeys.has(createKey(violation.file, violation.line, violation.token)),
                );

                const resolved = baseline.filter(
                        (entry) =>
                                !violations.some((violation) =>
                                        createKey(violation.file, violation.line, violation.token) ===
                                        createKey(entry.file, entry.line, entry.token),
                                ),
                );

                if (resolved.length > 0) {
                        const formattedResolved = resolved
                                .map((entry) => `• ${entry.file}:${entry.line} → ${entry.token}`)
                                .join('\n');
                        console.log(`🎉 brAInwav TODO baseline reduced:\n${formattedResolved}`);
                }

                if (newViolations.length > 0) {
                        const formatted = newViolations
                                .map((violation) => `• ${violation.file}:${violation.line} → ${violation.token}`)
                                .join('\n');

                        throw new Error(
                                'brAInwav security gate detected TODO/FIXME markers in runtime code:\n' +
                                        `${formatted}\nRemove or resolve these markers before merging.`,
                        );
                }

                expect(newViolations).toEqual([]);
        });
});

type BaselineEntry = { file: string; line: number; token: string };

function loadBaseline(): BaselineEntry[] {
        if (!fs.existsSync(BASELINE_PATH)) {
                return [];
        }
        const raw = fs.readFileSync(BASELINE_PATH, 'utf8');
        try {
                const parsed = JSON.parse(raw) as BaselineEntry[];
                return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
                console.warn('brAInwav TODO baseline parse failure', { error });
                return [];
        }
}

function createKey(file: string, line: number, token: string): string {
        return `${file}::${line}::${token}`;
}
