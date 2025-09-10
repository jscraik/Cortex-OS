# @cortex-os/logging

Structured logging utility for Cortex-OS services built on [`pino`](https://github.com/pinojs/pino).

## Usage

```ts
import { createLogger, LogLevel } from '@cortex-os/logging';

const logger = createLogger('user-service', { level: LogLevel.INFO });
logger.info('user action', { userId: 123 });
```

Logs are emitted as JSON with ISO timestamps and the `module` field set to the component name. Additional context objects are merged into the log entry.
