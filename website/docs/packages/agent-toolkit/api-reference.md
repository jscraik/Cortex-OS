---
title: Api Reference
sidebar_label: Api Reference
---

# API Reference

The toolkit is shell-centric and does not expose a formal SDK. Agents invoke scripts and parse the JSON envelope returned on `stdout`.

Each response follows:
```json
{
  "tool": "name",
  "op": "operation",
  "inputs": {},
  "results|diff|status": ...
}
```
This stable shape enables easy integration from any language.
