# TypeScript Code Mode Implementation Guide

## Overview

The TypeScript Code Mode implementation converts MCP tool specifications into type-safe TypeScript APIs that models can use to generate executable code instead of making individual tool calls.

## Architecture

### Core Components

1. **API Generator** (`packages/mcp-core/src/codegen/typescript-api-generator.ts`)
2. **Runtime Dispatcher** (`packages/orchestration/src/langgraph/code-mode-dispatcher.ts`)
3. **Execution Environment** (`packages/agents/src/code-mode/execution-environment.ts`)
4. **LangGraph Integration** (`packages/orchestration/src/langgraph/code-mode-node.ts`)

## Implementation Details

### API Generator

The TypeScript API generator creates type-safe interfaces from MCP server specifications:

```typescript
export class TypeScriptAPIGenerator {
  constructor(
    private mcpRegistry: MCPRegistry,
    private brainwavAttribution: boolean = true
  ) {}

  async generateAPI(namespace: string, tools: MCPTool[]): Promise<string> {
    const header = this.generateHeader(namespace);
    const interfaces = this.generateTypeInterfaces(tools);
    const methods = this.generateMethods(tools);
    const runtime = this.generateRuntime(tools);
    
    return `${header}

${interfaces}

${methods}

${runtime}`;
  }

  private generateHeader(namespace: string): string {
    return `
/**
 * Generated brAInwav TypeScript MCP API for ${namespace}
 * Auto-generated from MCP server specifications
 * 
 * This API provides type-safe access to MCP tools through
 * executable TypeScript code instead of individual tool calls.
 */

import type { N0Session } from '@cortex-os/orchestration';
import { dispatchTools } from '@cortex-os/orchestration';
`;
  }

  private generateMethods(tools: MCPTool[]): string {
    return `
export namespace ${this.namespace}API {
  ${tools.map(tool => this.generateToolMethod(tool)).join('\n\n')}
}`;
  }

  private generateToolMethod(tool: MCPTool): string {
    const methodName = toCamelCase(tool.name);
    const inputType = this.generateInputType(tool.inputSchema);
    const outputType = this.generateOutputType(tool.outputSchema);
    
    return `
  /**
   * ${tool.description}
   * Generated from MCP tool: ${tool.name}
   * brAInwav powered execution
   */
  export async function ${methodName}(
    ${this.generateParameters(tool.inputSchema)}
  ): Promise<${outputType}> {
    return await __brainwav_runtime__.dispatch('${tool.name}', arguments[0]);
  }`;
  }
}
```

### Runtime Dispatcher

The runtime dispatcher integrates with the existing orchestration system:

```typescript
export class CodeModeDispatcher {
  constructor(
    private mcpRegistry: MCPRegistry,
    private session: N0Session
  ) {}

  generateRuntime(tools: MCPTool[]): string {
    const allowedTools = tools.map(t => t.name);
    
    return `
const __brainwav_runtime__ = {
  session: ${JSON.stringify(this.session)},
  
  async dispatch(toolName: string, params: unknown): Promise<unknown> {
    const jobs = [{
      id: crypto.randomUUID(),
      name: toolName,
      input: params,
      estimateTokens: this.estimateTokens(params),
      metadata: { 
        brainwav_generated: true,
        language: 'typescript',
        timestamp: Date.now()
      },
      execute: async (input: unknown) => {
        return await this.mcpRegistry.invokeTool(toolName, input);
      }
    }];
    
    const results = await dispatchTools(jobs, {
      session: this.session,
      budget: { timeMs: 30000, tokens: 10000 },
      allowList: ${JSON.stringify(allowedTools)},
      hooks: {
        run: async (event, ctx) => {
          if (event === 'PreToolUse') {
            console.log('brAInwav tool execution starting:', ctx.tool.name);
          }
          return [{ action: 'allow' }];
        }
      }
    });
    
    const result = results[0];
    if (result?.status === 'error') {
      throw new Error(\`brAInwav tool execution failed: \${result.reason}\`);
    }
    
    return result?.result;
  },
  
  estimateTokens(params: unknown): number {
    return JSON.stringify(params).length / 4; // Rough estimate
  }
};`;
  }
}
```

### Execution Environment

Safe execution environment with monitoring:

```typescript
export class CodeModeExecutionEnvironment {
  private vmContext: vm.Context;
  
  constructor(
    private mcpServers: MCPServerConfig[],
    private session: N0Session
  ) {
    this.setupVM();
  }

  async executeCode(code: string): Promise<ExecutionResult> {
    // Generate APIs for registered MCP servers
    const apis = await this.generateAPIs();
    
    // Create execution context with brAInwav monitoring
    const context = {
      ...apis,
      console: this.createSafeConsole(),
      setTimeout: this.createSafeTimeout(),
      // Restricted globals only
    };
    
    const startTime = Date.now();
    
    try {
      // Parse and validate AST
      const ast = this.parseAndValidate(code);
      
      // Execute with timeout and resource monitoring
      const result = await this.runInSandbox(code, context);
      
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
        brainwav_powered: true,
        language: 'typescript'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        brainwav_powered: true,
        language: 'typescript'
      };
    }
  }

  private createSafeConsole() {
    return {
      log: (...args: any[]) => {
        console.log('[brAInwav Code Mode]', ...args);
      },
      error: (...args: any[]) => {
        console.error('[brAInwav Code Mode Error]', ...args);
      },
      warn: (...args: any[]) => {
        console.warn('[brAInwav Code Mode Warning]', ...args);
      }
    };
  }
}
```

## Usage Examples

### File Processing

Model generates efficient batch processing code:

```typescript
// Generated by AI model using TypeScript APIs
async function processSourceFiles() {
  console.log('brAInwav file processing starting...');
  
  // Get list of TypeScript files
  const files = await FileSystemAPI.listDir('/src');
  const tsFiles = files.filter(f => f.endsWith('.ts'));
  
  const results = [];
  
  // Process in batches for efficiency
  for (let i = 0; i < tsFiles.length; i += 10) {
    const batch = tsFiles.slice(i, i + 10);
    
    // Read all files in batch
    const contents = await Promise.all(
      batch.map(file => FileSystemAPI.read(file))
    );
    
    // Analyze code quality
    for (let j = 0; j < batch.length; j++) {
      const analysis = await CodeAnalysisAPI.analyze(contents[j]);
      
      if (analysis.quality < 0.8) {
        // Create issue for low quality code
        await GitHubAPI.createIssue({
          title: `brAInwav: Code quality issue in ${batch[j]}`,
          body: `Quality score: ${analysis.quality}\nSuggestions: ${analysis.suggestions.join(', ')}`,
          labels: ['code-quality', 'automated', 'brainwav']
        });
      }
      
      results.push({
        file: batch[j],
        quality: analysis.quality,
        lines: analysis.lineCount
      });
    }
    
    console.log(`brAInwav processed batch ${Math.floor(i/10) + 1}/${Math.ceil(tsFiles.length/10)}`);
  }
  
  console.log(`brAInwav processing complete: ${results.length} files analyzed`);
  return results;
}
```

### Data Pipeline

Complex data processing with error handling:

```typescript
// AI model generates sophisticated data pipeline
async function processDataPipeline() {
  console.log('brAInwav data pipeline starting...');
  
  try {
    // Step 1: Extract data from multiple sources
    const databases = ['users', 'orders', 'products'];
    const datasets = [];
    
    for (const db of databases) {
      const data = await DatabaseAPI.query(db, 'SELECT * FROM main_table');
      datasets.push({ source: db, data });
      console.log(`brAInwav extracted ${data.length} records from ${db}`);
    }
    
    // Step 2: Transform data with validation
    const transformedData = [];
    for (const dataset of datasets) {
      for (const record of dataset.data) {
        // Validate record
        const validation = await ValidationAPI.validate(record);
        if (validation.valid) {
          // Transform record
          const transformed = await TransformAPI.transform(record, dataset.source);
          transformedData.push(transformed);
        } else {
          console.warn(`brAInwav validation failed for record:`, validation.errors);
        }
      }
    }
    
    // Step 3: Load data in batches
    const batchSize = 100;
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      await DatabaseAPI.insertBatch('processed_data', batch);
      console.log(`brAInwav loaded batch ${Math.floor(i/batchSize) + 1}`);
    }
    
    console.log(`brAInwav pipeline complete: ${transformedData.length} records processed`);
    
    // Step 4: Generate report
    const report = {
      totalRecords: transformedData.length,
      sources: databases.length,
      completedAt: new Date().toISOString(),
      brainwav_powered: true
    };
    
    await FileSystemAPI.write('/reports/pipeline-report.json', JSON.stringify(report, null, 2));
    
    return report;
    
  } catch (error) {
    console.error('brAInwav pipeline error:', error);
    
    // Send alert
    await NotificationAPI.sendAlert({
      title: 'brAInwav Data Pipeline Failed',
      message: error.message,
      severity: 'high'
    });
    
    throw error;
  }
}
```

## Integration with LangGraph

### Code Mode Node

```typescript
export const createTypeScriptCodeModeNode = (mcpRegistry: MCPRegistry) => {
  return StateGraph.nodes.code({
    async execute(state: N0State): Promise<N0State> {
      console.log('brAInwav TypeScript code mode execution starting...');
      
      const codeEnv = new CodeModeExecutionEnvironment(
        mcpRegistry.getServers(),
        state.session
      );
      
      // Generate TypeScript code based on current context
      const generatedCode = await state.model.generate({
        prompt: `
Generate efficient TypeScript code using these brAInwav APIs:
${await getAvailableAPIs('typescript')}

Current context: ${JSON.stringify(state.context)}
Task: ${state.currentTask}

Focus on:
- Batch operations instead of individual calls
- Error handling and recovery
- Progress logging with brAInwav attribution
- Efficient resource usage
        `,
        mode: 'code',
        language: 'typescript'
      });
      
      // Execute the generated code
      const result = await codeEnv.executeCode(generatedCode);
      
      // Update state with results
      return {
        ...state,
        codeExecutions: [
          ...state.codeExecutions,
          {
            id: crypto.randomUUID(),
            language: 'typescript',
            code: generatedCode,
            result: result.result,
            success: result.success,
            executionTime: result.executionTime,
            brainwav_attribution: true,
            timestamp: Date.now()
          }
        ],
        lastResult: result.result
      };
    }
  });
};
```

## Performance Optimization

### Token Efficiency

Traditional tool calling vs Code Mode:

```typescript
// Traditional: 50 individual tool calls (~2000 tokens)
const results = [];
for (let i = 0; i < 50; i++) {
  const result = await callTool('process_item', { item: items[i] });
  results.push(result);
}

// Code Mode: Single code block (~400 tokens)
const results = [];
const batches = chunk(items, 10);
for (const batch of batches) {
  const batchResults = await ProcessAPI.processBatch(batch);
  results.push(...batchResults);
}
```

### Execution Speed

Parallel processing capabilities:

```typescript
// Parallel file processing
const files = await FileSystemAPI.listDir('/data');
const chunks = chunk(files, 5); // Process 5 files at a time

const allResults = await Promise.all(
  chunks.map(async (chunk) => {
    return Promise.all(
      chunk.map(async (file) => {
        const content = await FileSystemAPI.read(file);
        return await ProcessAPI.analyze(content);
      })
    );
  })
);

console.log(`brAInwav processed ${files.length} files in parallel`);
```

## Testing

### Unit Tests

```typescript
// packages/mcp-core/tests/typescript-api-generator.test.ts
describe('TypeScript API Generator', () => {
  let generator: TypeScriptAPIGenerator;
  
  beforeEach(() => {
    generator = new TypeScriptAPIGenerator(mockMCPRegistry);
  });

  it('generates type-safe APIs with brAInwav branding', async () => {
    const tools = [
      { name: 'file_read', description: 'Read file', inputSchema: {...} },
      { name: 'file_write', description: 'Write file', inputSchema: {...} }
    ];
    
    const api = await generator.generateAPI('FileSystem', tools);
    
    expect(api).toContain('brAInwav');
    expect(api).toContain('export namespace FileSystemAPI');
    expect(api).toContain('async function fileRead');
    expect(api).toContain('async function fileWrite');
    expect(api).toContain('__brainwav_runtime__');
  });

  it('includes proper TypeScript types', async () => {
    const api = await generator.generateAPI('Test', mockTools);
    
    expect(api).toMatch(/: Promise<\w+>/);
    expect(api).toMatch(/\w+\s*:\s*\w+/); // Parameter types
    expect(api).toContain('export interface');
  });
});
```

### Integration Tests

```typescript
// tests/integration/typescript-code-mode.test.ts
describe('TypeScript Code Mode Integration', () => {
  it('executes generated code successfully', async () => {
    const codeEnv = new CodeModeExecutionEnvironment(mockServers, mockSession);
    
    const code = `
      const files = await FileSystemAPI.listDir('/test');
      const results = [];
      for (const file of files) {
        const content = await FileSystemAPI.read(file);
        results.push(content.length);
      }
      return results;
    `;
    
    const result = await codeEnv.executeCode(code);
    
    expect(result.success).toBe(true);
    expect(result.brainwav_powered).toBe(true);
    expect(result.language).toBe('typescript');
    expect(Array.isArray(result.result)).toBe(true);
  });
});
```

## Security Considerations

### Code Validation

1. **AST Parsing**: Validate syntax before execution
2. **Import Restrictions**: Only allow whitelisted modules
3. **API Restrictions**: Only generated APIs are available
4. **Resource Limits**: Memory and CPU constraints

### Sandboxing

```typescript
private createSecureContext(apis: Record<string, any>): vm.Context {
  return vm.createContext({
    // Only provide generated APIs
    ...apis,
    
    // Safe utilities
    console: this.createSafeConsole(),
    setTimeout: this.createSafeTimeout(),
    Promise,
    JSON,
    Math: {
      // Exclude Math.random for deterministic execution
      ...Math,
      random: undefined
    },
    
    // No access to:
    // - require/import
    // - process
    // - global
    // - __dirname/__filename
    // - Buffer
    // - etc.
  });
}
```

## Deployment

### Build Configuration

```json
{
  "scripts": {
    "build:code-mode": "tsc -p tsconfig.code-mode.json",
    "test:code-mode": "vitest run packages/**/tests/*code-mode*",
    "lint:code-mode": "eslint packages/**/src/**/*code-mode*"
  }
}
```

### Environment Configuration

```bash
# Enable TypeScript code mode
CORTEX_TS_CODE_MODE_ENABLED=true
CORTEX_TS_EXECUTION_TIMEOUT=30000
CORTEX_TS_MEMORY_LIMIT=256MB

# brAInwav branding
CORTEX_BRAINWAV_ATTRIBUTION=true
```

## Conclusion

The TypeScript Code Mode implementation provides a powerful, type-safe way to convert MCP tool calls into executable code, offering significant performance improvements while maintaining security and integration with existing Cortex-OS infrastructure.

---

**Co-authored-by: brAInwav Development Team**
