#!/usr/bin/env node
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = join(__dirname, '..');
const srcDir = join(packageRoot, 'src', 'context-graph', 'config');
const destDir = join(packageRoot, 'dist', 'context-graph', 'config');

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true });

console.log(`Copied clearance-level assets to ${destDir}`);
