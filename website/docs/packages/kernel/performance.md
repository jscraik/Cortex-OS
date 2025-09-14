---
title: Performance
sidebar_label: Performance
---

# Performance & Benchmarking

- Profile with Node's inspector:

```bash
node --inspect-brk example.js
```

- Use `pnpm benchmark` for benchmark tests.
- Avoid heavy synchronous work in nodes to keep execution predictable.
