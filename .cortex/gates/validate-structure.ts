#!/usr/bin/env -S node
import { readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import micromatch from "micromatch";

const policy = JSON.parse(readFileSync(".cortex/policy/policy.repo.json", "utf8"));

// Determine changed files (staged when local, PR diff in CI if base provided)
const base = process.env.GITHUB_BASE_REF || "";
const changed = base
  ? execSync(`git diff --name-only origin/${base}...HEAD`).toString().trim().split("\n").filter(Boolean)
  : execSync("git diff --name-only --cached").toString().trim().split("\n").filter(Boolean);

if (changed.length === 0) process.exit(0);

const allow = [
  ...policy.allowedRoots,
  ...Object.entries(policy.packages).flatMap(([root, globs]: [string, string[]]) => globs.map(g => `${root}/${g}`))
];

// Block disallowed extensions and size
const tooLarge: string[] = [];
const badExt = changed.filter(p => {
  const ext = p.slice(p.lastIndexOf("."));
  try {
    const s = statSync(p);
    if (s.isFile() && s.size > policy.deny.maxFileKB * 1024) tooLarge.push(`${p} (${s.size}B)`);
  } catch {}
  return policy.deny.extensions.includes(ext);
});

const outside = changed.filter(p => !micromatch.isMatch(p, allow));
const maxFiles = policy.deny.maxNewFilesPerPR;
if (changed.length > maxFiles) {
  console.error(`Too many changed files: ${changed.length} > ${maxFiles}`);
  process.exit(1);
}
if (badExt.length) {
  console.error("Denied extensions detected:\n" + badExt.map(x => ` - ${x}`).join("\n"));
  process.exit(1);
}
if (tooLarge.length) {
  console.error("Files exceed max size policy:\n" + tooLarge.map(x => ` - ${x}`).join("\n"));
  process.exit(1);
}
if (outside.length) {
  console.error("Structure violation (outside allowed paths):\n" + outside.map(x => ` - ${x}`).join("\n"));
  process.exit(1);
}
console.log("validate-structure: OK");

