#!/usr/bin/env -S node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const boss = 'AGENTS.md is the canonical authority';
const governanceRuleFiles = [
  '.cortex/rules/CLAUDE.md',
  '.cortex/rules/COPILOT-INSTRUCTIONS.md',
  '.cortex/rules/GEMINI.md',
  '.cortex/rules/QWEN.md',
];

const requiredContextFiles = [
  // Web stack essentials
  '.cortex/context/next.js.md',
  '.cortex/context/react.md',
  '.cortex/context/shadcn-ui.md',
  '.cortex/context/tailwind-css.md',
  '.cortex/context/typescript.md',
  '.cortex/context/node.js.md',
  '.cortex/context/pnpm.md',
  // OS and protocols
  '.cortex/context/mcp.md',
  '.cortex/context/model-context-protocol.md',
  '.cortex/context/mlx.md',
];

let failed = false;

// 1) Validate "boss" line in governance rule files
for (const f of governanceRuleFiles) {
  try {
    const content = readFileSync(f, 'utf8');
    if (!content.includes(boss)) {
      console.error(`Missing boss line in ${f}`);
      failed = true;
    }
  } catch (e) {
    console.error(`Failed to read governance rule file: ${f} -> ${String(e)}`);
    failed = true;
  }
}

// 2) Ensure critical context docs exist (prevent regressions on accidental moves/deletes)
for (const f of requiredContextFiles) {
  const p = resolve(process.cwd(), f);
  if (!existsSync(p)) {
    console.error(`Required context doc missing: ${f}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('validate-docs: OK');
