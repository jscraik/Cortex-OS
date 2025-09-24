# Agent-Toolkit Usage Guide

This guide demonstrates how to use the agent-toolkit to resolve diagnostic issues in the Cortex OS project.

## Quick Start

### 1. Programmatic Usage

```typescript
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

// Initialize the toolkit
const toolkit = await createAgentToolkit();

// Run diagnostics
const diagnostics = await toolkit.diagnostics.analyze({
  include: ['packages/your-package'],
  severity: ['error']
});

console.log(`Found ${diagnostics.errors.length} errors`);
```

### 2. Command Line Usage

```bash
# Analyze diagnostics
npx agent-toolkit diagnostics analyze --include "packages/**" --severity error

# Apply semgrep fixes
npx agent-toolkit semgrep fix --pattern "createId(" --fix "import { createId } from '@cortex-os/a2a-core';"

# Run codemod transformations
npx agent-toolkit codemod apply --find "export default" --replace "export const"
```

## Common Diagnostic Fixes

### Fix Missing Imports

```typescript
// Using semgrep to fix missing imports
await toolkit.semgrep.applyFixes({
  patterns: [
    {
      id: 'add-createId-import',
      pattern: 'createId(',
      fix: {
        prefix: "import { createId } from '@cortex-os/a2a-core';\n"
      }
    }
  ],
  files: ['apps/**/*.ts']
});
```

### Fix Default Exports

```typescript
// Convert default exports to named exports
await toolkit.codemod.transform({
  rules: [
    {
      name: 'fix-default-exports',
      find: 'export default class :[className]',
      replace: 'export const :[className] = class :[className]'
    }
  ]
});
```

### Fix Promise Chains

```typescript
// Convert .then() chains to async/await
await toolkit.codemod.transform({
  rules: [
    {
      name: 'fix-promise-chains',
      find: ':[expr].then(:[result] => :[body])',
      replace: 'const :[result] = await :[expr];\n:[body]'
    }
  ]
});
```

## Development Workflow Integration

### Pre-commit Hook

```typescript
// pre-commit.js
import { createAgentToolkit } from '@cortex-os/agent-toolkit';

const toolkit = await createAgentToolkit();

// Check staged files
const files = getStagedFiles(); // Implement this
const results = await Promise.all([
  toolkit.diagnostics.analyze({ include: files }),
  toolkit.cleanup.organizeImports({ files, removeUnused: true })
]);

if (results.some(r => r.errors?.length)) {
  console.error('Fix issues before committing');
  process.exit(1);
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/agent-toolkit.yml
name: Agent-Toolkit Checks

on: [push, pull_request]

jobs:
  toolkit-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: pnpm install

      - name: Run agent-toolkit diagnostics
        run: npx agent-toolkit diagnostics analyze --format json --output report.json

      - name: Upload diagnostics report
        uses: actions/upload-artifact@v3
        with:
          name: diagnostics-report
          path: report.json
```

## API Reference

### DiagnosticsService

```typescript
interface DiagnosticsService {
  analyze(options: DiagnosticsOptions): Promise<DiagnosticsResult>;
  getErrors(file: string): Promise<Diagnostic[]>;
  getWarnings(file: string): Promise<Diagnostic[]>;
}

interface DiagnosticsOptions {
  include?: string[];
  exclude?: string[];
  severity?: ('error' | 'warning' | 'info')[];
}
```

### SemgrepTool

```typescript
interface SemgrepTool {
  applyFixes(options: SemgrepFixesOptions): Promise<FixResult[]>;
  scan(options: ScanOptions): Promise<ScanResult[]>;
}

interface SemgrepFixesOptions {
  patterns: SemgrepPattern[];
  files: string[];
}
```

### CodemodTool

```typescript
interface CodemodTool {
  transform(options: CodemodOptions): Promise<TransformResult[]>;
  applyRule(rule: CodemodRule, files: string[]): Promise<Result[]>;
}

interface CodemodOptions {
  rules: CodemodRule[];
  files?: string[];
}
```

## Examples

### Example 1: Fix Common Issues

```typescript
const toolkit = await createAgentToolkit();

// Fix multiple issues at once
await Promise.all([
  toolkit.cleanup.organizeImports({ files: ['src/**/*.ts'] }),
  toolkit.types.fixImplicitAny({ files: ['src/**/*.ts'] }),
  toolkit.codemod.transform({
    rules: [
      { name: 'fix-default-exports', find: 'export default', replace: 'export const' }
    ]
  })
]);
```

### Example 2: Validate Project

```typescript
const toolkit = await createAgentToolkit();

const validation = await toolkit.validation.run({
  targets: ['packages/agent-toolkit'],
  checks: ['typescript', 'imports', 'exports', 'dependencies']
});

if (!validation.success) {
  validation.issues.forEach(issue => {
    console.log(`${issue.file}:${issue.line}: ${issue.message}`);
  });
}
```

## Best Practices

1. **Always test fixes locally** before committing
2. **Use targeted patterns** when applying semgrep fixes
3. **Backup your code** before running large-scale transformations
4. **Run validation** after applying fixes
5. **Use version control** to track changes and revert if needed

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure all dependencies are installed
   - Check tsconfig.json paths configuration

2. **Permission errors**
   - Ensure files are writable
   - Check file permissions

3. **Build failures after fixes**
   - Run `pnpm build` to verify
   - Check TypeScript configuration

### Getting Help

- Check the [Cortex OS documentation](../../docs/)
- Review [package READMEs](../../packages/agent-toolkit/README.md)
- Run `npx agent-toolkit --help` for CLI options

## Contributing

When adding new features to the agent-toolkit:

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Ensure TypeScript types are correct
5. Follow the [contribution guidelines](../../CONTRIBUTING.md)