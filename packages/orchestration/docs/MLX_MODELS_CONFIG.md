# MLX Models Configuration for Orchestration Package

## Overview

This document describes the orchestration-specific MLX models configuration that provides the 7 requested models for intelligent agent orchestration.

## Configured Models

### Chat Models (5 models)

1. **GLM-4.5-mlx-4Bit** (Primary)
   - **Priority**: 1 (highest)
   - **Memory**: 8.0 GB
   - **Context**: 32,768 tokens
   - **Purpose**: Primary coding, refactoring, debugging, documentation
   - **Path**: `/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--brAInwav--GLM-4.5-mlx-4Bit`

2. **Qwen2.5-VL** (Vision Support)
   - **Priority**: 2
   - **Memory**: 6.0 GB
   - **Context**: 32,768 tokens
   - **Vision**: ✅ Supported
   - **Purpose**: Multimodal tasks, vision analysis, UI debugging
   - **Path**: `${MLX_CACHE_DIR}/hub/models--mlx-community--Qwen2.5-VL-3B-Instruct-6bit`

3. **Gemma-2-2B** (Balanced)
   - **Priority**: 3
   - **Memory**: 4.0 GB
   - **Context**: 8,192 tokens
   - **Purpose**: Efficient inference, balanced performance
   - **Path**: `/Volumes/ExternalSSD/huggingface_cache/models--mlx-community--gemma-2-2b-it-4bit`

4. **SmolLM-135M** (Lightweight)
   - **Priority**: 4
   - **Memory**: 1.0 GB
   - **Context**: 2,048 tokens
   - **Purpose**: Ultra-light tasks, testing, edge devices
   - **Path**: `/Volumes/ExternalSSD/ai-cache/huggingface/hub/models--mlx-community--SmolLM-135M-Instruct-4bit`

5. **Gemma-3-270M** (Always-On/Fast)
   - **Priority**: 5
   - **Memory**: 0.5 GB
   - **Context**: 8,192 tokens
   - **Tier**: Always-on
   - **Purpose**: Ultra-fast responses, utility tasks, always available
   - **Path**: `${MLX_CACHE_DIR}/models--google--gemma-3-270m-it`

### Embedding Models (1 model)

6. **Qwen3-Embedding-4B**
   - **Dimensions**: 768
   - **Memory**: 4.0 GB
   - **Max Tokens**: 8,192
   - **Purpose**: Production embedding generation
   - **Path**: `${MLX_CACHE_DIR}/models--Qwen--Qwen3-Embedding-4B`

### Reranker Models (1 model)

7. **Qwen3-Reranker-4B**
   - **Memory**: 4.0 GB
   - **Max Pairs**: 1,000
   - **Purpose**: Production reranking, search optimization
   - **Path**: `${MLX_CACHE_DIR}/models--Qwen--Qwen3-Reranker-4B`

## Default Model Assignments

- **Primary Chat**: GLM-4.5-mlx-4Bit
- **Coding Tasks**: GLM-4.5-mlx-4Bit
- **Vision Tasks**: Qwen2.5-VL
- **Embedding**: Qwen3-Embedding-4B
- **Reranking**: Qwen3-Reranker-4B
- **Always Available**: Gemma-3-270M
- **Fast Responses**: Gemma-3-270M
- **Lightweight**: SmolLM-135M
- **Balanced**: Gemma-2-2B

## Orchestration-Specific Features

### Fallback Chain
Intelligent fallback routing in priority order:
1. GLM-4.5-mlx-4Bit (primary)
2. Gemma-2-2B (balanced fallback)
3. Gemma-3-270M (fast fallback)
4. SmolLM-135M (emergency lightweight)

### Task-Specific Routing
- `orchestration_primary`: GLM-4.5-mlx-4Bit
- `orchestration_vision`: Qwen2.5-VL
- `orchestration_balanced`: Gemma-2-2B
- `orchestration_lightweight`: SmolLM-135M
- `orchestration_fast`: Gemma-3-270M

### Model Selection Logic
The `model-catalog.ts` automatically prefers the orchestration-specific configuration when available, falling back to the global MLX configuration only if needed.

## Integration Points

### MLX Execution Tool
Updated with orchestration-specific defaults:
- `defaultEmbeddingModel`: `qwen3-embedding-4b`
- `defaultChatModel`: `glm-4.5-mlx-4bit`
- `defaultAnalysisModel`: `glm-4.5-mlx-4bit`
- `defaultVisionModel`: `qwen2.5-vl`
- `defaultLightweightModel`: `smol-lm-135m`
- `defaultFastModel`: `gemma-3-270m`

### Model Selection
Updated `selectMLXModel()` function with orchestration-optimized model routing that prioritizes GLM-4.5 for general tasks while providing specialized models for specific use cases.

## File Locations

- **Configuration**: `/packages/orchestration/mlx-models.json`
- **Model Catalog**: `/packages/orchestration/src/config/model-catalog.ts`
- **Model Selection**: `/packages/orchestration/src/lib/model-selection.ts`
- **MLX Execution Tool**: `/packages/orchestration/src/master-agent-loop/mlx-execution-tool.ts`
- **Tests**: `/packages/orchestration/src/config/__tests__/mlx-models-config.test.ts`

## Validation

All configuration is validated with comprehensive tests ensuring:
- ✅ All 7 requested models are present
- ✅ GLM-4.5-mlx-4Bit is prioritized as primary
- ✅ Vision support is properly configured
- ✅ Orchestration-specific routing works
- ✅ Fallback chains are properly ordered
- ✅ Model catalog integration functions correctly

## Usage

The orchestration package now automatically uses these models when the MLX service is available, with intelligent fallback to Ollama and then frontier models as needed.

```typescript
// Automatic model selection based on task
const registry = await loadModelRegistry();
const chatModel = registry.getDefault('chat'); // → GLM-4.5-mlx-4Bit
const visionModel = registry.getDefault('vision'); // → Qwen2.5-VL
const embeddingModel = registry.getDefault('embedding'); // → Qwen3-Embedding-4B
```