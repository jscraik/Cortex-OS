# MLX Integration for Memory Systems

## Overview

This document provides a comprehensive guide to integrating MLX-based embedding models into the memory systems package. MLX (Machine Learning for X) is a framework that enables efficient machine learning on Apple Silicon Macs.

## Available MLX Models

### Embedding Models

- **Qwen3-Embedding-0.6B** - Smallest and fastest embedding model
- **Qwen3-Embedding-4B** - Balanced performance and accuracy (default)
- **Qwen3-Embedding-8B** - Highest accuracy model

### Chat Models

- **Qwen3-Coder-30B-A3B-Instruct-4bit** - Large coding model
- **Qwen2.5-0.5B-Instruct-4bit** - Small chat model
- **Mixtral-8x7B-v0.1-hf-4bit-mlx** - Mixtral MoE model

### Reranking Models

- **Qwen3-Reranker-4B** - Dedicated reranking model

## Setup Instructions

### 1. Environment Configuration

Set up the required environment variables:

```bash
# Model paths (optional, defaults to External SSD locations)
export MLX_MODEL_QWEN3_0_6B_PATH="/path/to/Qwen3-Embedding-0.6B"
export MLX_MODEL_QWEN3_4B_PATH="/path/to/Qwen3-Embedding-4B"
export MLX_MODEL_QWEN3_8B_PATH="/path/to/Qwen3-Embedding-8B"
export MLX_MODELS_DIR="/path/to/huggingface_cache"

# Optional MLX service URL (for remote MLX processing)
export MLX_SERVICE_URL="http://localhost:8000"
```

### 2. Model Installation

Download the required models to your External SSD:

```bash
# Install using huggingface-cli
huggingface-cli download Qwen/Qwen3-Embedding-0.6B --cache-dir /Volumes/ExternalSSD/huggingface_cache
huggingface-cli download Qwen/Qwen3-Embedding-4B --cache-dir /Volumes/ExternalSSD/huggingface_cache
huggingface-cli download Qwen/Qwen3-Embedding-8B --cache-dir /Volumes/ExternalSSD/huggingface_cache
```

### 3. Dependencies

Install the required Python dependencies:

```bash
pip install mlx transformers torch numpy
```

## Implementation Details

### MLX Embedder

The `MLXEmbedder` class provides a robust interface for generating embeddings using MLX models:

```typescript
import { MLXEmbedder } from './adapters/embedder.mlx';

// Create embedder with default model (Qwen3-Embedding-4B)
const embedder = new MLXEmbedder();

// Create embedder with specific model
const embedder = new MLXEmbedder('qwen3-0.6b');

// Generate embeddings
const embeddings = await embedder.embed(['Hello world', 'How are you?']);
```

### Fallback Chain

The system implements a smart fallback chain:

1. **MLX Service** - If `MLX_SERVICE_URL` is set, use remote MLX service
2. **Local MLX** - Direct execution using local MLX models
3. **Ollama** - Fallback to Ollama if MLX is unavailable
4. **OpenAI** - Final fallback to OpenAI API

### Security Considerations

- Uses a dedicated Python script instead of generating code dynamically
- Environment variables for model paths
- Timeout protection for long-running operations
- Error handling and logging

## Performance Optimization

### Model Selection Strategy

- **Development/Quick Search**: Qwen3-Embedding-0.6B
- **Production/Balanced**: Qwen3-Embedding-4B
- **High Accuracy/Research**: Qwen3-Embedding-8B

### Memory Management

MLX models are loaded on-demand and cached for subsequent use. The system automatically manages memory allocation for optimal performance.

## Testing

Run the embedder tests to verify functionality:

```bash
pnpm test packages/memories/tests/embedders.spec.ts
```

## Troubleshooting

### Common Issues

1. **Model not found**: Verify model paths in environment variables
2. **Python dependencies**: Ensure all required packages are installed
3. **Permission errors**: Check file permissions on model directories
4. **Memory issues**: Consider using a smaller model for resource-constrained environments

### Performance Tuning

- Adjust batch sizes based on available memory
- Use smaller models for faster processing
- Enable MLX service for distributed processing
