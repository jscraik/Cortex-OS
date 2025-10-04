# TypeScript Pipelines System Design

## Overview

**Goal**: Create a TypeScript/JavaScript alternative to Open WebUI's Python pipelines, allowing users to upload custom logic for filters, pipes, and actions.

**Key Principle**: Security-first design with sandboxing, validation, and BVOO (Bounded, Validated, Observable) compliance.

## Architecture

### Pipeline Types

Following Open WebUI's classification:

1. **Filter Pipelines**: Modify inputs/outputs (inlet/outlet)
2. **Pipe Pipelines**: Create custom agents/models
3. **Action Pipelines**: Add custom UI buttons

### Component Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Frontend (React)                            │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ PipelineManager │  │ PipelineUpload  │               │
│  │ (Admin UI)      │  │ Component       │               │
│  └────────┬────────┘  └────────┬────────┘               │
│           │                     │                        │
└───────────┼─────────────────────┼────────────────────────┘
            │                     │
            │                     │ HTTP (multipart/form-data)
┌───────────▼─────────────────────▼────────────────────────┐
│              Backend (Express)                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │          PipelineController                      │    │
│  │  POST /api/pipelines/upload                      │    │
│  │  GET  /api/pipelines                             │    │
│  │  DELETE /api/pipelines/:id                       │    │
│  │  PUT  /api/pipelines/:id/toggle                  │    │
│  └─────────────────┬────────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼────────────────────────────────┐    │
│  │        PipelineRegistry (Core)                   │    │
│  │  - load(code, metadata)                          │    │
│  │  - execute(id, context)                          │    │
│  │  - validate(pipeline)                            │    │
│  │  - unload(id)                                    │    │
│  └─────────────────┬────────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼────────────────────────────────┐    │
│  │           Sandbox (Isolation)                    │    │
│  │  - VM2 or Worker Threads                         │    │
│  │  - Timeout enforcement (5s default)              │    │
│  │  - Memory limits (128MB default)                 │    │
│  │  - CPU throttling                                │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## Pipeline Contract

### Base Interface

```typescript
// libs/typescript/contracts/src/pipelines/base.ts
import { z } from 'zod';

export const PipelineType = z.enum(['filter', 'pipe', 'action']);

export const PipelineMetadata = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().optional(),
  type: PipelineType,
  enabled: z.boolean().default(true),
  permissions: z.array(z.string()).optional(),
  dependencies: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

export type PipelineMetadataType = z.infer<typeof PipelineMetadata>;

export const PipelineContext = z.object({
  userId: z.string(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PipelineContextType = z.infer<typeof PipelineContext>;

export const PipelineResult = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type PipelineResultType = z.infer<typeof PipelineResult>;

// Base pipeline interface
export interface Pipeline {
  metadata: PipelineMetadataType;
  execute(context: PipelineContextType): Promise<PipelineResultType>;
  validate?(): Promise<boolean>;
  cleanup?(): Promise<void>;
}
```

### Filter Pipeline Contract

```typescript
// libs/typescript/contracts/src/pipelines/filter.ts
import { z } from 'zod';

export const FilterInletInput = z.object({
  message: z.string(),
  model: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const FilterInletOutput = z.object({
  message: z.string(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  skip: z.boolean().optional(), // Skip sending to LLM
});

export const FilterOutletInput = z.object({
  response: z.string(),
  model: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const FilterOutletOutput = z.object({
  response: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export interface FilterPipeline extends Pipeline {
  inlet?(input: z.infer<typeof FilterInletInput>): Promise<z.infer<typeof FilterInletOutput>>;
  outlet?(input: z.infer<typeof FilterOutletInput>): Promise<z.infer<typeof FilterOutletOutput>>;
}
```

### Pipe Pipeline Contract

```typescript
// libs/typescript/contracts/src/pipelines/pipe.ts
import { z } from 'zod';

export const PipeInput = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  model: z.string(),
  conversationId: z.string(),
  userId: z.string(),
  stream: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const PipeOutput = z.object({
  content: z.string().optional(),
  stream: z.any().optional(), // AsyncIterator for streaming
  metadata: z.record(z.unknown()).optional(),
});

export interface PipePipeline extends Pipeline {
  pipe(input: z.infer<typeof PipeInput>): Promise<z.infer<typeof PipeOutput>>;
}
```

### Action Pipeline Contract

```typescript
// libs/typescript/contracts/src/pipelines/action.ts
import { z } from 'zod';

export const ActionInput = z.object({
  actionId: z.string(),
  conversationId: z.string(),
  messageId: z.string().optional(),
  userId: z.string(),
  params: z.record(z.unknown()).optional(),
});

export const ActionOutput = z.object({
  result: z.unknown(),
  uiUpdate: z.object({
    type: z.enum(['toast', 'modal', 'inline']),
    content: z.string(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export interface ActionPipeline extends Pipeline {
  execute(input: z.infer<typeof ActionInput>): Promise<z.infer<typeof ActionOutput>>;
  getButton(): {
    label: string;
    icon?: string;
    position: 'message' | 'conversation' | 'global';
  };
}
```

## Security Model

### Sandboxing Strategy

**Option 1: VM2 (Deprecated but battle-tested)**
```typescript
import { VM } from 'vm2';

class VM2Sandbox {
  private vm: VM;
  
  constructor(timeout: number = 5000, memoryLimit: number = 128) {
    this.vm = new VM({
      timeout,
      sandbox: {
        console: {
          log: (...args: any[]) => this.logHandler('log', args),
          error: (...args: any[]) => this.logHandler('error', args),
        },
        // Only safe globals
      },
      eval: false,
      wasm: false,
    });
  }
  
  async run(code: string, context: any): Promise<any> {
    const wrappedCode = `
      (async function(context) {
        ${code}
        return execute(context);
      })(${JSON.stringify(context)})
    `;
    
    return this.vm.run(wrappedCode);
  }
}
```

**Option 2: Worker Threads (Modern, Supported)**
```typescript
import { Worker } from 'worker_threads';

class WorkerSandbox {
  async run(code: string, context: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(code, { eval: true });
      
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error('Pipeline execution timeout'));
      }, timeout);
      
      worker.on('message', (result) => {
        clearTimeout(timer);
        worker.terminate();
        resolve(result);
      });
      
      worker.on('error', (error) => {
        clearTimeout(timer);
        worker.terminate();
        reject(error);
      });
      
      worker.postMessage(context);
    });
  }
}
```

**Recommendation**: Start with Worker Threads for modern Node.js support, add VM2 fallback if needed.

### Validation Layers

```typescript
// packages/webui-pipelines/src/validation/PipelineValidator.ts

export class PipelineValidator {
  async validate(code: string, metadata: PipelineMetadataType): Promise<ValidationResult> {
    const checks = [
      this.checkSyntax(code),
      this.checkForbiddenAPIs(code),
      this.checkCodeComplexity(code),
      this.checkDependencies(metadata.dependencies),
      this.checkPermissions(metadata.permissions),
    ];
    
    const results = await Promise.all(checks);
    
    return {
      valid: results.every(r => r.valid),
      errors: results.flatMap(r => r.errors || []),
    };
  }
  
  private checkForbiddenAPIs(code: string): ValidationResult {
    const forbidden = [
      /require\(['"]fs['"]\)/,
      /require\(['"]child_process['"]\)/,
      /require\(['"]net['"]\)/,
      /process\.exit/,
      /eval\(/,
      /Function\(/,
      /__dirname/,
      /__filename/,
    ];
    
    const violations = forbidden.filter(pattern => pattern.test(code));
    
    return {
      valid: violations.length === 0,
      errors: violations.map(v => `Forbidden API usage: ${v.source}`),
    };
  }
  
  private checkCodeComplexity(code: string): ValidationResult {
    const lines = code.split('\n').length;
    const maxLines = 500;
    
    if (lines > maxLines) {
      return {
        valid: false,
        errors: [`Code too complex: ${lines} lines (max ${maxLines})`],
      };
    }
    
    return { valid: true };
  }
}
```

## Pipeline Registry

```typescript
// packages/webui-pipelines/src/PipelineRegistry.ts

export class PipelineRegistry {
  private pipelines = new Map<string, LoadedPipeline>();
  private sandbox: Sandbox;
  private validator: PipelineValidator;
  
  constructor(config: RegistryConfig) {
    this.sandbox = new WorkerSandbox(config.timeout, config.memoryLimit);
    this.validator = new PipelineValidator();
  }
  
  async load(code: string, metadata: PipelineMetadataType): Promise<void> {
    // 1. Validate
    const validation = await this.validator.validate(code, metadata);
    if (!validation.valid) {
      throw new PipelineValidationError(validation.errors);
    }
    
    // 2. Compile (optional TypeScript support)
    const compiled = await this.compileIfNeeded(code, metadata);
    
    // 3. Test load in sandbox
    await this.sandbox.run(compiled, { type: 'test' });
    
    // 4. Store
    this.pipelines.set(metadata.id, {
      metadata,
      code: compiled,
      loadedAt: new Date(),
      executionCount: 0,
    });
    
    // 5. Emit event
    this.emit('pipeline:loaded', { id: metadata.id });
  }
  
  async execute(id: string, context: PipelineContextType): Promise<PipelineResultType> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || !pipeline.metadata.enabled) {
      throw new PipelineNotFoundError(id);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.sandbox.run(pipeline.code, context);
      
      // Update metrics
      pipeline.executionCount++;
      pipeline.lastExecutedAt = new Date();
      
      // Emit telemetry
      this.emit('pipeline:executed', {
        id,
        duration: Date.now() - startTime,
        success: true,
      });
      
      return result;
    } catch (error) {
      this.emit('pipeline:error', {
        id,
        error: error.message,
        duration: Date.now() - startTime,
      });
      
      throw new PipelineExecutionError(id, error);
    }
  }
  
  async unload(id: string): Promise<void> {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) return;
    
    // Call cleanup if defined
    if (pipeline.cleanup) {
      await pipeline.cleanup();
    }
    
    this.pipelines.delete(id);
    this.emit('pipeline:unloaded', { id });
  }
  
  list(): PipelineMetadataType[] {
    return Array.from(this.pipelines.values()).map(p => p.metadata);
  }
}
```

## Example Pipelines

### Example 1: Rate Limiter (Filter)

```typescript
// rate-limiter.pipeline.ts
import type { FilterPipeline, FilterInletInput, FilterInletOutput } from '@cortex-os/contracts/pipelines';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

export const metadata = {
  id: crypto.randomUUID(),
  name: 'Rate Limiter',
  description: 'Limits messages per user per minute',
  version: '1.0.0',
  type: 'filter' as const,
  config: {
    maxMessagesPerMinute: 10,
  },
};

export async function inlet(input: FilterInletInput): Promise<FilterInletOutput> {
  const { userId } = input;
  const limit = metadata.config.maxMessagesPerMinute;
  const now = Date.now();
  
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return { message: input.message };
  }
  
  if (userLimit.count >= limit) {
    return {
      message: input.message,
      skip: true, // Don't send to LLM
      metadata: { rateLimitExceeded: true },
    };
  }
  
  userLimit.count++;
  return { message: input.message };
}

export async function execute(context: any) {
  // Entry point for sandbox
  return inlet(context);
}
```

### Example 2: Translation (Filter)

```typescript
// translator.pipeline.ts
export const metadata = {
  id: crypto.randomUUID(),
  name: 'Auto Translator',
  description: 'Translates messages to/from target language',
  version: '1.0.0',
  type: 'filter' as const,
  config: {
    targetLanguage: 'en',
    apiKey: process.env.TRANSLATION_API_KEY,
  },
};

export async function inlet(input: FilterInletInput): Promise<FilterInletOutput> {
  const translated = await translate(input.message, metadata.config.targetLanguage);
  return {
    message: translated,
    metadata: { originalMessage: input.message },
  };
}

export async function outlet(input: FilterOutletInput): Promise<FilterOutletOutput> {
  // Translate response back to user's language
  const userLang = input.metadata?.userLanguage || 'en';
  const translated = await translate(input.response, userLang);
  return { response: translated };
}

async function translate(text: string, targetLang: string): Promise<string> {
  // Call translation API (mocked here)
  return text; // Replace with actual API call
}

export async function execute(context: any) {
  if (context.type === 'inlet') return inlet(context);
  if (context.type === 'outlet') return outlet(context);
}
```

### Example 3: Google Search (Pipe)

```typescript
// google-search.pipeline.ts
export const metadata = {
  id: crypto.randomUUID(),
  name: 'Google Search Agent',
  description: 'Searches Google and returns results',
  version: '1.0.0',
  type: 'pipe' as const,
  permissions: ['network:https://www.googleapis.com'],
  dependencies: {
    'node-fetch': '^3.0.0',
  },
};

export async function pipe(input: PipeInput): Promise<PipeOutput> {
  const query = input.messages[input.messages.length - 1].content;
  
  const results = await searchGoogle(query);
  
  const response = `Here are the top results:\n\n${results.map((r, i) => 
    `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`
  ).join('\n\n')}`;
  
  return { content: response };
}

async function searchGoogle(query: string): Promise<any[]> {
  // Call Google Custom Search API
  const apiKey = metadata.config.apiKey;
  const cx = metadata.config.searchEngineId;
  
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.items || [];
}

export async function execute(context: any) {
  return pipe(context);
}
```

### Example 4: Export Chat (Action)

```typescript
// export-chat.pipeline.ts
export const metadata = {
  id: crypto.randomUUID(),
  name: 'Export Chat to PDF',
  description: 'Exports conversation as PDF',
  version: '1.0.0',
  type: 'action' as const,
  dependencies: {
    'pdfkit': '^0.13.0',
  },
};

export function getButton() {
  return {
    label: 'Export PDF',
    icon: 'download',
    position: 'conversation' as const,
  };
}

export async function execute(input: ActionInput): Promise<ActionOutput> {
  const messages = await fetchConversationMessages(input.conversationId);
  
  const pdfBuffer = await generatePDF(messages);
  
  // Save to user's downloads or cloud storage
  const url = await uploadToStorage(pdfBuffer, `chat-${input.conversationId}.pdf`);
  
  return {
    result: { downloadUrl: url },
    uiUpdate: {
      type: 'toast',
      content: 'Chat exported successfully!',
    },
  };
}

async function generatePDF(messages: any[]): Promise<Buffer> {
  // Use PDFKit to generate PDF
  return Buffer.from('mock pdf');
}
```

## Database Schema

```typescript
// apps/cortex-webui/backend/src/db/schema/pipelines.ts
export const pipelines = sqliteTable('pipelines', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').notNull(),
  type: text('type').$type<'filter' | 'pipe' | 'action'>().notNull(),
  code: text('code').notNull(), // Source code
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const pipelineExecutions = sqliteTable('pipeline_executions', {
  id: text('id').primaryKey(),
  pipelineId: text('pipeline_id').references(() => pipelines.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  executedAt: integer('executed_at', { mode: 'timestamp' }).notNull(),
  durationMs: integer('duration_ms').notNull(),
  success: integer('success', { mode: 'boolean' }).notNull(),
  errorMessage: text('error_message'),
});
```

## Admin UI Components

### PipelineUpload Component

```tsx
// apps/cortex-webui/frontend/src/components/Admin/PipelineUpload.tsx
import { useState } from 'react';

export const PipelineUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    type: 'filter' as const,
  });
  
  const handleUpload = async () => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('code', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await fetch('/api/pipelines/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      toast.success('Pipeline uploaded successfully!');
    } else {
      const error = await response.json();
      toast.error(`Upload failed: ${error.message}`);
    }
  };
  
  return (
    <div className="pipeline-upload">
      <input
        type="file"
        accept=".ts,.js"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <input
        placeholder="Pipeline name"
        value={metadata.name}
        onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
      />
      <textarea
        placeholder="Description"
        value={metadata.description}
        onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
      />
      <select
        value={metadata.type}
        onChange={(e) => setMetadata({ ...metadata, type: e.target.value as any })}
      >
        <option value="filter">Filter</option>
        <option value="pipe">Pipe</option>
        <option value="action">Action</option>
      </select>
      <button onClick={handleUpload}>Upload Pipeline</button>
    </div>
  );
};
```

## Next Steps

1. Create `packages/webui-pipelines` package
2. Implement `PipelineRegistry` with Worker Threads sandbox
3. Create validation layer
4. Add REST API endpoints
5. Build admin UI
6. Create 5 example pipelines
7. Write comprehensive tests
8. Security audit

---

**brAInwav Agent**: TypeScript Pipelines design complete. Ready for implementation when Phase 1 (RAG) is done.
