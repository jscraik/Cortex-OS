# Enhanced RAG with MLX-First Multi-Model Support

This enhanced RAG package provides state-of-the-art retrieval-augmented generation capabilities with **MLX-first, Ollama-fallback** architecture for optimal performance and reliability.

## 🌟 Key Features

### MLX-First Architecture

- **Primary**: MLX models for maximum performance on Apple Silicon
- **Fallback**: Ollama models for reliability and compatibility
- **Automatic**: Seamless failover when MLX models are unavailable

### Advanced Components

- **🔤 Qwen3 Embeddings**: Multi-size support (0.6B, 4B, 8B) with quality/speed tradeoffs
- **🎯 Qwen3 Reranking**: Improved relevance scoring beyond cosine similarity
- **🧠 Multi-Model Generation**: Intelligent model selection and fallback chains
- **⚡ Performance Monitoring**: Token usage, timing, and provider tracking

## 🚀 Quick Start

```typescript
import { createProductionRAGPipeline, type Document } from '@cortex/rag';

// Create MLX-first pipeline
const pipeline = createProductionRAGPipeline();

// Sample documents
const documents: Document[] = [
  {
    id: 'doc1',
    content: 'Your document content here...',
    metadata: { source: 'example', category: 'tech' },
  },
];

// Query with automatic MLX-first processing
const result = await pipeline.query('What is the main topic discussed?', documents);

console.log(`Answer: ${result.answer}`);
console.log(`Provider: ${result.provider}`); // 'mlx' or 'ollama'
console.log(`Processing time: ${result.processingTimeMs}ms`);
```

## 🎛️ Configuration Options

### Pre-built Configurations

```typescript
import {
  createFastRAGPipeline, // Speed optimized
  createProductionRAGPipeline, // Balanced performance
  createHighQualityRAGPipeline, // Quality optimized
} from '@cortex/rag';

// Speed: 0.6B embeddings, fewer models, no reranking
const fastPipeline = createFastRAGPipeline();

// Production: 4B embeddings, full model set, reranking enabled
const prodPipeline = createProductionRAGPipeline();

// Quality: 8B embeddings, extended reranking
const qualityPipeline = createHighQualityRAGPipeline();
```

### Custom Configuration

```typescript
import { EnhancedRAGPipeline } from '@cortex/rag';

const customPipeline = new EnhancedRAGPipeline({
  embeddingModelSize: '4B', // '0.6B' | '4B' | '8B'
  generationModels: [
    // MLX models (automatically get +100 priority)
    {
      model: '/path/to/mlx/qwen2.5-coder-32b-instruct-q4',
      backend: 'mlx',
      name: 'Qwen2.5 Coder 32B',
      priority: 10,
    },
    // Ollama fallbacks
    {
      model: 'qwen3-coder:30b',
      backend: 'ollama',
      name: 'Qwen3 Coder 30B',
      priority: 5,
    },
  ],
  topK: 10,
  rerank: { enabled: true, topK: 5 },
});
```

## 🔄 Model Priority System

The enhanced pipeline automatically prioritizes models:

1. **MLX models**: Get +100 priority bonus (primary)
2. **Priority value**: Higher numbers = higher priority
3. **Automatic fallback**: On MLX failure, tries Ollama models
4. **Order preservation**: Within same backend, respects explicit priority

```typescript
// View current model priority order
const priority = pipeline.getModelPriority();
priority.forEach((model, index) => {
  console.log(`${index + 1}. ${model.backend}: ${model.model} (${model.priority})`);
});
```

## 📊 Available Models

### MLX Models (Your External SSD)

- **Qwen2.5 Coder 32B**: `/Volumes/SSD500/Models/MLX/qwen2.5-coder-32b-instruct-q4`
- **Qwen2.5 72B**: `/Volumes/SSD500/Models/MLX/qwen2.5-72b-instruct-q4`
- **GLM-4.5 9B**: `/Volumes/SSD500/Models/MLX/glm-4.5-9b-chat-1m-q4`
- **Phi-3.5 Mini**: `/Volumes/SSD500/Models/MLX/phi-3.5-mini-instruct-q4`

### Ollama Fallback Models

- **qwen3-coder:30b**: Reliable coding model
- **phi4-mini-reasoning**: Reasoning and analysis
- **gemma3n**: General purpose queries
- **deepseek-coder**: Code review and analysis

### Embedding Models

- **Qwen3-Embedding-0.6B**: Fast, lightweight (good for development)
- **Qwen3-Embedding-4B**: Balanced performance (recommended)
- **Qwen3-Embedding-8B**: Highest quality (production)

## ⚙️ Pipeline Components

### 1. Embeddings (Qwen3)

```typescript
// Automatic model size selection
const embedder = new Qwen3Embedder({
  modelSize: '4B', // Quality/speed balance
  useGPU: true, // MLX acceleration
});

const embeddings = await embedder.embed(['text1', 'text2']);
```

### 2. Reranking (Qwen3-4B)

```typescript
// Improve relevance beyond cosine similarity
const reranker = new Qwen3Reranker();
const reranked = await reranker.rerank(query, documents, 5);
```

### 3. Generation

```typescript
// Single model configuration
const generator = new MultiModelGenerator({
  model: {
    model: '/Volumes/SSD500/Models/MLX/qwen2.5-coder-32b-instruct-q4',
    backend: 'mlx',
  },
  timeout: 30000,
});

const response = await generator.generate(prompt);
console.log(response.provider); // 'mlx'
```

## 🔧 Advanced Usage

### Streaming and Background Processing

```typescript
// For long-running queries
const result = await pipeline.query(query, documents, {
  contextPrompt: 'Custom system prompt...',
  maxContextLength: 4000, // Longer context for complex queries
});
```

### Error Handling and Fallbacks

```typescript
try {
  const result = await pipeline.query(query, documents);
} catch (error) {
  if (error.message.includes('All models failed')) {
    // Handle complete model failure
    console.log('All generation models are unavailable');
  }
}
```

### Performance Monitoring

```typescript
const result = await pipeline.query(query, documents);

// Comprehensive performance metrics
console.log({
  provider: result.provider, // Which backend was used
  processingTime: result.processingTimeMs, // Total pipeline time
  retrievedDocs: result.retrievedCount, // Initial retrieval count
  rerankedDocs: result.rerankedCount, // Post-reranking count
  tokenUsage: result.usage, // Prompt/completion tokens
});
```

## 🔍 Examples

### 1. Technical Documentation Q&A

```typescript
const techPipeline = createProductionRAGPipeline();

const docs = [
  { id: '1', content: 'TypeScript documentation...', metadata: { type: 'docs' } },
  { id: '2', content: 'API reference...', metadata: { type: 'api' } },
];

const result = await techPipeline.query('How do I configure TypeScript for React?', docs, {
  contextPrompt: 'You are a senior developer assistant.',
});
```

### 2. Research Paper Analysis

```typescript
const researchPipeline = createHighQualityRAGPipeline(); // Best quality

const papers = [
  { id: '1', content: 'RAG paper abstract and content...' },
  { id: '2', content: 'Transformer architecture paper...' },
];

const analysis = await researchPipeline.query(
  'Compare the approaches to attention mechanisms',
  papers,
);
```

### 3. Code Analysis

```typescript
const codePipeline = new EnhancedRAGPipeline({
  embeddingModelSize: '4B',
  generationModels: [
    // Prioritize coding models
    {
      model: '/Volumes/SSD500/Models/MLX/qwen2.5-coder-32b-instruct-q4',
      backend: 'mlx',
      priority: 10,
    },
    { model: 'qwen3-coder:30b', backend: 'ollama', priority: 5 },
  ],
  topK: 15, // More code context
  rerank: { enabled: true, topK: 8 },
});
```

## 🎯 Performance Tips

1. **Model Selection**: Use appropriate embedding size for your use case
   - Development: 0.6B (fast)
   - Production: 4B (balanced)
   - Research: 8B (highest quality)

2. **Document Chunking**: Optimize chunk size for your content
   - Technical docs: 512-1024 tokens
   - Research papers: 1024-2048 tokens
   - Code: 256-512 tokens

3. **Reranking**: Enable for better relevance, disable for speed
   - Enable: High-stakes queries, research, analysis
   - Disable: Real-time chat, simple lookups

4. **Context Length**: Balance information vs. token usage
   - Short context: 1000-2000 chars (fast)
   - Long context: 4000+ chars (comprehensive)

## 🛠️ Development

Run the example:

```bash
cd packages/rag
npm run example:enhanced-rag
```

Build and test:

```bash
pnpm build
pnpm test
```

## 📈 Roadmap

- [ ] **Streaming Support**: Real-time response generation
- [ ] **Caching Layer**: Embedding and response caching
- [ ] **Batch Processing**: Efficient multi-query handling
- [ ] **Model Auto-Discovery**: Automatic MLX/Ollama model detection
- [ ] **Fine-tuning Integration**: Custom model training workflows
- [ ] **Metrics Dashboard**: Performance monitoring UI

---

Built with ❤️ for the Cortex-OS ecosystem. MLX-first architecture ensures optimal performance on Apple Silicon while maintaining reliability through Ollama fallbacks.
