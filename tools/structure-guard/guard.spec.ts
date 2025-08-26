import { describe, it, expect } from 'vitest';
import micromatch from 'micromatch';

describe('protected globs', () => {
  const patterns = [
    'pnpm-workspace.yaml',
    'tools/structure-guard/**/*',
    'docs/architecture/decisions/*.md',
    '.github/CODEOWNERS'
  ];

  it('matches exact files', () => {
    expect(micromatch.isMatch('pnpm-workspace.yaml', patterns)).toBe(true);
    expect(micromatch.isMatch('random.yaml', patterns)).toBe(false);
  });

  it('matches recursive dir globs', () => {
    expect(micromatch.isMatch('tools/structure-guard/policy.json', patterns)).toBe(true);
    expect(micromatch.isMatch('tools/structure-guard/nested/file.ts', patterns)).toBe(true);
    expect(micromatch.isMatch('tools/scripts/generate-sbom.ts', patterns)).toBe(false);
  });

  it('matches leaf globs', () => {
    expect(micromatch.isMatch('docs/architecture/decisions/001-adr.md', patterns)).toBe(true);
    expect(micromatch.isMatch('docs/architecture/decisions/deep/002.md', patterns)).toBe(false);
  });

  it('matches dotfiles', () => {
    expect(micromatch.isMatch('.github/CODEOWNERS', patterns, { dot: true } as any)).toBe(true);
  });
});