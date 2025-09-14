---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```
Blueprint -&gt; Strategy Node -&gt; Build Node -&gt; Evaluation Node -&gt; Completed State
```

- **Kernel** (`runPRPWorkflow`) orchestrates the PRP phases and validates state transitions.
- **Strategy, Build, Evaluation Nodes** execute phase-specific logic.
- **Observability hooks** record metrics and spans via OpenTelemetry.
