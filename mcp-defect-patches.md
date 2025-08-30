# MCP Package Defect Fix Patches

## High Priority Fixes

### Fix 1: Remove missing workspace dependencies
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/package.json`

```diff
--- a/packages/mcp/package.json
+++ b/packages/mcp/package.json
@@ -13,9 +13,6 @@
   },
   "dependencies": {
-    "@cortex-os/mcp-bridge": "workspace:*",
-    "@cortex-os/mcp-core": "workspace:*", 
-    "@cortex-os/mcp-registry": "workspace:*",
     "command-exists": "^1.2.9",
     "eventsource": "^4.0.0",
     "rate-limiter-flexible": "^7.2.0",
```

### Fix 2: Remove missing workspace exports
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/index.ts`

```diff
--- a/packages/mcp/src/index.ts
+++ b/packages/mcp/src/index.ts
@@ -3,9 +3,6 @@
  * @description Aggregated exports for Cortex-OS MCP utilities
  */
 
-export * from '@cortex-os/mcp-core';
-export * from '@cortex-os/mcp-bridge';
-export * from '@cortex-os/mcp-registry';
-
 // Export local integrations and components
 export * from './lib/a2a-integration.js';
```

### Fix 3: Fix unsafe type assertion in memory integration
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/memory-integration.ts`

```diff
--- a/packages/mcp/src/lib/memory-integration.ts
+++ b/packages/mcp/src/lib/memory-integration.ts
@@ -47,6 +47,7 @@
 /**
  * In-memory cache for MCP data
  */
 class McpMemoryCache {
   private cache = new Map<string, CacheEntry>();
   private accessOrder: string[] = []; // For LRU eviction
@@ -584,9 +585,15 @@
   private invalidateByPattern(serviceId: string, pattern: string): void {
     // Simple pattern matching - in production this could be more sophisticated
     const regex = new RegExp(pattern.replace('*', '.*'));
     const keysToDelete: string[] = [];
 
-    for (const [keyString, entry] of (this.cache as any).cache.entries()) {
+    this.cache.forEach((entry, keyString) => {
       if (entry.key.serviceId === serviceId && regex.test(entry.key.identifier)) {
-        keysToDelete.push(keyString);
+        keysToDelete.push(keyString);
       }
-    }
+    });
 
     for (const key of keysToDelete) {
```

### Fix 4: Convert dynamic require to proper ES imports
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/transport.ts`

```diff
--- a/packages/mcp/src/lib/transport.ts
+++ b/packages/mcp/src/lib/transport.ts
@@ -6,6 +6,7 @@
 import { z } from 'zod';
 import { redactSensitiveData } from './security.js';
 import type { McpRequest, TransportConfig, Transport } from './types.js';
+import { SSETransport } from './sse-transport.js';
 
 // Message validation schema
 const MessageSchema = z
@@ -43,8 +44,7 @@
 export function createTransport(config: TransportConfig): Transport {
   // Import SSE transport dynamically to avoid circular dependencies
   if (config.type === 'sse') {
-    const { SSETransport } = require('./sse-transport.js');
     return new SSETransport(config);
   }
 
   // For stdio and http transports, return a basic implementation
```

### Fix 5: Fix EventSource import in SSE transport
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/sse-transport.ts`

```diff
--- a/packages/mcp/src/lib/sse-transport.ts
+++ b/packages/mcp/src/lib/sse-transport.ts
@@ -7,6 +7,7 @@
 import { z } from 'zod';
 import type { McpRequest, Transport } from './types.js';
 import { validateMessage, redactSensitiveData } from './transport.js';
+import EventSource from 'eventsource';
 
 // SSE Transport Configuration Schema
 const SSETransportConfigSchema = z.object({
@@ -42,9 +43,6 @@
     return new Promise((resolve, reject) => {
       try {
-        // Import EventSource dynamically (Node.js environment)
-        const EventSource = require('eventsource');
-        
         this.eventSource = new EventSource(this.config.url);
         
         this.setupEventSourceHandlers();
```

## Medium Priority Fixes

### Fix 6: Improve client ID security
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/client.ts`

```diff
--- a/packages/mcp/src/lib/client.ts
+++ b/packages/mcp/src/lib/client.ts
@@ -4,6 +4,7 @@
  */
 
 import { EventEmitter } from 'events';
+import { randomUUID } from 'crypto';
 import { EnhancedRateLimiter, type RateLimitConfig } from './rate-limiter.js';
 import { createTransport, type Transport } from './transport.js';
 import { mcpA2AIntegration } from './a2a-integration.js';
@@ -51,8 +52,7 @@
     this.transport = createTransport(options.transport);
     this.timeout = options.timeout || 30000;
     this.clientId =
-      options.clientId || `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
+      options.clientId || `client_${randomUUID()}`;
     this.memoryMonitoringEnabled = options.enableMemoryMonitoring ?? true;
     this.a2aEnabled = options.enableA2AIntegration ?? true;
     this.serverId = options.serverId;
```

### Fix 7: Improve transport type detection
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/client.ts`

```diff
--- a/packages/mcp/src/lib/client.ts
+++ b/packages/mcp/src/lib/client.ts
@@ -46,6 +46,7 @@
   private a2aEnabled: boolean;
   private serverId?: string;
+  private transportType: string;
 
   constructor(options: ClientOptions) {
     super();
     this.transport = createTransport(options.transport);
+    this.transportType = options.transport.type;
     this.timeout = options.timeout || 30000;
     this.clientId =
@@ -194,11 +195,7 @@
   }
 
   private getTransportType(): string {
-    // Extract transport type from transport config
-    if ('command' in this.transport) return 'stdio';
-    if ('url' in this.transport) return 'http';
-    return 'unknown';
+    return this.transportType;
   }
 
   async disconnect(): Promise<void> {
```

### Fix 8: Add webhook URL validation
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/monitoring.ts`

```diff
--- a/packages/mcp/src/lib/monitoring.ts
+++ b/packages/mcp/src/lib/monitoring.ts
@@ -10,6 +10,7 @@
 import path from 'path';
 import { performance } from 'perf_hooks';
+import { validateUrlSecurity } from './security.js';
 
 /**
  * Security threat levels
@@ -602,6 +603,11 @@
     const alertMessage = this.formatAlertMessage(alerts, summary);
 
     // Webhook notification
     if (alertConfig.webhookUrl) {
+      if (!validateUrlSecurity(alertConfig.webhookUrl)) {
+        console.error('Insecure webhook URL rejected:', alertConfig.webhookUrl);
+        return;
+      }
+      
       try {
         const response = await fetch(alertConfig.webhookUrl, {
           method: 'POST',
```

### Fix 9: Optimize transport message redaction
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/transport.ts`

```diff
--- a/packages/mcp/src/lib/transport.ts
+++ b/packages/mcp/src/lib/transport.ts
@@ -92,11 +92,11 @@
       return;
     }
 
-    // Redact sensitive data before sending
-    const redactedMessage = redactSensitiveData(message);
+    // Send original message to transport
+    // Only redact for logging purposes
+    const redactedForLog = redactSensitiveData(message);
     
     // In production, this would actually send the message via the appropriate transport
-    console.log(`Sending message via ${this.config.type}:`, redactedMessage);
+    console.log(`Sending message via ${this.config.type}:`, redactedForLog);
   }
 
   isConnected(): boolean {
```

### Fix 10: Remove unnecessary schema validation
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/security.ts`

```diff
--- a/packages/mcp/src/lib/security.ts
+++ b/packages/mcp/src/lib/security.ts
@@ -35,9 +35,6 @@
   }
 
   if (data && typeof data === 'object') {
-    const objSchema = z.record(z.any());
-    objSchema.parse(data);
-
     return Object.fromEntries(
       Object.entries(data).map(([k, v]) => {
         if (REDACT_KEY_REGEX.test(k)) {
```

## Low Priority Fixes

### Fix 11: Fix interface formatting
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/types.ts`

```diff
--- a/packages/mcp/src/lib/types.ts
+++ b/packages/mcp/src/lib/types.ts
@@ -13,8 +13,7 @@
   send(
     message: McpRequest,
     onError?: (err: unknown, msg: McpRequest) => void,
-
   ): void;
-
   isConnected(): boolean;
 }
```

### Fix 12: Improve error handling in A2A integration
**File**: `/Users/jamiecraik/.Cortex-OS/packages/mcp/src/lib/a2a-integration.ts`

```diff
--- a/packages/mcp/src/lib/a2a-integration.ts
+++ b/packages/mcp/src/lib/a2a-integration.ts
@@ -221,8 +221,9 @@
     // Validate event schema
     try {
       McpEventSchema.parse(event);
     } catch (validationError) {
-      console.error('Invalid MCP event schema:', validationError);
+      this.emit('validation_error', validationError, event);
+      console.error('Invalid MCP event schema:', validationError);
       return;
     }
```

## Testing Recommendations

After applying these fixes, run the following tests:

1. **Build verification**: `npm run build` should complete without errors
2. **Import testing**: Verify all exports can be imported
3. **Integration testing**: Test client lifecycle with all transports
4. **Security testing**: Verify webhook URL validation
5. **Performance testing**: Test memory usage under load
6. **Error handling**: Test all error scenarios with proper logging