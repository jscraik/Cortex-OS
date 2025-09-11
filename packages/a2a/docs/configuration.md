# Configuration

Configuration is code-first. Transport selection and options are passed when creating the bus.

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';
import { http } from '@cortex-os/a2a-transport/http';

const bus = createBus(http({ baseUrl: process.env.A2A_HTTP_URL }));
```

Environment variables:

| Variable | Purpose |
| --- | --- |
| `A2A_HTTP_URL` | Endpoint for HTTP transport |
| `A2A_WS_URL` | WebSocket transport endpoint |

