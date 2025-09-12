# API Reference

## `SecureDatabaseWrapper`
```ts
import { SecureDatabaseWrapper } from '@cortex-os/mvp-core';
const db = new SecureDatabaseWrapper(config);
await db.query('SELECT 1');
```

### Parameters
| Name | Type | Description |
| --- | --- | --- |
| `config` | object | Connection options. |

## `SecureCommandExecutor`
```ts
import { SecureCommandExecutor } from '@cortex-os/mvp-core';
await SecureCommandExecutor.run('ls', ['-la']);
```
