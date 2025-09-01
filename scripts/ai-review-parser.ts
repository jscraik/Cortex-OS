import { ActionPoints } from './review.schema.js';

export function tryParseStructured(body: string): Partial<ActionPoints> | null {
  // Looks for fenced JSON: ```json ai-review\n{...}\n```
  const m = body.match(/```json\s+ai-review\s*([\s\S]*?)```/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

export function parseHeuristics(body: string, file?: string, url?: string, pr?: number) {
  // capture bullets or TODO-like lines into action items
  const items = [];
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const mm = line.match(
      /^\s*[-*]\s+(?:\[ \]\s*)?(FIX|ADD|REMOVE|REFACTOR|TEST|A11Y|SECURITY):?\s*(.+)$/i,
    );
    if (mm) {
      const title = mm[2].trim();
      const cat = /SECURITY/i.test(mm[1])
        ? 'security'
        : /A11Y/i.test(mm[1])
          ? 'a11y'
          : 'correctness';
      items.push({
        task_id: `${pr}:${file || 'none'}:${title}`.slice(0, 120),
        title,
        category: cat,
        labels: ['from:ai-review'],
        evidence_url: url,
      });
    }
  }
  return { pr_number: pr, source_comment_url: url, items };
}
