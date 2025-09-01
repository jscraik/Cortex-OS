# Neo4j Template Files

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This directory contains template files for Neo4j class implementations that follow Cortex-OS best practices.

## Files

- `neo4j-secure-class.template` - Template file without imports, designed for string replacement in existing files
- `neo4j-secure-standalone.ts` - Standalone TypeScript file with proper imports (excluded from compilation)

## Usage

### For scripts that inject code into existing files

Use the `.template` file content as a string in your JavaScript/MJS scripts:

```javascript
import { readFileSync } from 'fs';

const template = readFileSync('scripts/templates/neo4j-secure-class.template', 'utf-8');
// Use template content for string replacement
```

### For standalone usage

The `neo4j-secure-standalone.ts` file provides a complete implementation with proper imports, but is excluded from TypeScript compilation via `tsconfig.json` to avoid dependency issues during build.

## TypeScript Configuration

The following patterns are excluded from TypeScript compilation in `tsconfig.json`:

- `scripts/**/*template*.ts`
- `scripts/**/*-class.ts`
- `scripts/**/*-standalone.ts`

This prevents template files from causing compilation errors due to missing dependencies while still allowing them to be used as text templates.

## Dependencies

The template expects the following to be available in the target file:

- `INeo4j` interface
- `Driver` type from neo4j-driver
- `SecureNeo4j` class
- `KGNode`, `KGRel`, `Subgraph` types
- `neo4j` module

## Security

The template uses `SecureNeo4j` for all database operations to ensure proper input validation and prevent injection attacks.

## Implementation Notes

When using these templates in your code, be sure to:

- Replace placeholder names (e.g., `DatabaseName`, `ClassName`, `PRIMARY_KEY`)
- Add any additional methods required by your implementation
- Update imports to match your project structure
- Document any custom behaviors or extensions

## Additional Resources

- Run `node scripts/utils/verify-template-setup.mjs` to verify the template setup is correct
- See `scripts/utils/example-template-usage.mjs` for usage examples
- Read `docs/typescript-template-config.md` for TypeScript configuration details
