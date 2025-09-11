# Migration Guide

## From Legacy Memory Systems
1. Export existing records to JSON.
2. Start Neo4j and Qdrant services.
3. Use the provided migration tooling:
```typescript
import { migrationTool } from '@cortex-os/memories';
await migrationTool.migrate({ source: 'legacy.json', preserveTimestamps: true });
```
4. Verify counts and integrity before switching traffic.
