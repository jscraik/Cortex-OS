# Neo4j Template Files

This directory contains template files for Neo4j class implementations:

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
