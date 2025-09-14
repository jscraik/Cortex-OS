---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```
+---------------+        +----------------+
| Gate Runner | -----&gt; | Suite Registry |
+---------------+        +----------------+
        |                          |
        v                          v
  +-----------+            +---------------+
  | RAG Suite |            | Router Suite  |
  +-----------+            +---------------+
```

- **Gate Runner** orchestrates configured suites and aggregates results.
- **Suite Registry** maps suite names to implementations.
- **RAG Suite** evaluates retrieval performance given embedder and store dependencies.
- **Router Suite** measures router capability and latency.

Each suite returns a `SuiteOutcome`; the runner aggregates them into a single `GateResult`.
