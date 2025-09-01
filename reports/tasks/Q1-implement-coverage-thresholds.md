# Task Q1: Implement Strict Coverage Thresholds
**Priority**: HIGH  
**Estimated Time**: 2 days  
**Risk Level**: Low - Quality Enhancement

## Problem Statement
Current test coverage is inconsistent across packages with no enforced thresholds. The system needs:
- 90% coverage thresholds for statements, branches, functions, and lines
- Automated coverage reporting and enforcement
- Per-package coverage tracking
- CI/CD integration for coverage gates

## Test-First Implementation

### Step 1: RED - Write Failing Coverage Tests
```typescript
// tests/quality/coverage-thresholds.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Coverage Thresholds Enforcement', () => {
  const coveragePath = join(process.cwd(), 'coverage/coverage-summary.json');
  
  it('should have coverage summary file after test run', () => {
    expect(existsSync(coveragePath)).toBe(true);
  });

  it('should meet 90% statement coverage threshold', async () => {
    if (!existsSync(coveragePath)) {
      throw new Error('Coverage file not found. Run tests with coverage first.');
    }

    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const totalCoverage = coverage.total;
    
    expect(totalCoverage.statements.pct).toBeGreaterThanOrEqual(90);
  });

  it('should meet 90% branch coverage threshold', async () => {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const totalCoverage = coverage.total;
    
    expect(totalCoverage.branches.pct).toBeGreaterThanOrEqual(90);
  });

  it('should meet 90% function coverage threshold', async () => {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const totalCoverage = coverage.total;
    
    expect(totalCoverage.functions.pct).toBeGreaterThanOrEqual(90);
  });

  it('should meet 90% line coverage threshold', async () => {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const totalCoverage = coverage.total;
    
    expect(totalCoverage.lines.pct).toBeGreaterThanOrEqual(90);
  });

  it('should identify files with insufficient coverage', async () => {
    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const lowCoverageFiles: string[] = [];

    Object.entries(coverage).forEach(([filePath, fileCoverage]: [string, any]) => {
      if (filePath === 'total') return;
      
      const statements = fileCoverage.statements?.pct || 0;
      const branches = fileCoverage.branches?.pct || 0;
      const functions = fileCoverage.functions?.pct || 0;
      const lines = fileCoverage.lines?.pct || 0;

      if (statements < 90 || branches < 90 || functions < 90 || lines < 90) {
        lowCoverageFiles.push(filePath);
      }
    });

    if (lowCoverageFiles.length > 0) {
      console.warn('Files with low coverage:', lowCoverageFiles);
    }

    // Initially this may fail - that's expected (RED phase)
    expect(lowCoverageFiles.length).toBe(0);
  });
});

// Package-specific coverage tests
describe('Per-Package Coverage', () => {
  const criticalPackages = [
    'packages/agents',
    'packages/security',
    'packages/mcp',
    'packages/a2a'
  ];

  criticalPackages.forEach(packagePath => {
    it(`should meet coverage thresholds for ${packagePath}`, async () => {
      const packageCoveragePath = join(process.cwd(), packagePath, 'coverage/coverage-summary.json');
      
      if (!existsSync(packageCoveragePath)) {
        console.warn(`No coverage file found for ${packagePath}`);
        return;
      }

      const coverage = JSON.parse(readFileSync(packageCoveragePath, 'utf-8'));
      const totalCoverage = coverage.total;
      
      expect(totalCoverage.statements.pct).toBeGreaterThanOrEqual(85); // Slightly lower for packages
      expect(totalCoverage.branches.pct).toBeGreaterThanOrEqual(80);
      expect(totalCoverage.functions.pct).toBeGreaterThanOrEqual(85);
      expect(totalCoverage.lines.pct).toBeGreaterThanOrEqual(85);
    });
  });
});
```

### Step 2: GREEN - Implement Coverage Configuration

#### Enhanced Vitest Configuration
```typescript
// vitest.config.ts - Updated root configuration
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Strict worker limits to prevent memory exhaustion
    maxWorkers: 1,
    // Memory management settings
    isolate: true,
    sequence: {
      concurrent: false,
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Coverage configuration with strict thresholds
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary',
        'json',
        'json-summary',
        'html',
        'lcov',
        'clover'
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/tests/**',
        '**/test/**',
        '**/fixtures/**',
        '**/mocks/**',
        '**/__tests__/**',
        '**/*.stories.{js,ts,tsx}',
        // Legacy/generated files
        'libs/**',
        'tools/**',
        'scripts/**',
        '.cortex/**'
      ],
      include: [
        'packages/**/*.{js,ts}',
        'apps/**/*.{js,ts}'
      ],
      // Strict thresholds - fail build if not met
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
        // Prevent coverage from decreasing
        autoUpdate: false,
        // Per-file thresholds
        perFile: true
      },
      // Report uncovered lines
      reportOnFailure: true,
      // Skip files with no tests
      skipFull: false
    },
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', 'tests/**'],
    // Include coverage threshold tests
    include: [
      '**/*.{test,spec}.{js,ts}',
      'tests/quality/coverage-thresholds.test.ts'
    ]
  }
});
```

#### Package-Level Coverage Configurations
```typescript
// packages/agents/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/fixtures/**',
        '**/mocks/**'
      ],
      include: ['src/**/*.{js,ts}'],
      thresholds: {
        statements: 90,
        branches: 85, // Slightly lower for complex agent logic
        functions: 90,
        lines: 90
      }
    }
  }
});
```

#### Updated Package.json Scripts
```json
{
  "scripts": {
    "test": "mise run test",
    "test:watch": "cross-env NODE_OPTIONS=\"--max-old-space-size=2048 --expose-gc\" VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 vitest --no-coverage",
    
    "test:coverage": "cross-env NODE_OPTIONS=\"--max-old-space-size=4096 --expose-gc\" VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 vitest run --coverage --coverage.reporter=text-summary --coverage.reporter=json-summary",
    
    "test:coverage:threshold": "cross-env NODE_OPTIONS=\"--max-old-space-size=4096 --expose-gc\" VITEST_MAX_THREADS=1 VITEST_MIN_THREADS=1 VITEST_MAX_FORKS=1 VITEST_MIN_FORKS=1 vitest run --coverage --coverage.reporter=text-summary --coverage.reporter=json-summary --coverage.thresholds.statements=90 --coverage.thresholds.branches=90 --coverage.thresholds.functions=90 --coverage.thresholds.lines=90",
    
    "test:coverage:report": "vitest run --coverage && open coverage/index.html",
    
    "test:coverage:ci": "cross-env CI=true vitest run --coverage --coverage.reporter=json --coverage.reporter=text-summary --coverage.reporter=lcov",
    
    "coverage:check": "vitest run tests/quality/coverage-thresholds.test.ts",
    
    "coverage:enforce": "pnpm test:coverage:threshold && pnpm coverage:check"
  }
}
```

### Step 3: REFACTOR - Add Coverage Monitoring and Reporting

#### Coverage Monitoring Script
```typescript
// scripts/coverage/monitor-coverage.ts
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CoverageSummary {
  statements: { pct: number; covered: number; total: number };
  branches: { pct: number; covered: number; total: number };
  functions: { pct: number; covered: number; total: number };
  lines: { pct: number; covered: number; total: number };
}

interface CoverageReport {
  total: CoverageSummary;
  [filePath: string]: CoverageSummary;
}

class CoverageMonitor {
  private readonly thresholds = {
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90
  };

  private readonly criticalPaths = [
    'packages/agents/',
    'packages/security/',
    'packages/mcp/',
    'packages/a2a/'
  ];

  async checkCoverage(): Promise<void> {
    const coveragePath = join(process.cwd(), 'coverage/coverage-summary.json');
    
    if (!existsSync(coveragePath)) {
      throw new Error('Coverage summary not found. Run tests with coverage first.');
    }

    const coverage: CoverageReport = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    
    // Check overall coverage
    this.validateOverallCoverage(coverage.total);
    
    // Check per-file coverage
    const lowCoverageFiles = this.findLowCoverageFiles(coverage);
    
    // Check critical paths
    const criticalPathIssues = this.checkCriticalPaths(coverage);
    
    // Generate report
    this.generateCoverageReport(coverage, lowCoverageFiles, criticalPathIssues);
  }

  private validateOverallCoverage(totalCoverage: CoverageSummary): void {
    const failures: string[] = [];
    
    Object.entries(this.thresholds).forEach(([metric, threshold]) => {
      const actual = totalCoverage[metric as keyof CoverageSummary].pct;
      if (actual < threshold) {
        failures.push(`${metric}: ${actual}% (required: ${threshold}%)`);
      }
    });

    if (failures.length > 0) {
      throw new Error(`Coverage thresholds not met:\n${failures.join('\n')}`);
    }
  }

  private findLowCoverageFiles(coverage: CoverageReport): string[] {
    const lowCoverageFiles: string[] = [];

    Object.entries(coverage).forEach(([filePath, fileCoverage]) => {
      if (filePath === 'total') return;
      
      const hasLowCoverage = Object.entries(this.thresholds).some(([metric, threshold]) => {
        const actual = fileCoverage[metric as keyof CoverageSummary].pct;
        return actual < threshold;
      });

      if (hasLowCoverage) {
        lowCoverageFiles.push(filePath);
      }
    });

    return lowCoverageFiles;
  }

  private checkCriticalPaths(coverage: CoverageReport): Array<{ path: string; issues: string[] }> {
    const issues: Array<{ path: string; issues: string[] }> = [];

    this.criticalPaths.forEach(criticalPath => {
      const pathIssues: string[] = [];
      
      Object.entries(coverage).forEach(([filePath, fileCoverage]) => {
        if (filePath === 'total' || !filePath.includes(criticalPath)) return;
        
        Object.entries(this.thresholds).forEach(([metric, threshold]) => {
          const actual = fileCoverage[metric as keyof CoverageSummary].pct;
          if (actual < threshold) {
            pathIssues.push(`${filePath}: ${metric} ${actual}% (required: ${threshold}%)`);
          }
        });
      });

      if (pathIssues.length > 0) {
        issues.push({ path: criticalPath, issues: pathIssues });
      }
    });

    return issues;
  }

  private generateCoverageReport(
    coverage: CoverageReport,
    lowCoverageFiles: string[],
    criticalPathIssues: Array<{ path: string; issues: string[] }>
  ): void {
    const report = {
      timestamp: new Date().toISOString(),
      overall: coverage.total,
      thresholds: this.thresholds,
      lowCoverageFiles,
      criticalPathIssues,
      summary: {
        totalFiles: Object.keys(coverage).length - 1, // Exclude 'total'
        filesWithLowCoverage: lowCoverageFiles.length,
        criticalPathsWithIssues: criticalPathIssues.length
      }
    };

    // Save detailed report
    writeFileSync(
      'coverage/coverage-analysis.json',
      JSON.stringify(report, null, 2)
    );

    // Generate human-readable report
    const humanReport = this.generateHumanReadableReport(report);
    writeFileSync('coverage/coverage-report.md', humanReport);

    console.log('✅ Coverage analysis complete');
    console.log(`📊 Overall coverage: ${coverage.total.statements.pct}% statements, ${coverage.total.branches.pct}% branches`);
    
    if (lowCoverageFiles.length > 0) {
      console.warn(`⚠️  ${lowCoverageFiles.length} files below coverage thresholds`);
    }
    
    if (criticalPathIssues.length > 0) {
      console.error(`❌ ${criticalPathIssues.length} critical paths have coverage issues`);
    }
  }

  private generateHumanReadableReport(report: any): string {
    return `# Coverage Report
Generated: ${report.timestamp}

## Overall Coverage
- Statements: ${report.overall.statements.pct}% (${report.overall.statements.covered}/${report.overall.statements.total})
- Branches: ${report.overall.branches.pct}% (${report.overall.branches.covered}/${report.overall.branches.total})
- Functions: ${report.overall.functions.pct}% (${report.overall.functions.covered}/${report.overall.functions.total})
- Lines: ${report.overall.lines.pct}% (${report.overall.lines.covered}/${report.overall.lines.total})

## Thresholds
- Required: ${Object.entries(report.thresholds).map(([k, v]) => `${k}: ${v}%`).join(', ')}

## Files Below Threshold (${report.lowCoverageFiles.length})
${report.lowCoverageFiles.map((file: string) => `- ${file}`).join('\n')}

## Critical Path Issues (${report.criticalPathIssues.length})
${report.criticalPathIssues.map((issue: any) => `
### ${issue.path}
${issue.issues.map((i: string) => `- ${i}`).join('\n')}
`).join('\n')}

## Summary
- Total files: ${report.summary.totalFiles}
- Files with low coverage: ${report.summary.filesWithLowCoverage}
- Critical paths with issues: ${report.summary.criticalPathsWithIssues}
`;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new CoverageMonitor();
  monitor.checkCoverage().catch(error => {
    console.error('Coverage check failed:', error.message);
    process.exit(1);
  });
}

export { CoverageMonitor };
```

#### CI Integration
```yaml
# .github/workflows/coverage.yml
name: Coverage Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run tests with coverage
        run: pnpm test:coverage:ci
      
      - name: Check coverage thresholds
        run: pnpm coverage:enforce
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: cortex-os-coverage
          fail_ci_if_error: true
      
      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            const comment = `## Coverage Report
            | Metric | Coverage | Threshold |
            |--------|----------|-----------|
            | Statements | ${coverage.total.statements.pct}% | 90% |
            | Branches | ${coverage.total.branches.pct}% | 90% |
            | Functions | ${coverage.total.functions.pct}% | 90% |
            | Lines | ${coverage.total.lines.pct}% | 90% |
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

## Acceptance Criteria
- [ ] 90% coverage thresholds enforced for all metrics
- [ ] Per-package coverage tracking implemented
- [ ] Automated coverage reporting in CI/CD
- [ ] Coverage trend monitoring
- [ ] Critical path coverage validation
- [ ] Human-readable coverage reports generated
- [ ] Build fails if coverage thresholds not met

## Rollback Strategy
1. **Gradual Implementation**: Start with warning-only thresholds
2. **Per-Package Rollout**: Enable strict thresholds per package
3. **Emergency Override**: Environment variable to bypass checks
4. **Legacy Exemptions**: Temporary exemptions for legacy code

## Validation Commands
```bash
# Run tests with coverage enforcement
pnpm coverage:enforce

# Generate coverage report
pnpm test:coverage:report

# Check specific package coverage
cd packages/agents && pnpm test --coverage

# Monitor coverage trends
node scripts/coverage/monitor-coverage.ts

# CI coverage check
pnpm test:coverage:ci
```

## Files Modified
- `/vitest.config.ts` - Enhanced coverage configuration
- `/package.json` - Updated coverage scripts
- `/packages/agents/vitest.config.ts` - Package-specific config
- `/scripts/coverage/monitor-coverage.ts` - Coverage monitoring
- `/tests/quality/coverage-thresholds.test.ts` - Coverage validation tests
- `/.github/workflows/coverage.yml` - CI coverage integration
