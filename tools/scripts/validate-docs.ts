import { globSync } from 'glob';
import { readFileSync } from 'fs';
import matter from 'gray-matter';

export function validateDocs(): boolean {
  let valid = true;
  const adrs = globSync('docs/architecture/decisions/*.md');
  for (const adrPath of adrs) {
    const content = readFileSync(adrPath, 'utf8');
    const { data, content: body } = matter(content);
    const required = ['## Status', '## Context', '## Decision', '## Consequences'];
    for (const s of required) if (!body.includes(s)) { console.error(`${adrPath} missing section: ${s}`); valid = false; }
    if (!data.date || !data.status || !data.deciders) { console.error(`${adrPath} missing required frontmatter`); valid = false; }
  }
  const apiDocs = globSync('docs/api/**/*.md');
  if (apiDocs.length === 0) console.warn('No API documentation found');
  return valid;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ok = validateDocs();
  if (!ok) process.exit(1);
}

