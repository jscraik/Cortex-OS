---
name: SummarizeNote
version: 0.5.0
category: knowledge
description: Generates a concise summary for a notebook entry.
impl: ./skills/summarize-note.ts
inputs:
  content:
    type: string
    minLength: 5
    required: true
  language:
    type: string
    enum:
      - en
      - es
outputs:
  summary:
    type: string
  tokensUsed:
    type: integer
preconditions:
  - hasModel:SUMMARIZER
sideEffects:
  - reads:MemoryGraph
estimatedCost: "~120ms"
calls:
  - memory.fetch
requiresContext:
  - tenantId
monitoring: false
deprecated: false
i18n:
  en-US:
    description: Generates a concise summary for a notebook entry.
---

# SummarizeNote

Summaries are tuned for note-taking workflows.
