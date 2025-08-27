import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { globby } from 'globby';

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

// Import the enhanced structure guard functions
const { validateDeniedFiles, validateAllowedFiles, validateProtectedFiles, validatePackageStructure, validateRootEntries } = await import('../../tools/structure-guard/guard-enhanced');

describe('structure guard validation functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should validate denied files correctly', async () => {
    const policy = JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'));
    
    // Mock the policy in the validation functions
    const originalReadFileSync = readFileSync;
    vi.mocked(readFileSync).mockImplementation((path: string) => {
      if (path.includes('policy.json')) {
        return JSON.stringify(policy);
      }
      return originalReadFileSync(path as any, 'utf8');
    });
    
    const deniedFiles = validateDeniedFiles(mockFiles);
    expect(deniedFiles).toContain('secrets/cred.secret');
  });

  it('should validate allowed files correctly', async () => {
    const policy = JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'));
    
    // Mock the policy in the validation functions
    const originalReadFileSync = readFileSync;
    vi.mocked(readFileSync).mockImplementation((path: string) => {
      if (path.includes('policy.json')) {
        return JSON.stringify(policy);
      }
      return originalReadFileSync(path as any, 'utf8');
    });
    
    const disallowedFiles = validateAllowedFiles(mockFiles);
    expect(disallowedFiles).toContain('random-file.txt');
  });

  it('should validate protected files correctly', async () => {
    const policy = JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'));
    
    // Mock the policy in the validation functions
    const originalReadFileSync = readFileSync;
    vi.mocked(readFileSync).mockImplementation((path: string) => {
      if (path.includes('policy.json')) {
        return JSON.stringify(policy);
      }
      return originalReadFileSync(path as any, 'utf8');
    });
    
    const missingProtected = validateProtectedFiles(mockFiles);
    // In our mock, all protected files are present, so this should be empty
    expect(missingProtected).toEqual([]);
  });

  it('should validate package structure correctly', async () => {
    const policy = JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'));
    
    // Mock the policy in the validation functions
    const originalReadFileSync = readFileSync;
    vi.mocked(readFileSync).mockImplementation((path: string) => {
      if (path.includes('policy.json')) {
        return JSON.stringify(policy);
      }
      return originalReadFileSync(path as any, 'utf8');
    });
    
    const packageStructureErrors = validatePackageStructure(mockFiles);
    
    // Check that we correctly identify packages
    const packageNames = packageStructureErrors.map(e => e.packageName);
    expect(packageNames).toContain('memories');
    expect(packageNames).toContain('a2a');
  });

  it('should validate root entries correctly', async () => {
    const policy = JSON.parse(readFileSync('tools/structure-guard/policy.json', 'utf8'));
    
    // Mock the policy in the validation functions
    const originalReadFileSync = readFileSync;
    vi.mocked(readFileSync).mockImplementation((path: string) => {
      if (path.includes('policy.json')) {
        return JSON.stringify(policy);
      }
      return originalReadFileSync(path as any, 'utf8');
    });
    
    const disallowedRootEntries = validateRootEntries(mockFiles);
    // In our mock, all root entries are allowed, so this should be empty
    expect(disallowedRootEntries).toEqual([]);
  });
});