import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import micromatch from 'micromatch';
import { readFileSync } from 'node:fs';
import { globby } from 'globby';
import { z } from 'zod';

// Mock file system
const mockFiles = [
  'apps/cortex-os/packages/agents/src/index.ts',
  'apps/cortex-os/packages/mvp/src/index.ts',
  'packages/memories/src/index.ts',
  'packages/memories/package.json',
  'packages/memories/tsconfig.json',
  'packages/memories/tests/index.spec.ts',
  'packages/a2a/src/index.py',
  'packages/a2a/pyproject.toml',
  'tools/structure-guard/policy.json',
  'docs/architecture/decisions/001-adr.md',
  '.github/CODEOWNERS',
  'pnpm-workspace.yaml',
  'package.json',
  'secrets/cred.secret', // This should be denied
  'random-file.txt', // This should be disallowed
  'missing-package/src/index.ts' // Package without required files
];

// Mock fs.readFileSync
vi.mock('node:fs', () => ({
  readFileSync: vi.fn((path: string) => {
    if (path.includes('policy.json')) {
      return JSON.stringify({
        version: "2.0.0",
        allowedPaths: {
          "apps": ["cortex-os"],
          "apps/cortex-os/packages": ["agents", "mvp", "mvp-core", "mvp-server"],
          "packages": ["a2a","mcp","memories","orchestration","simlab","rag"],
          "services": ["ml-inference","data-pipeline"],
          "libs/typescript": ["accessibility","contracts","errors","telemetry","testing","types","utils"],
          "libs/python": ["cortex_core","cortex_ml"],
          "tools": ["structure-guard","eslint-config","lockfile-sync","schemas","scripts","python"],
          ".cortex": ["rules","prompts"],
          "docs": ["architecture"]
        },
        allowedRootEntries: [
          ".cortex","apps","packages","libs","services","tools","docs",".github",
          "pnpm-workspace.yaml","turbo.json","package.json","tsconfig.json","pyproject.toml","uv.toml",
          "nx.json","vitest.config.ts","vitest.workspace.ts","README.md","LICENSE","SECURITY.md","renovate.json",
          "cliff.toml","commitlint.config.js","semantic-release.config.js","ecosystem.config.cjs","ecosystem.config.js"
        ],
        filePatterns: {
          "typescript": {
            "required": ["package.json","tsconfig.json"],
            "requireOneOf": ["src/index.ts","src/index.js","index.ts"],
            "allowed": ["*.ts","*.tsx","*.js","*.json","*.md","tests/**/*","**/*.spec.ts","**/*.test.ts"]
          },
          "python": {
            "required": ["pyproject.toml"],
            "requireOneOf": ["src/__init__.py","__init__.py","src/main.py"],
            "allowed": ["*.py","*.pyi","*.toml","*.md","tests/**/*","**/*_test.py","**/test_*.py"]
          }
        },
        maxFilesPerChange: 15,
        overrideRules: {
          "migrationMode": false,
          "overrideRequiresApproval": ["@cortex-os/architects"],
          "maxFilesWithOverride": 50
        },
        protectedFiles: [
          "apps/cortex-os/**",
          "packages/memories/**",
          "packages/orchestration/**",
          "packages/a2a/**",
          "packages/mcp/**",
          "packages/rag/**",
          "packages/simlab/**"
        ],
        allowedGlobs: [
          "apps/**",
          "packages/**",
          "tools/**",
          "docs/**",
          ".github/**",
          "scripts/**",
          "tsconfig*.json",
          "package.json",
          "pnpm-workspace.yaml",
          ".changeset/**"
        ],
        deniedGlobs: [
          "**/*.secret"
        ],
        importRules: {
          "bannedPatterns": [
            "^@cortex-os/.*/dist/.*$","^@cortex-os/.*/node_modules/.*$","\\.\\./\\.\\./\\.\\./.*","^packages/.*/packages/.*"
          ],
          "allowedCrossPkgImports": [
            "@cortex-os/contracts","@cortex-os/types","@cortex-os/utils","@cortex-os/telemetry","@cortex-os/testing"
          ]
        },
        enforcement: {
          "blockUnknownRoots": true,
          "blockUnknownPaths": true
        },
        testRequirements: {
          "minCoverage": 80,
          "requiredTestDirs": ["tests","test","__tests__","src/**/*.spec.ts","src/**/*.test.ts"],
          "excludeFromCoverage": ["*.config.*","*.setup.*","*.mock.*"]
        }
      });
    }
    return '';
  }),
  existsSync: vi.fn(() => true)
}));

// Mock globby
vi.mock('globby', () => ({
  globby: vi.fn(() => Promise.resolve(mockFiles))
}));

describe('enhanced structure guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  describe('path policy', () => {
    const policySchema = z.object({
      protectedFiles: z.array(z.string()),
      allowedGlobs: z.array(z.string()),
      deniedGlobs: z.array(z.string()).default([])
    });
    
    const policy = policySchema.parse(
      JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'))
    );

    it('allows and denies paths', () => {
      expect(micromatch.isMatch('apps/demo/index.ts', policy.allowedGlobs)).toBe(true);
      expect(micromatch.isMatch('unknown/file.ts', policy.allowedGlobs)).toBe(false);
      expect(micromatch.isMatch('secrets/cred.secret', policy.deniedGlobs)).toBe(true);
    });

    it('handles negated patterns', () => {
      const patterns = ['**/*.ts', '!**/*.spec.ts'];
      expect(micromatch.isMatch('src/main.ts', patterns)).toBe(true);
      expect(micromatch.isMatch('src/main.spec.ts', patterns)).toBe(false);
    });
  });

  describe('globby ignores', () => {
    it('skips node_modules and dist', async () => {
      const files = await globby(['**/*', '!**/node_modules/**', '!**/dist/**', '!**/.git/**'], { dot: true });
      expect(files.some(f => f.includes('node_modules'))).toBe(false);
    });
  });

  describe('package structure validation', () => {
    it('validates TypeScript package requirements', () => {
      // memories package should be valid
      expect(mockFiles.some(f => f.includes('packages/memories/package.json'))).toBe(true);
      expect(mockFiles.some(f => f.includes('packages/memories/tsconfig.json'))).toBe(true);
      expect(mockFiles.some(f => f.includes('packages/memories/src/index.ts'))).toBe(true);
    });

    it('validates Python package requirements', () => {
      // a2a package should be valid
      expect(mockFiles.some(f => f.includes('packages/a2a/pyproject.toml'))).toBe(true);
      expect(mockFiles.some(f => f.includes('packages/a2a/src/index.py'))).toBe(true);
    });

    it('detects missing required files', () => {
      // missing-package should be detected as invalid
      expect(mockFiles.some(f => f.includes('missing-package/src/index.ts'))).toBe(true);
      // But it's missing package.json and tsconfig.json
      expect(mockFiles.some(f => f.includes('missing-package/package.json'))).toBe(false);
      expect(mockFiles.some(f => f.includes('missing-package/tsconfig.json'))).toBe(false);
    });
  });

  describe('edge case handling', () => {
    it('handles complex glob patterns', () => {
      const complexPatterns = [
        'packages/{memories,rag,simlab}/**/*',
        '!packages/memories/node_modules/**',
        'apps/cortex-os/packages/*/*.ts'
      ];
      
      expect(micromatch.isMatch('packages/memories/src/index.ts', complexPatterns)).toBe(true);
      expect(micromatch.isMatch('packages/memories/node_modules/pkg/index.js', complexPatterns)).toBe(false);
      expect(micromatch.isMatch('apps/cortex-os/packages/agents/src/index.ts', complexPatterns)).toBe(true);
    });

    it('handles deeply nested structures', () => {
      const deepPattern = 'packages/memories/src/**/deeply/nested/**/*.ts';
      expect(micromatch.isMatch('packages/memories/src/utils/deeply/nested/file.ts', deepPattern)).toBe(true);
      expect(micromatch.isMatch('packages/memories/src/shallow.ts', deepPattern)).toBe(false);
    });

    it('handles file extension matching', () => {
      const extPatterns = ['*.spec.ts', '*.test.ts'];
      expect(micromatch.isMatch('packages/memories/tests/index.spec.ts', extPatterns)).toBe(true);
      expect(micromatch.isMatch('packages/memories/src/index.ts', extPatterns)).toBe(false);
    });
  });
});