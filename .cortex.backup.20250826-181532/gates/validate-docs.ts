#!/usr/bin/env -S node
import { readFileSync } from "node:fs";

const boss = "AGENTS.md is the canonical authority";
const files = [
  ".cortex/rules/CLAUDE.md",
  ".cortex/rules/COPILOT-INSTRUCTIONS.md",
  ".cortex/rules/GEMINI.md",
  ".cortex/rules/QWEN.md"
];

let failed = false;
for (const f of files) {
  const content = readFileSync(f, "utf8");
  if (!content.includes(boss)) {
    console.error(`Missing boss line in ${f}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("validate-docs: OK");

