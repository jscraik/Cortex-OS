#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SAMPLE = `hooks:\n  settings:\n    command:\n      allowlist: [node, pnpm, npm, bash, sh, osascript, jq, echo, prettier]\n  PreToolUse:\n    - matcher: "Write|Edit|MultiEdit"\n      hooks:\n        - type: js\n          code: |\n            const p = (ctx.tool && ctx.tool.input && (ctx.tool.input.file_path || ctx.tool.input.path)) || "";\n            if (p.includes('/infra/prod/')) return { action: 'deny', reason: 'Protected path' };\n            return { action: 'allow' };\n  PostToolUse:\n    - matcher: "Edit|Write|MultiEdit"\n      hooks:\n        - type: command\n          command: "node ./scripts/format-changed.js"\n`;

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeSample(projectDir: string) {
  const dir = path.join(projectDir, '.cortex', 'hooks');
  ensureDir(dir);
  const out = path.join(dir, 'sample.yaml');
  if (!fs.existsSync(out)) fs.writeFileSync(out, SAMPLE, 'utf8');
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'init';
  const projectDir = process.cwd();

  if (cmd === 'init') {
    const file = writeSample(projectDir);
    console.log(`[cortex-hooks] wrote ${file}`);
    // Touch file to trigger reload in watchers
    fs.utimesSync(file, new Date(), new Date());
    return;
  }

  console.error('Usage: cortex-hooks init');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[cortex-hooks] CLI error:', e?.message || e);
    process.exit(1);
  });
}
