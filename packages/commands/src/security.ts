import micromatch from 'micromatch';
import path from 'node:path';

/**
 * Very small allowlist matcher for Bash patterns of the form:
 * - "Bash(*)" -> allow any
 * - "Bash(git status:*)" -> command must start with "git status"
 * - "Bash(git commit: -m *)" -> command must start with "git commit" (args not strictly parsed)
 */
export function isBashAllowed(cmd: string, allowlist: string[] | undefined): boolean {
  if (!allowlist || allowlist.length === 0) return false;
  if (allowlist.some((e) => e.trim() === 'Bash(*)')) return true;
  const tokens = cmd.trim().split(/\s+/);
  const first = tokens[0] ?? '';
  const firstTwo = tokens.slice(0, 2).join(' ');

  for (const entry of allowlist) {
    const specMatch = /^Bash\(([^)]+)\)$/.exec(entry.trim());
    if (!specMatch) continue;
    const spec = specMatch[1];
    const colonIdx = spec.indexOf(':');
    const head = colonIdx >= 0 ? spec.slice(0, colonIdx) : spec;
    if (head.includes(' ')) {
      if (firstTwo.startsWith(head)) return true;
      continue;
    }
    if (first === head) return true;
  }
  return false;
}

export function isFileAllowed(filePath: string, allowlist: string[] | undefined): boolean {
  if (!allowlist || allowlist.length === 0) return false;
  const rel = path.relative(process.cwd(), filePath);
  const base = path.basename(filePath);
  return allowlist.some((pattern) =>
    micromatch.isMatch(filePath, pattern) || micromatch.isMatch(rel, pattern) || micromatch.isMatch(base, pattern)
  );
}
