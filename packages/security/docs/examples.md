# Examples & Tutorials

## Basic Event Audit

```typescript
import {
  SpiffeClient,
  MTLSManager,
  SecurityEventEmitter,
} from '@cortex-os/security';

const client = new SpiffeClient({ socketPath: '/tmp/spire-agent/public/api.sock', trustDomain: 'cortex-os.local' });
const identity = await client.fetchWorkloadIdentity();
const mtls = new MTLSManager(identity);
const emitter = new SecurityEventEmitter({ registry, policyRouter });
await emitter.emit({ type: 'security.audit', data: { action: 'login' } });
```

## MCP Tool Usage

```typescript
import {
  createEnhancedClient,
} from '@cortex-os/mcp-core';
import {
  securityMcpTools,
} from '@cortex-os/security';

// Register the tools with your MCP server implementation
// (e.g. a MockMCPServer instance inside your integration tests)
for (const tool of securityMcpTools) {
  server.registerTool(tool.name, tool.handler);
}

const client = await createEnhancedClient({
  name: 'security-mcp-example',
  transport: 'http',
  endpoint: 'http://127.0.0.1:4319/tools',
});

const decision = await client.callTool({
  name: 'security_access_control',
  arguments: {
    subject: { id: 'user-123', roles: ['security-admin'] },
    resource: { id: 'dataset-42', type: 'dataset', sensitivity: 'confidential' },
    action: 'delete',
  },
});
```
