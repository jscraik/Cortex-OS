#!/usr/bin/env tsx
import { globby } from "globby";
import micromatch from "micromatch";
import { readFileSync } from "node:fs";
import { z } from "zod";

type Policy = { protectedFiles: string[]; allowedGlobs: string[] };
const policySchema = z.object({
  protectedFiles: z.array(z.string()),
  allowedGlobs: z.array(z.string())
});
const policy: Policy = policySchema.parse(
  JSON.parse(readFileSync("tools/structure-guard/policy.json", "utf8"))
);

const files = await globby([
  "**/*",
  "!**/node_modules/**",
  "!**/dist/**",
  "!**/.git/**"
], { dot: true });

const bad = files.filter(f => !micromatch.isMatch(f, policy.allowedGlobs));
if (bad.length) {
  console.error("Disallowed paths:\n" + bad.join("\n"));
  process.exitCode = 2;
}

const missing = policy.protectedFiles.filter(p => !micromatch.any(files, [p]));
if (missing.length) {
  console.error("Missing protected paths:\n" + missing.join("\n"));
  process.exitCode = 3;
}
