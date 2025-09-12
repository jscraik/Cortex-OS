# User Guide

## Common Tasks

### Run a safe query
```ts
await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Execute a command with limits
```ts
await SecureCommandExecutor.run('git', ['status'], { timeout: 3000 });
```

### Keyboard Shortcuts
| Action | Shortcut |
| --- | --- |
| Abort command | `Ctrl+C` |
