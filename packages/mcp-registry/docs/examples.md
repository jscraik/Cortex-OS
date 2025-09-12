# Examples & Tutorials

### Register and list servers

```ts
import { upsert, readAll } from '@cortex-os/mcp-registry';

await upsert({ name: 'demo', url: 'http://localhost:3000', transports: { stdio: {} } });
const servers = await readAll();
console.log(servers);
```
