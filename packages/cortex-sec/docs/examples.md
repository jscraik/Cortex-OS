# Examples & Tutorials

## Programmatic Use

```js
import { parse } from '@cortex-os/cortex-sec/parse';
const findings = parse('reports/security.json');
console.log(findings[0]);
```

## CLI Policy Check

```bash
node packages/cortex-sec/scripts/check-policy.js reports/findings.json --high=0 --medium=5
```
