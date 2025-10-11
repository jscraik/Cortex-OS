# Examples & Tutorials

### Register and list servers

```ts
import { upsert, readAll } from '@cortex-os/mcp-registry';

await upsert({ name: 'demo', url: 'http://localhost:3000', transports: { stdio: {} } });
const servers = await readAll();
console.log(servers);
```

### Import a server from MCP Marketplace

```ts
import {
  registryMarketplaceImportTool,
  registryGetTool,
} from '@cortex-os/mcp-registry';

const importResponse = await registryMarketplaceImportTool.handler({
  slug: 'arxiv-1',
  timeoutMs: 5000,
});

if (importResponse.isError) {
  throw new Error(importResponse.content[0].text);
}

const importResult = JSON.parse(importResponse.content[0].text);
console.log('Marketplace import status:', importResult.status);

const getResponse = await registryGetTool.handler({ name: 'arxiv-1' });
const serverDetails = JSON.parse(getResponse.content[0].text);
console.log('Imported server:', serverDetails.server);
```
