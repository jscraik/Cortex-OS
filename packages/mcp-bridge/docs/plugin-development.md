# Plugin Development Guide

This comprehensive guide covers everything you need to know about developing MCP plugins for Cortex OS.

## Plugin Architecture

### Core Components

Every MCP plugin consists of these essential parts:

```typescript
import { McpPlugin, ToolHandler } from '@cortex-os/mcp-bridge/auth';

export const myPlugin: McpPlugin = {
  // Plugin metadata
  name: 'my-plugin',
  version: '1.0.0',
  description: 'What this plugin does',

  // Plugin capabilities
  tools: [...],
  resources?: [...],
  prompts?: [...],

  // Lifecycle hooks
  onLoad?: async () => { /* initialization */ },
  onUnload?: async () => { /* cleanup */ },

  // Configuration
  config?: { /* plugin settings */ }
};
```

### Tool Implementation

Tools are the primary interface for plugin functionality:

```typescript
import { z } from 'zod';

const myTool = {
  name: 'analyze-code',
  description: 'Analyze code for patterns and issues',

  // Input validation with Zod
  inputSchema: z.object({
    code: z.string().min(1, 'Code is required'),
    language: z.enum(['typescript', 'javascript', 'python']),
    strictMode: z.boolean().default(false),
    options: z
      .object({
        checkStyle: z.boolean().default(true),
        checkSecurity: z.boolean().default(true),
        maxComplexity: z.number().min(1).max(20).default(10),
      })
      .optional(),
  }),

  // Tool implementation
  handler: async (args, context) => {
    const { code, language, strictMode, options = {} } = args;

    // Access plugin context
    const { logger, config, resourceManager } = context;

    logger.info('Starting code analysis', { language, strictMode });

    try {
      // Perform analysis
      const analysis = await analyzeCode(code, {
        language,
        strict: strictMode,
        ...options,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Analysis complete. Found ${analysis.issues.length} issues.`,
          },
          {
            type: 'json',
            data: analysis,
          },
        ],
        metadata: {
          processingTime: Date.now() - context.startTime,
          cacheUsed: analysis.fromCache,
          confidence: analysis.confidence,
        },
      };
    } catch (error) {
      logger.error('Analysis failed', error);
      throw new Error(`Code analysis failed: ${error.message}`);
    }
  },
};
```

## Advanced Features

### Resource Management

Resources provide access to external data and services:

```typescript
const myPlugin: McpPlugin = {
  // ... other properties

  resources: [
    {
      name: 'code-templates',
      description: 'Access to code template library',

      async list(args) {
        return {
          resources: [
            {
              name: 'react-component',
              description: 'React component template',
              mimeType: 'text/typescript',
            },
            {
              name: 'api-endpoint',
              description: 'Express API endpoint template',
              mimeType: 'text/typescript',
            },
          ],
        };
      },

      async read(resourceName, args) {
        const template = await loadTemplate(resourceName);
        return {
          contents: [
            {
              type: 'text',
              text: template.content,
              mimeType: template.mimeType,
            },
          ],
        };
      },
    },
  ],
};
```

### Prompt Templates

Define reusable prompts for AI interactions:

```typescript
const myPlugin: McpPlugin = {
  // ... other properties

  prompts: [
    {
      name: 'code-review',
      description: 'Generate a comprehensive code review',

      arguments: z.object({
        code: z.string(),
        language: z.string(),
        focusAreas: z.array(z.string()).optional(),
      }),

      async generate(args) {
        const { code, language, focusAreas = [] } = args;

        return {
          messages: [
            {
              role: 'system',
              content: `You are a senior software engineer reviewing ${language} code. Focus on: ${focusAreas.join(', ')}`,
            },
            {
              role: 'user',
              content: `Please review this code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
            },
          ],
        };
      },
    },
  ],
};
```

### Configuration Management

Handle plugin configuration and user preferences:

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().default('https://api.example.com'),
  timeout: z.number().positive().default(30000),
  features: z.object({
    caching: z.boolean().default(true),
    analytics: z.boolean().default(false),
  }),
});

const myPlugin: McpPlugin = {
  // ... other properties

  config: {
    schema: ConfigSchema,
    defaults: {
      baseUrl: 'https://api.example.com',
      timeout: 30000,
      features: {
        caching: true,
        analytics: false,
      },
    },
  },

  async onLoad(context) {
    const config = context.config;

    // Validate configuration
    const validConfig = ConfigSchema.parse(config);

    // Initialize with config
    this.apiClient = new ApiClient({
      apiKey: validConfig.apiKey,
      baseUrl: validConfig.baseUrl,
      timeout: validConfig.timeout,
    });
  },
};
```

## Error Handling & Validation

### Input Validation

Use Zod for robust input validation:

```typescript
import { z } from 'zod';

const FileAnalysisSchema = z.object({
  filePath: z
    .string()
    .min(1, 'File path is required')
    .refine((path) => path.endsWith('.ts') || path.endsWith('.js'), {
      message: 'Only TypeScript and JavaScript files are supported',
    }),

  options: z
    .object({
      includeTests: z.boolean().default(false),
      maxFileSize: z
        .number()
        .positive()
        .default(1024 * 1024), // 1MB
      encoding: z.enum(['utf8', 'ascii', 'base64']).default('utf8'),
    })
    .optional(),
});

const tool = {
  name: 'analyze-file',
  inputSchema: FileAnalysisSchema,

  handler: async (args, context) => {
    // args is automatically typed and validated
    const { filePath, options = {} } = args;

    // Additional runtime validation
    if (!(await fileExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = await getFileStats(filePath);
    if (stats.size > options.maxFileSize) {
      throw new Error(`File too large: ${stats.size} bytes (max: ${options.maxFileSize})`);
    }

    // Process file...
  },
};
```

### Error Types

Define custom error types for better error handling:

```typescript
export class PluginError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class ValidationError extends PluginError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ResourceNotFoundError extends PluginError {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`, 'RESOURCE_NOT_FOUND', 404);
  }
}

// Usage in tools
const handler: ToolHandler = async (args, context) => {
  try {
    // Tool logic
    return result;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Return user-friendly validation error
      return {
        content: [
          {
            type: 'text',
            text: `Validation failed: ${error.message}`,
          },
        ],
        isError: true,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    // Re-throw for system errors
    throw error;
  }
};
```

## Testing Strategies

### Unit Testing

Test individual tools and components:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myPlugin } from '../src/my-plugin.js';

describe('MyPlugin', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://test.api.com',
      },
      resourceManager: {
        allocate: vi.fn(),
        release: vi.fn(),
      },
      startTime: Date.now(),
    };
  });

  describe('analyze-code tool', () => {
    it('should analyze valid code', async () => {
      const tool = myPlugin.tools.find((t) => t.name === 'analyze-code');
      expect(tool).toBeDefined();

      const result = await tool!.handler(
        {
          code: 'const x = 1;',
          language: 'typescript',
          strictMode: false,
        },
        mockContext,
      );

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(mockContext.logger.info).toHaveBeenCalled();
    });

    it('should handle invalid input', async () => {
      const tool = myPlugin.tools.find((t) => t.name === 'analyze-code');

      await expect(
        tool!.handler(
          {
            code: '',
            language: 'invalid' as any,
            strictMode: false,
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });
});
```

### Integration Testing

Test complete plugin workflows:

```typescript
import { PluginRegistry } from '@cortex-os/mcp-bridge';
import { createMcpClient } from '@cortex-os/mcp-bridge/client';
import { myPlugin } from '../src/my-plugin.js';

describe('Plugin Integration', () => {
  let registry: PluginRegistry;
  let client: any;

  beforeEach(async () => {
    registry = new PluginRegistry();
    await registry.register(myPlugin);

    // Start test server
    const server = createMcpServer({ registry });
    await server.start();

    client = createMcpClient('ws://localhost:8080');
    await client.connect();
    await client.initialize();
  });

  afterEach(async () => {
    await client.disconnect();
    await server.stop();
  });

  it('should handle end-to-end tool calls', async () => {
    const result = await client.callTool('analyze-code', {
      code: 'function test() { return true; }',
      language: 'javascript',
    });

    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('Analysis complete');
  });
});
```

## Performance Optimization

### Caching Strategies

Implement intelligent caching for expensive operations:

```typescript
import { LRUCache } from 'lru-cache';

class AnalysisCache {
  private cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 60, // 1 hour
  });

  private getCacheKey(code: string, options: any): string {
    return crypto
      .createHash('sha256')
      .update(code + JSON.stringify(options))
      .digest('hex');
  }

  async get(code: string, options: any) {
    const key = this.getCacheKey(code, options);
    return this.cache.get(key);
  }

  async set(code: string, options: any, result: any) {
    const key = this.getCacheKey(code, options);
    this.cache.set(key, result);
  }
}

const cache = new AnalysisCache();

const handler: ToolHandler = async (args, context) => {
  const { code, ...options } = args;

  // Check cache first
  const cached = await cache.get(code, options);
  if (cached && context.config.features.caching) {
    context.logger.debug('Using cached analysis result');
    return {
      ...cached,
      metadata: { ...cached.metadata, fromCache: true },
    };
  }

  // Perform analysis
  const result = await performAnalysis(code, options);

  // Cache result
  await cache.set(code, options, result);

  return result;
};
```

### Memory & CPU Resource Management

Manage CPU, memory, and I/O resources:

```typescript
class ResourceManager {
  private activeOperations = new Set<string>();
  private maxConcurrent = 5;

  async withResource<T>(operationId: string, operation: () => Promise<T>): Promise<T> {
    if (this.activeOperations.size >= this.maxConcurrent) {
      throw new Error('Too many concurrent operations');
    }

    this.activeOperations.add(operationId);

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), 30000),
        ),
      ]);

      return result;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }
}

const resourceManager = new ResourceManager();

const handler: ToolHandler = async (args, context) => {
  const operationId = `analysis-${Date.now()}-${Math.random()}`;

  return resourceManager.withResource(operationId, async () => {
    // Expensive operation
    return performAnalysis(args.code);
  });
};
```

## Security Best Practices

### Input Sanitization

Always sanitize and validate inputs:

```typescript
import { escape } from 'html-escaper';
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Escape HTML and sanitize
    return DOMPurify.sanitize(escape(input));
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize keys and values
      const safeKey = escape(key);
      sanitized[safeKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
};

const handler: ToolHandler = async (args, context) => {
  // Sanitize all inputs
  const safeArgs = sanitizeInput(args);

  // Process with sanitized data
  return processData(safeArgs);
};
```

### Access Control

Implement proper access controls:

```typescript
const handler: ToolHandler = async (args, context) => {
  // Check permissions
  if (!context.user?.hasPermission('code:analyze')) {
    throw new Error('Insufficient permissions');
  }

  // Validate resource access
  const { filePath } = args;
  if (!isPathAllowed(filePath, context.user.allowedPaths)) {
    throw new Error('Access denied to requested file');
  }

  // Proceed with operation
  return analyzeFile(filePath);
};

function isPathAllowed(path: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((allowedPath) => path.startsWith(allowedPath) && !path.includes('..'));
}
```

## Publishing & Distribution

### Package Structure

Organize your plugin for distribution:

```text
my-plugin/
├── src/
│   ├── index.ts          # Main plugin export
│   ├── tools/            # Individual tools
│   ├── resources/        # Resource handlers
│   ├── types.ts          # Type definitions
│   └── utils/            # Utility functions
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data
├── docs/
│   ├── README.md         # Plugin documentation
│   └── api.md           # API reference
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .mcprc.json          # MCP configuration
```

### Metadata Configuration

Configure `.mcprc.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Advanced code analysis plugin",
  "category": "development",
  "tags": ["code", "analysis", "typescript", "javascript"],
  "author": {
    "name": "Your Name",
    "email": "your@email.com",
    "url": "https://yourwebsite.com"
  },
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-plugin"
  },
  "keywords": ["mcp", "cortex-os", "code-analysis"],
  "engines": {
    "node": ">=18.0.0",
    "cortex-os": ">=1.0.0"
  },
  "security": {
    "sandbox": true,
    "permissions": {
      "filesystem": "read",
      "network": ["api.example.com"],
      "resources": {
        "memory": "256MB",
        "cpu": "1000ms"
      }
    }
  }
}
```

### Marketplace Submission

Prepare for marketplace submission:

```bash
# Build and test
pnpm build
pnpm test
pnpm lint

# Generate documentation
pnpm docs:generate

# Package for submission
pnpm pack

# Submit to marketplace (requires account)
pnpm mcp:publish --verify
```

## Next Steps

- 🏪 [Marketplace Guide](./marketplace.md) - Publishing and discovery
- 🛡️ [Security Guide](./security.md) - Security best practices
- 🔧 [API Reference](./api-reference.md) - Complete API documentation
- 📖 [Examples](./examples/) - Real-world plugin examples

## Community & Support

- 💬 [Discord Community](https://discord.gg/cortex-os)
- 🐛 [Issue Tracker](https://github.com/jamiescottcraik/cortex-os/issues)
- 📚 [Plugin Registry](https://marketplace.cortexos.ai)
- 📧 [Developer Support](mailto:dev-support@cortexos.ai)
