---
title: Cli Reference
sidebar_label: Cli Reference
---

# CLI Reference

## check-policy.js

Enforces maximum counts for Semgrep findings.

```bash
node packages/cortex-sec/scripts/check-policy.js [report] [--high=0] [--medium=10] [--low=9999]
```

### Options

- `--high` - allowed HIGH findings (default 0)
- `--medium` - allowed MEDIUM findings (default 10)
- `--low` - allowed LOW findings (default 9999)
