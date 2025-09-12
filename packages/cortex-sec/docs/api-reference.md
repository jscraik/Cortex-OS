# API Reference / SDK Overview

## `parse(path?)`

Normalizes a Semgrep JSON report.

```js
import { parse } from '@cortex-os/cortex-sec';

const findings = parse('.tmp/semgrep.json');
```

- **path** `string` – path to Semgrep JSON (default `.tmp/semgrep.json`)
- **returns** `Array` of finding objects `{ tool, ruleId, message, severity, file, startLine, endLine, evidence, tags }`
