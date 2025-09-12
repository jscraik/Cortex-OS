# User Guide

## Storing a Memory
```typescript
await svc.upsert({ id: 'todo', text: 'Buy milk', namespace: 'tasks' });
```

## Retrieving Context
```typescript
const context = await svc.search('milk', { namespace: 'tasks', maxResults: 5 });
```

## Indexing a Directory via CLI
```
node memory-cli.js index --path ./docs
```

### Keyboard Shortcuts
N/A – the package exposes a CLI and APIs only.
