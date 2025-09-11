# Architecture

```
contracts  -> message schemas and envelope helpers
core       -> bus orchestration and handler registry
transport  -> pluggable transport implementations
```

Messages flow from producer to transport, into the bus, then to registered handlers. Trace context is preserved end-to-end.

