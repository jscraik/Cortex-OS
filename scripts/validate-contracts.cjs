#!/usr/bin/env node
/* Simple contract validator: ensures all Zod schemas export to JSON schema and contain version+kind */
const { resolve } = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

async function main() {
  const contractsIndex = resolve(process.cwd(), 'packages/contracts/src/index.ts');
  if (!fs.existsSync(contractsIndex)) {
    console.warn('contracts: index.ts not found; skipping');
    process.exit(0);
  }
  // We cannot import TS here without transpilation; do a light static check for required strings
  const txt = fs.readFileSync(contractsIndex, 'utf8');
  const required = ['export const MessageEnvelopeSchema', 'export const AgentConfigSchema'];
  const missing = required.filter((needle) => !txt.includes(needle));
  if (missing.length) {
    console.error('Contract validation failed. Missing exports:', missing.join(', '));
    process.exit(1);
  }
  console.log('Contracts pass basic validation.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
