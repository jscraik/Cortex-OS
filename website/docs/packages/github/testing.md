---
title: Testing
sidebar_label: Testing
---

# Testing & QA

Run unit tests:

```bash
pnpm --filter github test
```

Coverage goals: critical paths &gt; 80%.

Use `mockito` for HTTP stubs and `insta` for snapshot testing.
