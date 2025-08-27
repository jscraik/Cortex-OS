#!/usr/bin/env node
import { existsSync } from 'node:fs';

const idx = process.argv.indexOf('--files');
const files = idx >= 0 ? process.argv.slice(idx + 1) : [];
const missing = files.filter(f => !existsSync(f));
if (missing.length) {
  console.error('Missing files:\n' + missing.join('\n'));
  process.exit(1);
}
console.log('Structure validation passed');
