---
title: Architecture
sidebar_label: Architecture
---

# Architecture

```
contracts  -&gt; message schemas and envelope helpers
core       -&gt; bus orchestration and handler registry
transport  -&gt; pluggable transport implementations
```

Messages flow from producer to transport, into the bus, then to registered handlers. Trace context is preserved end-to-end.
