---
title: Architecture
sidebar_label: Architecture
---

# Architecture

The toolkit is organized as lightweight shell scripts emitting JSON envelopes.

```
scout -&gt; codemod -&gt; diff -&gt; validate -&gt; apply
```

- **tools/**: individual wrappers
- **Justfile**: orchestration recipes
- **docs/**: current documentation set
