import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isBashAllowed, isFileAllowed } from '../src/security.js';

describe('isBashAllowed', () => {
        it('allows any command when Bash(*) is present', () => {
                expect(isBashAllowed('git status', ['Bash(*)'])).toBe(true);
                expect(isBashAllowed('npm run build', [' Bash(*) '])).toBe(true);
        });

        it('permits commands matching the specified prefix', () => {
                expect(isBashAllowed('git status --short', ['Bash(git status:*)'])).toBe(true);
                expect(isBashAllowed('git commit -m "msg"', ['Bash(git commit: -m *)'])).toBe(true);
        });

        it('rejects commands that are not explicitly allowed', () => {
                expect(isBashAllowed('rm -rf /', ['Bash(git status:*)'])).toBe(false);
                expect(isBashAllowed('ls', undefined)).toBe(false);
        });
});

describe('isFileAllowed', () => {
        const workspace = process.cwd();
        const readmePath = path.join(workspace, 'README.md');
        const docsGuide = path.join(workspace, 'docs', 'guide.md');

        it('matches absolute, relative, and basename patterns', () => {
                expect(isFileAllowed(readmePath, ['README.md'])).toBe(true);
                expect(isFileAllowed(docsGuide, ['docs/**/*.md'])).toBe(true);
                expect(isFileAllowed(docsGuide, ['**/*.md'])).toBe(true);
        });

        it('returns false when no allowlist entry matches', () => {
                const secretPath = path.join(workspace, 'secrets', 'secret.env');
                expect(isFileAllowed(secretPath, ['docs/**'])).toBe(false);
                expect(isFileAllowed(secretPath, [])).toBe(false);
        });
});
