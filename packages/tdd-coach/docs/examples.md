# Examples & Tutorials

## Basic Workflow
```bash
# Write a failing test
# Implement minimal code
# Run the coach
$ tdd-coach run-tests --files src/example.test.ts
```

## Programmatic Usage
```typescript
import { createTDDCoach } from '@cortex-os/tdd-coach';
const coach = createTDDCoach({ workspaceRoot: process.cwd() });
await coach.validateChange(changeSet);
```
