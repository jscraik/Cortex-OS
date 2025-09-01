# Dependency & Repository Analysis - Agentic RAG Enhancement

## Repository Integration Analysis

### 1. HuggingFace smolagents

**URL**: https://huggingface.co/docs/smolagents/en/examples/rag  
**Integration Priority**: HIGH - Core agentic coordination

#### Key Patterns Extracted

```typescript
// Multi-step reasoning with planning intervals
interface AgentPlan {
  steps: PlanStep[];
  reasoning: string;
  tools: string[];
}

// Tool coordination pattern
const executeWithPlanning = async (query: string): Promise<AgentResult> => {
  const plan = await createPlan(query);
  return executePlan(plan);
};
```

#### Dependencies Required

```json
{
  "@huggingface/inference": "^2.6.4",
  "@huggingface/hub": "^0.8.2"
}
```

#### Integration Points

- **Core**: Agent coordination in `src/agents/coordinator.ts`
- **Tools**: Multi-tool orchestration in `src/agents/tools.ts`
- **Planning**: Step decomposition in `src/agents/planning.ts`

---

### 2. code2prompt

**URL**: https://github.com/mufeedvh/code2prompt.git  
**Integration Priority**: MEDIUM - Session-based processing

#### Key Patterns Extracted

```typescript
// Session-based incremental processing
interface CodebaseSession {
  id: string;
  processedFiles: Set<string>;
  extractionTemplates: Map<string, Template>;
  incrementalState: Record<string, any>;
}

// Template-driven knowledge extraction
const processWithTemplate = async (
  files: string[],
  template: ExtractionTemplate,
): Promise<ExtractedKnowledge> => {
  return template.process(files);
};
```

#### Dependencies Required

```json
{
  "ignore": "^5.2.4",
  "minimatch": "^9.0.3",
  "yaml": "^2.3.2"
}
```

#### Integration Points

- **Session**: Session management in `src/session/manager.ts`
- **Templates**: Knowledge extraction in `src/session/templates.ts`
- **Processing**: Incremental analysis in `src/session/extraction.ts`

---

### 3. codemapper

**URL**: https://github.com/MikeyBeez/codemapper.git  
**Integration Priority**: MEDIUM - AST analysis capabilities

#### Key Patterns Extracted

```typescript
// AST-based structural analysis
interface RepositoryMap {
  files: Map<string, FileAnalysis>;
  dependencies: DependencyGraph;
  metrics: CodeMetrics;
}

// Mathematical dependency analysis
const calculateCouplingMetrics = (graph: DependencyGraph): CouplingMetrics => {
  return {
    afferentCoupling: calculateAfferent(graph),
    efferentCoupling: calculateEfferent(graph),
    instability: calculateInstability(graph),
  };
};
```

#### Dependencies Required

```json
{
  "typescript": "^5.5.4",
  "@typescript-eslint/parser": "^8.0.0",
  "esprima": "^4.0.1",
  "graphology": "^0.25.4"
}
```

#### Integration Points

- **Analysis**: AST parsing in `src/analysis/ast-parser.ts`
- **Dependencies**: Dependency analysis in `src/analysis/dependency.ts`
- **Metrics**: Code metrics in `src/analysis/metrics.ts`

---

### 4. git-mcp / PRP-runner (User's System)

**URL**: https://github.com/idosal/git-mcp.git  
**Integration Priority**: HIGH - Repository transformation

#### Key Patterns Extracted

```typescript
// Repository-to-knowledge-base transformation
interface RepositoryKnowledge {
  commits: CommitKnowledge[];
  files: FileKnowledge[];
  structure: ProjectStructure;
  metadata: RepositoryMetadata;
}

// Git history analysis for context
const extractCommitContext = async (repo: GitRepository): Promise<CommitContext[]> => {
  return repo.getCommits().map(extractContextFromCommit);
};
```

#### Dependencies Required

```json
{
  "simple-git": "^3.19.1",
  "gray-matter": "^4.0.3",
  "remark": "^15.0.1",
  "remark-gfm": "^4.0.0"
}
```

#### Integration Points

- **Git**: Repository processing in `src/git/processor.ts`
- **Knowledge**: Knowledge extraction in `src/git/extractor.ts`
- **History**: Commit analysis in `src/git/history.ts`

---

### 5. Archon (Advanced Retrieval)

**URL**: Archon repository analysis  
**Integration Priority**: MEDIUM - Multi-strategy retrieval

#### Key Patterns Extracted

```typescript
// Multi-strategy retrieval coordination
interface RetrievalStrategy {
  name: string;
  execute: (query: string) => Promise<Document[]>;
  confidence: (query: string) => number;
}

// Intelligent routing between strategies
const routeQuery = async (query: string, strategies: RetrievalStrategy[]): Promise<Document[]> => {
  const bestStrategy = selectStrategy(query, strategies);
  return bestStrategy.execute(query);
};
```

#### Dependencies Required

```json
{
  "faiss-node": "^0.5.1",
  "sentence-transformers": "^1.0.0",
  "elasticsearch": "^8.5.0"
}
```

#### Integration Points

- **Retrieval**: Multi-strategy retrieval in `src/retrieval/strategies.ts`
- **Routing**: Query routing in `src/retrieval/router.ts`
- **Hybrid**: Hybrid search in `src/retrieval/hybrid.ts`

## Complete Dependency Matrix

### Production Dependencies

```json
{
  "dependencies": {
    "@huggingface/inference": "^2.6.4",
    "@huggingface/hub": "^0.8.2",
    "typescript": "^5.5.4",
    "zod": "^3.23.8",
    "ignore": "^5.2.4",
    "minimatch": "^9.0.3",
    "yaml": "^2.3.2",
    "@typescript-eslint/parser": "^8.0.0",
    "esprima": "^4.0.1",
    "graphology": "^0.25.4",
    "simple-git": "^3.19.1",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.1",
    "remark-gfm": "^4.0.0",
    "faiss-node": "^0.5.1",
    "sentence-transformers": "^1.0.0"
  },
  "devDependencies": {
    "vitest": "^2.0.5",
    "@vitest/coverage-v8": "^2.0.5",
    "@types/node": "^20.14.12",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "eslint": "^9.8.0",
    "prettier": "^3.3.3"
  }
}
```

### MLX-Specific Dependencies

```json
{
  "mlxDependencies": {
    "python": ">=3.8",
    "pythonPackages": [
      "mlx>=0.19.0",
      "mlx-lm>=0.16.0",
      "sentence-transformers>=2.2.2",
      "torch>=2.0.0",
      "transformers>=4.30.0",
      "numpy>=1.24.0",
      "uvloop>=0.19.0"
    ]
  }
}
```

### System Requirements

```typescript
// System compatibility check
export const SYSTEM_REQUIREMENTS = {
  platform: 'darwin', // macOS only for MLX
  arch: ['arm64'], // Apple Silicon only
  node: '>=18.0.0',
  python: '>=3.8',
  memory: {
    minimum: 8 * 1024 * 1024 * 1024, // 8GB
    recommended: 16 * 1024 * 1024 * 1024, // 16GB
  },
  storage: {
    models: 5 * 1024 * 1024 * 1024, // 5GB for models
    cache: 2 * 1024 * 1024 * 1024, // 2GB for cache
  },
} as const;
```

## Integration Architecture

### Dependency Injection Strategy

```typescript
// src/core/dependency-injection.ts
interface RAGDependencies {
  mlxClient: MLXClient;
  embeddings: MLXEmbeddings;
  vectorStore: VectorStore;
  sessionManager: SessionManager;
  eventStream: EventStream;
  toolRegistry: ToolRegistry;
  planningAgent: PlanningAgent;
}

export const createDependencyContainer = async (config: RAGConfig): Promise<RAGDependencies> => {
  // Initialize core dependencies
  const mlxClient = await createMLXClient(config.mlx);
  const embeddings = await createMLXEmbeddings(config.embeddings);
  const vectorStore = await createVectorStore(config.vectorStore);

  // Initialize coordination layer
  const sessionManager = createSessionManager(config.session);
  const eventStream = createRAGEventStream();
  const toolRegistry = createToolRegistry();
  const planningAgent = await createPlanningAgent({ llm: mlxClient });

  // Register core tools
  toolRegistry.register('semantic_search', createSemanticSearchTool({ vectorStore, embeddings }));
  toolRegistry.register(
    'keyword_search',
    createKeywordSearchTool({ textSearch: config.textSearch }),
  );
  toolRegistry.register('code_analysis', createCodeStructureAnalyzer());
  toolRegistry.register('codebase_knowledge', createCodebaseKnowledgeTool());

  return {
    mlxClient,
    embeddings,
    vectorStore,
    sessionManager,
    eventStream,
    toolRegistry,
    planningAgent,
  };
};
```

### Configuration Management

```typescript
// src/config/rag-config.ts
export interface RAGConfig {
  mlx: {
    modelPath: string;
    embeddingModel?: string;
    pythonPath?: string;
    maxTokens?: number;
    temperature?: number;
    timeout?: number;
    retries?: number;
  };
  embeddings: {
    modelPath: string;
    maxLength?: number;
    batchSize?: number;
  };
  vectorStore: {
    path: string;
    dimensions: number;
    metric?: 'cosine' | 'euclidean' | 'dot';
  };
  session: {
    timeout?: number;
    maxSessions?: number;
    cleanupInterval?: number;
  };
  textSearch?: {
    indexPath?: string;
    analyzer?: string;
  };
  performance: {
    maxConcurrentQueries: number;
    queryTimeout: number;
    memoryThreshold: number;
  };
  security: {
    enableInputSanitization: boolean;
    maxQueryLength: number;
    rateLimiting?: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

export const DEFAULT_RAG_CONFIG: Partial<RAGConfig> = {
  mlx: {
    maxTokens: 512,
    temperature: 0.7,
    timeout: 30000,
    retries: 3,
    pythonPath: 'python3',
  },
  embeddings: {
    maxLength: 256,
    batchSize: 8,
  },
  vectorStore: {
    dimensions: 384,
    metric: 'cosine',
  },
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    maxSessions: 100,
    cleanupInterval: 60 * 1000, // 1 minute
  },
  performance: {
    maxConcurrentQueries: 10,
    queryTimeout: 60000,
    memoryThreshold: 2 * 1024 * 1024 * 1024, // 2GB
  },
  security: {
    enableInputSanitization: true,
    maxQueryLength: 1000,
  },
};
```

## Installation & Setup Scripts

### Python Environment Setup

```bash
#!/bin/bash
# scripts/setup-mlx.sh

set -e

echo "Setting up MLX environment for Apple Silicon..."

# Check system requirements
if [[ $(uname -m) != "arm64" ]]; then
    echo "Error: MLX requires Apple Silicon Mac (M1/M2/M3)"
    exit 1
fi

if [[ $(uname -s) != "Darwin" ]]; then
    echo "Error: MLX requires macOS"
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

if [[ $(echo "$PYTHON_VERSION >= $REQUIRED_VERSION" | bc) -eq 0 ]]; then
    echo "Error: Python 3.8+ required, found $PYTHON_VERSION"
    exit 1
fi

# Create virtual environment
python3 -m venv mlx-env
source mlx-env/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install MLX packages
pip install mlx>=0.19.0
pip install mlx-lm>=0.16.0
pip install sentence-transformers>=2.2.2
pip install torch>=2.0.0
pip install transformers>=4.30.0
pip install numpy>=1.24.0
pip install uvloop>=0.19.0

# Verify installation
python3 -c "import mlx.core as mx; print(f'MLX installed: {mx.__version__}')"

echo "MLX environment setup complete!"
```

### Node.js Dependencies Installation

```bash
#!/bin/bash
# scripts/install-deps.sh

set -e

echo "Installing RAG package dependencies..."

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"

if [[ $(echo "$NODE_VERSION >= $REQUIRED_NODE" | bc) -eq 0 ]]; then
    echo "Error: Node.js 18+ required, found $NODE_VERSION"
    exit 1
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@10.13.1
fi

# Install dependencies
pnpm install

# Install Python dependencies
./scripts/setup-mlx.sh

# Download default models
mkdir -p ~/.cortex-os/mlx/models

echo "Downloading default MLX models..."
python3 -c "
from huggingface_hub import snapshot_download
import os

models = [
    'mlx-community/Llama-3.2-1B-Instruct-4bit',
    'mlx-community/bge-small-en-v1.5-mlx'
]

for model in models:
    print(f'Downloading {model}...')
    snapshot_download(
        repo_id=model,
        local_dir=f'~/.cortex-os/mlx/models/{model.replace(\"/\", \"_\")}',
        local_dir_use_symlinks=False
    )
    print(f'Downloaded {model}')
"

echo "All dependencies installed successfully!"
```

### Development Environment Setup

```typescript
// scripts/dev-setup.ts
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { checkMLXSystemRequirements } from '../src/mlx/memory-manager.js';

const setupDevelopmentEnvironment = async (): Promise<void> => {
  console.log('Setting up RAG development environment...');

  // Check system requirements
  const requirements = await checkMLXSystemRequirements();
  if (!requirements.compatible) {
    console.error('System requirements not met:');
    requirements.issues.forEach((issue) => console.error(`  - ${issue}`));
    process.exit(1);
  }

  if (requirements.recommendations.length > 0) {
    console.warn('Recommendations:');
    requirements.recommendations.forEach((rec) => console.warn(`  - ${rec}`));
  }

  // Create necessary directories
  const dirs = [
    '.cortex-os/mlx/models',
    '.cortex-os/mlx/cache',
    '.cortex-os/sessions',
    '.cortex-os/vector-store',
    'test-data/fixtures',
    'test-data/mock-repos',
  ];

  dirs.forEach((dir) => {
    const fullPath = join(process.cwd(), dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });

  // Install development dependencies
  try {
    execSync('pnpm install --dev', { stdio: 'inherit' });
    console.log('Development dependencies installed');
  } catch (error) {
    console.error('Failed to install dependencies:', error);
    process.exit(1);
  }

  // Run tests to verify setup
  try {
    execSync('pnpm test:unit', { stdio: 'inherit' });
    console.log('Unit tests passed - setup verified');
  } catch (error) {
    console.warn('Some tests failed - setup may need adjustment');
  }

  console.log('Development environment setup complete!');
  console.log('Run "pnpm dev" to start development server');
};

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDevelopmentEnvironment().catch(console.error);
}
```

## Package.json Scripts

```json
{
  "scripts": {
    "setup": "tsx scripts/dev-setup.ts",
    "setup:mlx": "./scripts/setup-mlx.sh",
    "install:deps": "./scripts/install-deps.sh",

    "dev": "vitest --watch",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "vitest run tests/e2e",
    "test:performance": "vitest run tests/performance",
    "test:coverage": "vitest run --coverage",
    "test:coverage:threshold": "vitest run --coverage --coverage.thresholds.statements=90 --coverage.thresholds.branches=90 --coverage.thresholds.functions=90 --coverage.thresholds.lines=90",

    "build": "tsc --build",
    "build:watch": "tsc --build --watch",

    "lint": "eslint src tests --ext .ts --fix",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
    "typecheck": "tsc --noEmit",

    "mlx:health": "python3 -c 'import mlx.core; print(\"MLX OK\")'",
    "mlx:models": "ls -la ~/.cortex-os/mlx/models/",
    "mlx:benchmark": "tsx scripts/mlx-benchmark.ts",

    "clean": "rm -rf dist coverage .vitest-cache",
    "clean:all": "pnpm clean && rm -rf node_modules ~/.cortex-os/mlx/cache"
  }
}
```

This comprehensive dependency analysis provides complete repository integration patterns, dependency specifications, and setup scripts for industrial-grade RAG enhancement implementation.
