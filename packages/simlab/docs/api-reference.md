# API Reference

SimLab exposes a programmatic API primarily through the `SimRunner` class and related types.

```typescript
import { SimRunner } from '@cortex-os/simlab';
import type { SimScenario } from '@cortex-os/schemas';
```

No authentication is required. Main entry points:

- `SimRunner.runScenario(scenario: SimScenario): Promise<SimResult>`
- `SimRunner.runBatch(scenarios: SimScenario[]): Promise<SimResult[]>`
- `generateReport(results: SimResult[], options?)`

Type definitions are published in the package and can be imported from `@cortex-os/simlab/types`.

