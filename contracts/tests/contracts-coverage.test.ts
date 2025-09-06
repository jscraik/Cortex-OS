// Contracts Coverage Test
// Ensures every exported *Schema in libs/typescript/contracts/**/events.ts has at least one test file referencing it.
// This acts as a safety net to prevent silent addition of untested contracts.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface SchemaRef { file: string; exportName: string; }

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc); else if (e.isFile()) acc.push(full);
  }
  return acc;
}

const root = path.resolve(__dirname, '..', '..'); // contracts/tests -> contracts -> root assumed
const contractsRoot = path.join(root, 'libs', 'typescript', 'contracts');

function findEventFiles(): string[] {
  const files = walk(contractsRoot);
  return files.filter(f => f.endsWith('events.ts'));
}

function extractSchemas(file: string): SchemaRef[] {
  const src = readFileSync(file, 'utf8');
  const refs: SchemaRef[] = [];
  const exportRegex = /export\s+const\s+(\w+?Schema)\s*=\s*z\.object/gi;
  let m: RegExpExecArray | null;
  // eslint-friendly regex iteration
  // Using manual loop to avoid assignment within condition warnings
  for (;;) {
    m = exportRegex.exec(src);
    if (!m) break;
    refs.push({ file, exportName: m[1] });
  }
  return refs;
}

// Collect schema exports
const eventFiles = findEventFiles();
const schemas = eventFiles.flatMap(extractSchemas);

describe('contracts: schema coverage', () => {
  if (schemas.length === 0) {
    it('no schemas found (skip)', () => {
      expect(true).toBe(true);
    });
    return;
  }

  // Map schema -> test files referencing it
  const testDir = path.join(root, 'contracts', 'tests');
  const testFiles = walk(testDir).filter(f => f.endsWith('.test.ts'));

  const testContentCache: Record<string, string> = {};
  const hasReference = (schema: SchemaRef): boolean => {
    return testFiles.some(tf => {
      if (!testContentCache[tf]) testContentCache[tf] = readFileSync(tf, 'utf8');
      return new RegExp(`\\b${schema.exportName}\\b`).test(testContentCache[tf]);
    });
  };

  schemas.forEach(schema => {
    it(`has test coverage for ${path.relative(root, schema.file)}::${schema.exportName}`, () => {
      expect(hasReference(schema)).toBe(true);
    });
  });
});
