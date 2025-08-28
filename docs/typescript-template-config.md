# TypeScript Configuration Documentation

This document explains the key TypeScript configuration settings for the Cortex-OS project, with special attention to template files and exclusion patterns.

## TSConfig Overview

The TypeScript configuration (`tsconfig.json`) is set up to ensure proper compilation of the codebase while excluding template files and other non-compilable TypeScript files.

## Template File Handling

Template files are TypeScript files that are used as templates for code generation but are not meant to be compiled directly. These files may contain references to types or variables that don't exist in the file's scope, which would cause TypeScript compilation errors if not properly excluded.

### Exclusion Patterns

The following patterns are used in the `exclude` section of `tsconfig.json` to prevent these files from being compiled:

```json
"exclude": [
  "node_modules",
  "**/*.d.ts",
  "**/*.test.ts",
  "dist",
  "coverage",
  "scripts/**/*template*.ts",
  "scripts/**/*-class.ts",
  "scripts/**/*-standalone.ts",
  // Other exclusions...
]
```

These patterns specifically target:

1. `scripts/**/*template*.ts` - Any file with "template" in the name in the scripts directory
2. `scripts/**/*-class.ts` - Files ending with "-class.ts" in the scripts directory
3. `scripts/**/*-standalone.ts` - Files ending with "-standalone.ts" in the scripts directory

## Best Practices for Template Files

When working with template files in this codebase:

1. Place template files in the `scripts/templates/` directory
2. Use the `.template` extension for clarity when possible
3. If TypeScript syntax highlighting is needed, use `-class.ts` or `-standalone.ts` naming conventions
4. Ensure the file is properly excluded in `tsconfig.json`
5. Document any non-standard usage or imports that might appear as errors

## Adding New Template Files

If you need to add a new template file:

1. Create the file in `scripts/templates/` with an appropriate name
2. If it contains TypeScript code that might cause compilation errors, ensure it matches one of the exclusion patterns
3. If it requires a new exclusion pattern, add it to the `exclude` array in `tsconfig.json`
4. Document the purpose and usage of the template

## Testing Template Exclusions

You can verify that template files are properly excluded by running:

```bash
node scripts/utils/verify-template-setup.mjs
```

This script checks that template files are not included in TypeScript compilation.
