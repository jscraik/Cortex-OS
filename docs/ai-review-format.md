# AI Review → Action Points format

Bots SHOULD include a fenced JSON block:

```json ai-review
{
  "pr_number": 123,
  "source_comment_url": "https://github.com/OWNER/REPO/pull/123#discussion_r...",
  "items": [
    {
      "task_id": "123:src/file.ts:prefer_const",
      "title": "Use const in src/file.ts",
      "description": "Immutable binding prevents accidental reassignment.",
      "severity": "minor",
      "category": "style",
      "file": "src/file.ts",
      "start_line": 42,
      "end_line": 42,
      "evidence_url": "https://github.com/OWNER/REPO/pull/123/files#diff-...",
      "labels": ["from:ai-review", "area:style"],
      "confidence": 0.9
    }
  ]
}
```
