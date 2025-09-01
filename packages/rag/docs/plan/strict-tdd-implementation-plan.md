# Strict TDD Implementation Plan: Agentic RAG Enhancement

## Executive Summary

This document outlines a Test-Driven Development plan for transforming Cortex-OS RAG from basic embed→query into a comprehensive agentic second brain system. Following strict functional programming principles with industrial-grade standards as of August 2025.

## Code Style & Structure Compliance

### Functional Programming Requirements

- **Functions ≤ 40 lines**: All implementation functions strictly under 40 lines
- **Named exports only**: No default exports, explicit named exports for tree-shaking
- **No custom classes**: Unless absolutely required by external APIs (HuggingFace, MLX)
- **Immutable data**: Pure functions with no side effects where possible
- **Composition over inheritance**: Function composition patterns
- **DRY principles**: Shared utilities in dedicated modules

### File Organization

```
packages/rag/src/
├── core/                    # Core functional modules
│   ├── pipeline.ts         # Main RAG pipeline functions
│   ├── retrieval.ts        # Retrieval strategy functions
│   └── generation.ts       # Generation functions
├── agents/                 # Agentic coordination
│   ├── coordinator.ts      # Agent coordination functions
│   ├── tools.ts           # Individual tool functions
│   └── planning.ts        # Planning and reasoning functions
├── mlx/                    # Complete MLX integration
│   ├── client.ts          # MLX client functions
│   ├── embeddings.ts      # MLX embedding functions
│   └── generation.ts      # MLX generation functions
├── analysis/              # Code analysis functions
│   ├── ast-parser.ts      # AST parsing functions
│   ├── dependency.ts      # Dependency analysis functions
│   └── metrics.ts         # Code metrics functions
├── session/               # Session management
│   ├── manager.ts         # Session management functions
│   ├── templates.ts       # Template processing functions
│   └── extraction.ts      # Knowledge extraction functions
├── streaming/             # Streaming capabilities
│   ├── events.ts          # Event streaming functions
│   ├── pipeline.ts        # Streaming pipeline functions
│   └── handlers.ts        # Event handler functions
├── utils/                 # Utility functions
│   ├── validation.ts      # Zod validation schemas
│   ├── parsing.ts         # Text parsing utilities
│   └── metrics.ts         # Performance metrics
└── types/                 # Type definitions
    ├── core.ts            # Core type definitions
    ├── events.ts          # Event type definitions
    └── mlx.ts             # MLX type definitions
```

## Phase 1: Foundation & Testing Infrastructure (Week 1-2)

### TDD Cycle 1.1: Core Pipeline Functions

**RED**: Write failing tests

```typescript
// tests/core/pipeline.test.ts
describe('createRAGPipeline', () => {
  it('should create pipeline with default configuration', async () => {
    const pipeline = await createRAGPipeline({
      vectorStore: mockVectorStore,
      embeddings: mockEmbeddings,
      llm: mockLLM,
    });

    expect(pipeline).toBeDefined();
    expect(pipeline.retrieve).toBeInstanceOf(Function);
    expect(pipeline.generate).toBeInstanceOf(Function);
  });

  it('should handle empty queries gracefully', async () => {
    const pipeline = await createRAGPipeline(mockConfig);
    const result = await pipeline.retrieve('');

    expect(result).toEqual([]);
  });
});
```

**GREEN**: Implement minimal functions

```typescript
// src/core/pipeline.ts
import { z } from 'zod';
import type { RAGPipelineConfig, RAGPipeline, Document } from '../types/core.js';

const ConfigSchema = z.object({
  vectorStore: z.any(),
  embeddings: z.any(),
  llm: z.any(),
  topK: z.number().min(1).max(100).default(5),
  similarityThreshold: z.number().min(0).max(1).default(0.7),
});

export const createRAGPipeline = async (config: RAGPipelineConfig): Promise<RAGPipeline> => {
  const validatedConfig = ConfigSchema.parse(config);

  const retrieve = async (query: string): Promise<Document[]> => {
    if (!query.trim()) return [];

    const embedding = await validatedConfig.embeddings.embed(query);
    return validatedConfig.vectorStore.similaritySearch(embedding, validatedConfig.topK);
  };

  const generate = async (query: string, docs: Document[]): Promise<string> => {
    if (!query.trim() || docs.length === 0) return '';

    const context = docs.map((doc) => doc.content).join('\n\n');
    return validatedConfig.llm.generate({
      prompt: `Context: ${context}\n\nQuestion: ${query}`,
      maxTokens: 512,
    });
  };

  return { retrieve, generate, config: validatedConfig };
};
```

**REFACTOR**: Extract utilities and improve composition

### TDD Cycle 1.2: MLX Integration (Complete Implementation)

**RED**: MLX client tests

```typescript
// tests/mlx/client.test.ts
describe('createMLXClient', () => {
  it('should initialize MLX client with model configuration', async () => {
    const client = await createMLXClient({
      modelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
      device: 'gpu',
      dtype: 'float16',
    });

    expect(client.isReady).toBe(true);
    expect(client.modelInfo).toBeDefined();
  });

  it('should handle model loading failures gracefully', async () => {
    await expect(
      createMLXClient({
        modelPath: 'nonexistent/model',
      }),
    ).rejects.toThrow('Model loading failed');
  });
});
```

**GREEN**: Complete MLX implementation

```typescript
// src/mlx/client.ts
import { spawn } from 'child_process';
import { z } from 'zod';
import type { MLXConfig, MLXClient, MLXResponse } from '../types/mlx.js';

const MLXConfigSchema = z.object({
  modelPath: z.string().min(1),
  device: z.enum(['cpu', 'gpu']).default('gpu'),
  dtype: z.enum(['float16', 'float32', 'int8']).default('float16'),
  maxTokens: z.number().min(1).max(4096).default(512),
  temperature: z.number().min(0).max(2).default(0.7),
  pythonPath: z.string().default('python3'),
});

export const createMLXClient = async (config: MLXConfig): Promise<MLXClient> => {
  const validatedConfig = MLXConfigSchema.parse(config);

  let isReady = false;
  let modelInfo: any = null;

  const initializeModel = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const process = spawn(validatedConfig.pythonPath, [
        '-c',
        `
import mlx.core as mx
import mlx.nn as nn
from mlx_lm import load, generate
import json

try:
    model, tokenizer = load("${validatedConfig.modelPath}")
    info = {
        "model_type": model.__class__.__name__,
        "device": "${validatedConfig.device}",
        "dtype": "${validatedConfig.dtype}"
    }
    print(json.dumps(info))
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
        `,
      ]);

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0 && !output.includes('ERROR:')) {
          try {
            modelInfo = JSON.parse(output.trim());
            isReady = true;
            resolve();
          } catch (e) {
            reject(new Error(`Model initialization failed: ${e}`));
          }
        } else {
          reject(new Error(`Model loading failed: ${output}`));
        }
      });
    });
  };

  const generate = async (prompt: string): Promise<MLXResponse> => {
    if (!isReady) throw new Error('MLX client not ready');

    return new Promise((resolve, reject) => {
      const process = spawn(validatedConfig.pythonPath, [
        '-c',
        `
from mlx_lm import load, generate
import json

model, tokenizer = load("${validatedConfig.modelPath}")
response = generate(
    model, 
    tokenizer, 
    prompt="${prompt.replace(/"/g, '\\"')}", 
    max_tokens=${validatedConfig.maxTokens},
    temp=${validatedConfig.temperature}
)

result = {
    "text": response,
    "model": "${validatedConfig.modelPath}",
    "tokens_generated": len(tokenizer.encode(response))
}
print(json.dumps(result))
        `,
      ]);

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output.trim()));
          } catch (e) {
            reject(new Error(`Generation failed: ${e}`));
          }
        } else {
          reject(new Error(`MLX process failed: ${output}`));
        }
      });
    });
  };

  await initializeModel();

  return {
    generate,
    isReady,
    modelInfo,
    config: validatedConfig,
  };
};
```

### TDD Cycle 1.3: Embedding Functions

**RED**: Embedding tests

```typescript
// tests/mlx/embeddings.test.ts
describe('createMLXEmbeddings', () => {
  it('should generate embeddings for text', async () => {
    const embeddings = await createMLXEmbeddings({
      modelPath: 'mlx-community/bge-small-en-v1.5-mlx',
    });

    const result = await embeddings.embed('test document');

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toBeTypeOf('number');
  });

  it('should batch embed multiple documents', async () => {
    const embeddings = await createMLXEmbeddings({
      modelPath: 'mlx-community/bge-small-en-v1.5-mlx',
    });

    const results = await embeddings.batchEmbed(['document 1', 'document 2']);

    expect(results).toHaveLength(2);
    expect(results[0]).toBeInstanceOf(Array);
  });
});
```

**GREEN**: Complete MLX embeddings

```typescript
// src/mlx/embeddings.ts
import { spawn } from 'child_process';
import { z } from 'zod';
import type { MLXEmbeddingConfig, MLXEmbeddings } from '../types/mlx.js';

const EmbeddingConfigSchema = z.object({
  modelPath: z.string().min(1),
  maxLength: z.number().min(1).max(512).default(256),
  pythonPath: z.string().default('python3'),
  batchSize: z.number().min(1).max(32).default(8),
});

export const createMLXEmbeddings = async (config: MLXEmbeddingConfig): Promise<MLXEmbeddings> => {
  const validatedConfig = EmbeddingConfigSchema.parse(config);

  const embed = async (text: string): Promise<number[]> => {
    const results = await batchEmbed([text]);
    return results[0];
  };

  const batchEmbed = async (texts: string[]): Promise<number[][]> => {
    return new Promise((resolve, reject) => {
      const process = spawn(validatedConfig.pythonPath, [
        '-c',
        `
import mlx.core as mx
import mlx.nn as nn
from sentence_transformers import SentenceTransformer
import json

model = SentenceTransformer("${validatedConfig.modelPath}")
texts = ${JSON.stringify(texts)}

embeddings = model.encode(texts, convert_to_tensor=True)
embeddings_list = embeddings.tolist()

print(json.dumps(embeddings_list))
        `,
      ]);

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            resolve(JSON.parse(output.trim()));
          } catch (e) {
            reject(new Error(`Embedding failed: ${e}`));
          }
        } else {
          reject(new Error(`Embedding process failed: ${output}`));
        }
      });
    });
  };

  return { embed, batchEmbed, config: validatedConfig };
};
```

## Phase 2: Agentic Coordination (Week 3-4)

### TDD Cycle 2.1: Planning Functions

**RED**: Planning tests

```typescript
// tests/agents/planning.test.ts
describe('createPlanningAgent', () => {
  it('should decompose complex queries into steps', async () => {
    const planner = await createPlanningAgent({ llm: mockMLXClient });

    const plan = await planner.createPlan(
      'Analyze the authentication system and find security vulnerabilities',
    );

    expect(plan.steps).toHaveLength.greaterThan(1);
    expect(plan.steps[0]).toHaveProperty('action');
    expect(plan.steps[0]).toHaveProperty('reasoning');
  });

  it('should handle simple queries without decomposition', async () => {
    const planner = await createPlanningAgent({ llm: mockMLXClient });

    const plan = await planner.createPlan('What is user authentication?');

    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0].action).toContain('search');
  });
});
```

**GREEN**: Functional planning implementation

```typescript
// src/agents/planning.ts
import { z } from 'zod';
import type { PlanningConfig, Plan, PlanStep } from '../types/core.js';

const PlanStepSchema = z.object({
  action: z.string().min(1),
  tool: z.string().min(1),
  reasoning: z.string().min(1),
  dependencies: z.array(z.number()).default([]),
});

const PlanSchema = z.object({
  query: z.string().min(1),
  steps: z.array(PlanStepSchema).min(1),
  estimatedTime: z.number().min(0),
});

export const createPlanningAgent = async (config: PlanningConfig) => {
  const planningPrompt = `
You are a query planning agent. Break down complex queries into actionable steps.
Available tools: semantic_search, keyword_search, code_analysis, document_summary

Respond with JSON:
{
  "steps": [
    {
      "action": "description of what to do",
      "tool": "tool_name", 
      "reasoning": "why this step is needed",
      "dependencies": [step_indices_this_depends_on]
    }
  ]
}`;

  const createPlan = async (query: string): Promise<Plan> => {
    if (!query.trim()) {
      throw new Error('Query cannot be empty');
    }

    const response = await config.llm.generate(`${planningPrompt}\n\nQuery: ${query}`);

    try {
      const parsed = JSON.parse(response.text);
      const steps = parsed.steps.map((step: any, index: number) => ({
        ...step,
        id: index,
        status: 'pending' as const,
      }));

      return PlanSchema.parse({
        query,
        steps,
        estimatedTime: steps.length * 30, // 30 seconds per step estimate
      });
    } catch (error) {
      // Fallback for simple queries
      return {
        query,
        steps: [
          {
            id: 0,
            action: `Search for information about: ${query}`,
            tool: 'semantic_search',
            reasoning: 'Simple query requires semantic search',
            dependencies: [],
            status: 'pending' as const,
          },
        ],
        estimatedTime: 30,
      };
    }
  };

  const executePlan = async (plan: Plan): Promise<any[]> => {
    const results: any[] = [];

    for (const step of plan.steps) {
      // Check dependencies are completed
      const depsMet = step.dependencies.every((dep) => results[dep] !== undefined);

      if (!depsMet) {
        throw new Error(`Dependencies not met for step ${step.id}`);
      }

      // Execute step based on tool
      const result = await executeStep(step, results, config);
      results[step.id] = result;
    }

    return results;
  };

  return { createPlan, executePlan };
};

const executeStep = async (
  step: PlanStep,
  previousResults: any[],
  config: PlanningConfig,
): Promise<any> => {
  // Implementation would call appropriate tool based on step.tool
  // This is a simplified version
  switch (step.tool) {
    case 'semantic_search':
      return config.vectorStore?.similaritySearch(step.action, 5) || [];
    case 'keyword_search':
      return config.textSearch?.search(step.action) || [];
    default:
      throw new Error(`Unknown tool: ${step.tool}`);
  }
};
```

### TDD Cycle 2.2: Tool Coordination Functions

**RED**: Tool coordination tests

```typescript
// tests/agents/tools.test.ts
describe('createToolRegistry', () => {
  it('should register and execute semantic search tool', async () => {
    const registry = createToolRegistry();

    const semanticTool = createSemanticSearchTool({
      vectorStore: mockVectorStore,
      embeddings: mockEmbeddings,
    });

    registry.register('semantic_search', semanticTool);

    const result = await registry.execute('semantic_search', {
      query: 'authentication patterns',
      limit: 3,
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle tool execution errors gracefully', async () => {
    const registry = createToolRegistry();

    await expect(registry.execute('nonexistent_tool', {})).rejects.toThrow(
      'Tool not found: nonexistent_tool',
    );
  });
});
```

**GREEN**: Functional tool registry

```typescript
// src/agents/tools.ts
import { z } from 'zod';
import type { ToolFunction, ToolRegistry, ToolResult } from '../types/core.js';

export const createToolRegistry = (): ToolRegistry => {
  const tools = new Map<string, ToolFunction>();

  const register = (name: string, tool: ToolFunction): void => {
    if (!name.trim()) throw new Error('Tool name cannot be empty');
    tools.set(name, tool);
  };

  const execute = async (name: string, params: Record<string, any>): Promise<ToolResult> => {
    const tool = tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      return await tool(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null,
      };
    }
  };

  const list = (): string[] => Array.from(tools.keys());

  return { register, execute, list };
};

export const createSemanticSearchTool = (config: {
  vectorStore: any;
  embeddings: any;
}): ToolFunction => {
  return async (params: { query: string; limit?: number }) => {
    const ParamsSchema = z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(5),
    });

    const validated = ParamsSchema.parse(params);

    try {
      const embedding = await config.embeddings.embed(validated.query);
      const results = await config.vectorStore.similaritySearch(embedding, validated.limit);

      return {
        success: true,
        data: results,
        metadata: {
          tool: 'semantic_search',
          queryLength: validated.query.length,
          resultsCount: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        data: [],
      };
    }
  };
};

export const createKeywordSearchTool = (config: { textSearch: any }): ToolFunction => {
  return async (params: { query: string; limit?: number }) => {
    const ParamsSchema = z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(5),
    });

    const validated = ParamsSchema.parse(params);

    try {
      const results = await config.textSearch.search(validated.query, validated.limit);

      return {
        success: true,
        data: results,
        metadata: {
          tool: 'keyword_search',
          queryLength: validated.query.length,
          resultsCount: results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        data: [],
      };
    }
  };
};
```

## Phase 3: Code Analysis Functions (Week 5-6)

### TDD Cycle 3.1: AST Parser Functions

**RED**: AST parsing tests

```typescript
// tests/analysis/ast-parser.test.ts
describe('parseTypeScriptAST', () => {
  it('should extract function declarations', async () => {
    const code = `
      export const testFunction = (param: string): number => {
        return param.length;
      };
    `;

    const ast = await parseTypeScriptAST(code, 'test.ts');

    expect(ast.functions).toHaveLength(1);
    expect(ast.functions[0].name).toBe('testFunction');
    expect(ast.functions[0].params).toHaveLength(1);
  });

  it('should extract import dependencies', async () => {
    const code = `
      import { something } from './utils';
      import defaultExport from 'external-lib';
    `;

    const ast = await parseTypeScriptAST(code, 'test.ts');

    expect(ast.imports).toHaveLength(2);
    expect(ast.imports[0].source).toBe('./utils');
    expect(ast.imports[1].source).toBe('external-lib');
  });
});
```

**GREEN**: Functional AST parser

```typescript
// src/analysis/ast-parser.ts
import * as ts from 'typescript';
import { z } from 'zod';
import type { ASTParseResult, FunctionInfo, ImportInfo } from '../types/core.js';

const FunctionInfoSchema = z.object({
  name: z.string(),
  params: z.array(z.string()),
  returnType: z.string().optional(),
  isExported: z.boolean(),
  lineStart: z.number(),
  lineEnd: z.number(),
});

const ImportInfoSchema = z.object({
  source: z.string(),
  imports: z.array(z.string()),
  isDefault: z.boolean(),
  line: z.number(),
});

export const parseTypeScriptAST = async (
  code: string,
  filename: string,
): Promise<ASTParseResult> => {
  if (!code.trim()) {
    return { functions: [], imports: [], exports: [], classes: [] };
  }

  const sourceFile = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true);

  const functions: FunctionInfo[] = [];
  const imports: ImportInfo[] = [];
  const exports: string[] = [];
  const classes: string[] = [];

  const visit = (node: ts.Node): void => {
    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
        const funcDecl = node as ts.FunctionDeclaration;
        if (funcDecl.name) {
          functions.push(extractFunctionInfo(funcDecl, sourceFile));
        }
        break;

      case ts.SyntaxKind.VariableDeclaration:
        const varDecl = node as ts.VariableDeclaration;
        if (isArrowFunction(varDecl.initializer)) {
          functions.push(extractArrowFunctionInfo(varDecl, sourceFile));
        }
        break;

      case ts.SyntaxKind.ImportDeclaration:
        const importDecl = node as ts.ImportDeclaration;
        imports.push(extractImportInfo(importDecl, sourceFile));
        break;

      case ts.SyntaxKind.ClassDeclaration:
        const classDecl = node as ts.ClassDeclaration;
        if (classDecl.name) {
          classes.push(classDecl.name.text);
        }
        break;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { functions, imports, exports, classes };
};

const extractFunctionInfo = (
  node: ts.FunctionDeclaration,
  sourceFile: ts.SourceFile,
): FunctionInfo => {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return FunctionInfoSchema.parse({
    name: node.name?.text || 'anonymous',
    params: node.parameters.map((p) =>
      p.name.kind === ts.SyntaxKind.Identifier ? (p.name as ts.Identifier).text : 'destructured',
    ),
    returnType: node.type ? node.type.getText(sourceFile) : undefined,
    isExported: hasExportModifier(node),
    lineStart: start.line + 1,
    lineEnd: end.line + 1,
  });
};

const extractArrowFunctionInfo = (
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): FunctionInfo => {
  const arrowFunc = node.initializer as ts.ArrowFunction;
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return FunctionInfoSchema.parse({
    name:
      node.name.kind === ts.SyntaxKind.Identifier ? (node.name as ts.Identifier).text : 'anonymous',
    params: arrowFunc.parameters.map((p) =>
      p.name.kind === ts.SyntaxKind.Identifier ? (p.name as ts.Identifier).text : 'destructured',
    ),
    returnType: arrowFunc.type ? arrowFunc.type.getText(sourceFile) : undefined,
    isExported: isExportedVariable(node),
    lineStart: start.line + 1,
    lineEnd: end.line + 1,
  });
};

const extractImportInfo = (node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo => {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const source = (node.moduleSpecifier as ts.StringLiteral).text;

  let imports: string[] = [];
  let isDefault = false;

  if (node.importClause) {
    if (node.importClause.name) {
      imports.push(node.importClause.name.text);
      isDefault = true;
    }

    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        imports.push(...node.importClause.namedBindings.elements.map((e) => e.name.text));
      }
    }
  }

  return ImportInfoSchema.parse({
    source,
    imports,
    isDefault,
    line: position.line + 1,
  });
};

const isArrowFunction = (node: ts.Node | undefined): boolean => {
  return node?.kind === ts.SyntaxKind.ArrowFunction;
};

const hasExportModifier = (node: ts.Node): boolean => {
  return node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
};

const isExportedVariable = (node: ts.VariableDeclaration): boolean => {
  const parent = node.parent?.parent;
  return parent && hasExportModifier(parent);
};
```

## Phase 4: Session Management Functions (Week 7-8)

### TDD Cycle 4.1: Session Manager Functions

**RED**: Session management tests

```typescript
// tests/session/manager.test.ts
describe('createSessionManager', () => {
  it('should create new session with unique ID', async () => {
    const manager = createSessionManager();

    const session = await manager.createSession({
      type: 'codebase_analysis',
      config: { rootPath: '/test/project' },
    });

    expect(session.id).toMatch(/^session_/);
    expect(session.type).toBe('codebase_analysis');
    expect(session.status).toBe('active');
  });

  it('should retrieve existing session by ID', async () => {
    const manager = createSessionManager();

    const created = await manager.createSession({
      type: 'codebase_analysis',
      config: {},
    });

    const retrieved = await manager.getSession(created.id);

    expect(retrieved).toEqual(created);
  });

  it('should handle session cleanup after timeout', async () => {
    const manager = createSessionManager({ sessionTimeout: 100 });

    const session = await manager.createSession({
      type: 'codebase_analysis',
      config: {},
    });

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 150));

    const retrieved = await manager.getSession(session.id);
    expect(retrieved).toBeNull();
  });
});
```

**GREEN**: Functional session manager

```typescript
// src/session/manager.ts
import { z } from 'zod';
import type { SessionManager, SessionConfig, Session, SessionState } from '../types/core.js';

const SessionConfigSchema = z.object({
  sessionTimeout: z
    .number()
    .min(1000)
    .default(30 * 60 * 1000), // 30 minutes
  maxSessions: z.number().min(1).max(1000).default(100),
  cleanupInterval: z
    .number()
    .min(1000)
    .default(60 * 1000), // 1 minute
});

const SessionSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['active', 'completed', 'error']),
  createdAt: z.number(),
  lastActivity: z.number(),
  config: z.record(z.any()),
  state: z.record(z.any()).default({}),
});

export const createSessionManager = (config: Partial<SessionConfig> = {}): SessionManager => {
  const validatedConfig = SessionConfigSchema.parse(config);
  const sessions = new Map<string, Session>();

  // Setup cleanup interval
  const cleanupTimer = setInterval(() => {
    cleanupExpiredSessions();
  }, validatedConfig.cleanupInterval);

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const createSession = async (sessionConfig: {
    type: string;
    config: Record<string, any>;
  }): Promise<Session> => {
    // Enforce session limits
    if (sessions.size >= validatedConfig.maxSessions) {
      cleanupExpiredSessions();
      if (sessions.size >= validatedConfig.maxSessions) {
        throw new Error('Maximum number of sessions reached');
      }
    }

    const now = Date.now();
    const session: Session = SessionSchema.parse({
      id: generateSessionId(),
      type: sessionConfig.type,
      status: 'active',
      createdAt: now,
      lastActivity: now,
      config: sessionConfig.config,
      state: {},
    });

    sessions.set(session.id, session);
    return session;
  };

  const getSession = async (sessionId: string): Promise<Session | null> => {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Check if session has expired
    const now = Date.now();
    if (now - session.lastActivity > validatedConfig.sessionTimeout) {
      sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session;
  };

  const updateSession = async (
    sessionId: string,
    updates: Partial<SessionState>,
  ): Promise<Session | null> => {
    const session = await getSession(sessionId);
    if (!session) return null;

    Object.assign(session.state, updates);
    session.lastActivity = Date.now();

    return session;
  };

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    return sessions.delete(sessionId);
  };

  const listSessions = async (): Promise<Session[]> => {
    return Array.from(sessions.values());
  };

  const cleanupExpiredSessions = (): number => {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of sessions) {
      if (now - session.lastActivity > validatedConfig.sessionTimeout) {
        sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  };

  const destroy = (): void => {
    clearInterval(cleanupTimer);
    sessions.clear();
  };

  return {
    createSession,
    getSession,
    updateSession,
    deleteSession,
    listSessions,
    cleanupExpiredSessions,
    destroy,
  };
};
```

## Phase 5: Streaming & Events (Week 9-10)

### TDD Cycle 5.1: Event Streaming Functions

**RED**: Event streaming tests

```typescript
// tests/streaming/events.test.ts
describe('createEventStream', () => {
  it('should emit and receive events', async () => {
    const stream = createEventStream();
    const events: any[] = [];

    const unsubscribe = stream.subscribe('test_event', (data) => {
      events.push(data);
    });

    await stream.emit('test_event', { message: 'test' });

    expect(events).toHaveLength(1);
    expect(events[0].message).toBe('test');

    unsubscribe();
  });

  it('should handle async event processing', async () => {
    const stream = createEventStream();
    let processed = false;

    stream.subscribe('async_event', async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      processed = true;
    });

    await stream.emit('async_event', {});

    expect(processed).toBe(true);
  });

  it('should cleanup subscriptions on destroy', async () => {
    const stream = createEventStream();
    let called = false;

    stream.subscribe('test_event', () => {
      called = true;
    });
    stream.destroy();

    await stream.emit('test_event', {});

    expect(called).toBe(false);
  });
});
```

**GREEN**: Functional event streaming

```typescript
// src/streaming/events.ts
import { z } from 'zod';
import type {
  EventStream,
  EventHandler,
  StreamEvent,
  UnsubscribeFunction,
} from '../types/events.js';

const EventSchema = z.object({
  type: z.string().min(1),
  data: z.any(),
  timestamp: z.number(),
  id: z.string(),
});

export const createEventStream = (): EventStream => {
  const subscribers = new Map<string, Set<EventHandler>>();
  let isDestroyed = false;

  const generateEventId = (): string => {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const subscribe = (eventType: string, handler: EventHandler): UnsubscribeFunction => {
    if (isDestroyed) {
      throw new Error('EventStream has been destroyed');
    }

    if (!subscribers.has(eventType)) {
      subscribers.set(eventType, new Set());
    }

    subscribers.get(eventType)!.add(handler);

    return () => {
      const handlers = subscribers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          subscribers.delete(eventType);
        }
      }
    };
  };

  const emit = async (eventType: string, data: any): Promise<void> => {
    if (isDestroyed) {
      return;
    }

    const event: StreamEvent = EventSchema.parse({
      type: eventType,
      data,
      timestamp: Date.now(),
      id: generateEventId(),
    });

    const handlers = subscribers.get(eventType);
    if (!handlers) {
      return;
    }

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Event handler error for ${eventType}:`, error);
      }
    });

    await Promise.allSettled(promises);
  };

  const listEventTypes = (): string[] => {
    return Array.from(subscribers.keys());
  };

  const getSubscriberCount = (eventType: string): number => {
    return subscribers.get(eventType)?.size || 0;
  };

  const destroy = (): void => {
    isDestroyed = true;
    subscribers.clear();
  };

  return {
    subscribe,
    emit,
    listEventTypes,
    getSubscriberCount,
    destroy,
  };
};

export const createRAGEventStream = (): EventStream => {
  const baseStream = createEventStream();

  // Add RAG-specific event types and validation
  const ragEmit = async (
    eventType: 'thinking' | 'searching' | 'analyzing' | 'generating' | 'complete',
    data: any,
  ): Promise<void> => {
    const RAGEventSchema = z.object({
      stage: z.string(),
      progress: z.number().min(0).max(100).optional(),
      metadata: z.record(z.any()).optional(),
    });

    const validatedData = RAGEventSchema.parse(data);
    await baseStream.emit(eventType, validatedData);
  };

  return {
    ...baseStream,
    emit: ragEmit as any, // Type assertion for specialized emit
  };
};
```

## Phase 6: Integration & Quality Gates (Week 11-12)

### TDD Cycle 6.1: Integration Functions

**RED**: Integration tests

```typescript
// tests/integration/full-pipeline.test.ts
describe('Full RAG Pipeline Integration', () => {
  it('should process query through complete agentic pipeline', async () => {
    const mlxClient = await createMLXClient({
      modelPath: 'mlx-community/Llama-3.2-1B-Instruct-4bit',
    });

    const embeddings = await createMLXEmbeddings({
      modelPath: 'mlx-community/bge-small-en-v1.5-mlx',
    });

    const pipeline = await createRAGPipeline({
      llm: mlxClient,
      embeddings,
      vectorStore: mockVectorStore,
    });

    const planner = await createPlanningAgent({ llm: mlxClient });
    const toolRegistry = createToolRegistry();

    toolRegistry.register(
      'semantic_search',
      createSemanticSearchTool({ vectorStore: mockVectorStore, embeddings }),
    );

    const result = await executeAgenticQuery(
      'Find authentication vulnerabilities in the codebase',
      { pipeline, planner, toolRegistry },
    );

    expect(result).toBeDefined();
    expect(result.answer).toBeTruthy();
    expect(result.steps).toHaveLength.greaterThan(0);
    expect(result.sources).toBeDefined();
  });

  it('should handle errors gracefully in pipeline', async () => {
    const pipeline = await createRAGPipeline({
      llm: mockFailingMLXClient,
      embeddings: mockEmbeddings,
      vectorStore: mockVectorStore,
    });

    await expect(
      executeAgenticQuery('test query', { pipeline, planner: null, toolRegistry: null }),
    ).rejects.toThrow();
  });
});
```

**GREEN**: Integration functions

```typescript
// src/core/integration.ts
import { z } from 'zod';
import type {
  RAGPipeline,
  PlanningAgent,
  ToolRegistry,
  AgenticQueryResult,
} from '../types/core.js';

const AgenticQueryConfigSchema = z.object({
  pipeline: z.any(),
  planner: z.any(),
  toolRegistry: z.any(),
  sessionManager: z.any().optional(),
  eventStream: z.any().optional(),
});

export const executeAgenticQuery = async (
  query: string,
  config: {
    pipeline: RAGPipeline;
    planner: any;
    toolRegistry: ToolRegistry;
    sessionManager?: any;
    eventStream?: any;
  },
): Promise<AgenticQueryResult> => {
  const validatedConfig = AgenticQueryConfigSchema.parse(config);

  if (!query.trim()) {
    throw new Error('Query cannot be empty');
  }

  const startTime = Date.now();
  const steps: any[] = [];
  const sources: any[] = [];

  try {
    // Emit thinking event
    await validatedConfig.eventStream?.emit('thinking', {
      stage: 'planning',
      progress: 10,
      query,
    });

    // Create execution plan
    const plan = await validatedConfig.planner.createPlan(query);
    steps.push({ type: 'planning', data: plan });

    // Execute plan steps
    let progress = 20;
    const stepIncrement = 60 / plan.steps.length;

    for (const step of plan.steps) {
      await validatedConfig.eventStream?.emit('searching', {
        stage: step.tool,
        progress: Math.round(progress),
        step: step.action,
      });

      const result = await validatedConfig.toolRegistry.execute(step.tool, {
        query: step.action,
        limit: 5,
      });

      steps.push({ type: 'execution', step, result });

      if (result.success && result.data) {
        sources.push(...result.data);
      }

      progress += stepIncrement;
    }

    // Generate final answer
    await validatedConfig.eventStream?.emit('generating', {
      stage: 'synthesis',
      progress: 85,
      sourcesCount: sources.length,
    });

    const answer = await validatedConfig.pipeline.generate(query, sources);

    await validatedConfig.eventStream?.emit('complete', {
      stage: 'complete',
      progress: 100,
      duration: Date.now() - startTime,
    });

    return {
      query,
      answer,
      steps,
      sources,
      metadata: {
        duration: Date.now() - startTime,
        stepsExecuted: steps.length,
        sourcesFound: sources.length,
      },
    };
  } catch (error) {
    await validatedConfig.eventStream?.emit('error', {
      stage: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};

export const createFullRAGSystem = async (config: {
  mlxModelPath: string;
  embeddingModelPath: string;
  vectorStorePath: string;
}): Promise<{
  pipeline: RAGPipeline;
  planner: any;
  toolRegistry: ToolRegistry;
  sessionManager: any;
  eventStream: any;
}> => {
  // Initialize all components
  const mlxClient = await createMLXClient({
    modelPath: config.mlxModelPath,
  });

  const embeddings = await createMLXEmbeddings({
    modelPath: config.embeddingModelPath,
  });

  const pipeline = await createRAGPipeline({
    llm: mlxClient,
    embeddings,
    vectorStore: { path: config.vectorStorePath },
  });

  const planner = await createPlanningAgent({ llm: mlxClient });
  const toolRegistry = createToolRegistry();
  const sessionManager = createSessionManager();
  const eventStream = createRAGEventStream();

  // Register tools
  toolRegistry.register(
    'semantic_search',
    createSemanticSearchTool({ vectorStore: pipeline.config.vectorStore, embeddings }),
  );
  toolRegistry.register('keyword_search', createKeywordSearchTool({ textSearch: {} }));

  return {
    pipeline,
    planner,
    toolRegistry,
    sessionManager,
    eventStream,
  };
};
```

## Dependencies & Repository Analysis

### Core Dependencies

```json
{
  "dependencies": {
    "@huggingface/inference": "^2.6.4",
    "typescript": "^5.5.4",
    "zod": "^3.23.8",
    "mlx": "^0.1.0",
    "sentence-transformers": "^1.0.0",
    "vitest": "^2.0.5",
    "@types/node": "^20.14.12"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.8.0"
  }
}
```

### Repository Integration Patterns

1. **smolagents**: Multi-step reasoning, tool coordination
2. **code2prompt**: Session-based codebase processing
3. **codemapper**: AST analysis, dependency visualization
4. **git-mcp**: Repository-to-knowledge transformation
5. **Archon**: Multi-strategy retrieval, hybrid search

### MLX Requirements

- **Python Dependencies**: `mlx-lm`, `sentence-transformers`, `torch`
- **Model Storage**: Local model cache in `~/.cache/mlx/`
- **Memory Requirements**: Minimum 8GB RAM for 4-bit quantized models
- **Hardware**: Apple Silicon Mac for optimal performance

## Quality Gates & Success Metrics

### Test Coverage Requirements

- **Unit Tests**: 90%+ coverage for all functions
- **Integration Tests**: Full pipeline scenarios
- **Performance Tests**: <2s response time for simple queries
- **Error Handling**: All failure modes tested

### Code Quality Standards

- **ESLint**: Zero warnings with strict TypeScript rules
- **Zod Validation**: All inputs/outputs validated
- **Function Length**: ≤40 lines per function enforced
- **Cyclomatic Complexity**: ≤10 per function

### Performance Benchmarks

- **Query Processing**: <2s for simple, <10s for complex
- **Memory Usage**: <500MB baseline, <2GB during processing
- **Concurrent Sessions**: Support 50+ simultaneous sessions
- **MLX Model Loading**: <30s initialization time

### Security & Safety

- **Input Sanitization**: All user inputs validated
- **Resource Limits**: Memory and CPU bounds enforced
- **Error Boundaries**: Graceful degradation on failures
- **Audit Logging**: All operations logged for debugging

This TDD plan ensures industrial-grade implementation following strict functional programming principles with complete MLX integration and comprehensive testing coverage.
