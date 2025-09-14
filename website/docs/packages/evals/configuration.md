---
title: Configuration
sidebar_label: Configuration
---

# Configuration

The gate expects a JSON or JS object matching `GateConfig`.

```jsonc
{
  "dataset": { /* optional GoldenDataset */ },
  "suites": [
    {
      "name": "rag",
      "enabled": true,
      "thresholds": { "ndcg": 0.8 },
      "options": { "k": 5 }
    },
    {
      "name": "router",
      "enabled": true,
      "thresholds": { "chatLatencyMs": 1500 }
    }
  ]
}
```

Save this as `gate.config.json` alongside your project or load it dynamically. Each suite may specify its own options and thresholds which are validated at runtime.

```