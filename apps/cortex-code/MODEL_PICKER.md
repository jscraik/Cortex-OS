# Model Picker for Cortex-Code

## Overview

The Model Picker is an intelligent model selection system that automatically chooses the best model for each task based on:

1. **Task Type Analysis** - Automatically infers the task type from prompts
2. **Provider Priority** - MLX first, then Ollama, then cloud APIs  
3. **Resource Constraints** - Memory and performance requirements
4. **Quality vs Speed Trade-offs** - Balances based on task complexity

## Features

### Automatic Task Type Detection

The system automatically detects task types from prompts:

- **Coding**: Keywords like "code", "function", "debug", "refactor", "implement", "fix"
- **Embedding**: Keywords like "similar", "embed", "vector", "search"
- **Reasoning**: Keywords like "analyze", "explain", "reason", "think", "complex", "problem"
- **Quick**: Short prompts (<50 chars) or keywords like "quick", "simple"
- **Chat**: Default for conversational prompts
- **Multimodal**: Image processing tasks
- **Reranking**: Document ranking and search relevance

### Provider Priority System

1. **MLX Models** (Highest Priority)
   - Fastest inference on Apple Silicon
   - No cost (local execution)
   - Uses external SSD inventory: `/Volumes/ExternalSSD/ai-models/local-models/`
   - 14 available models from 2GB to 24GB RAM

2. **Ollama Models** (Medium Priority)
   - Good balance of speed and quality
   - No cost (local execution)
   - 7 models available including DeepSeek Coder, GPT-OSS

3. **Cloud APIs** (Fallback)
   - Highest quality but with cost
   - GitHub Models (free tier), OpenAI, Anthropic
   - Only used when local models unavailable or insufficient

### Available Models

#### MLX Models (External SSD)

- `qwen3-coder-7b-mlx` - 8GB RAM, optimized for coding
- `qwen3-embedding-4b-mlx` - 4GB RAM, for embeddings
- `Phi-3-mini-4k-instruct-4bit` - 2GB RAM, quick tasks
- `Qwen2.5-7B-Instruct-4bit-mlx` - 7GB RAM, general purpose
- `gpt-oss-20b-8bit-mlx` - 24GB RAM, high-quality reasoning

#### Ollama Models

- `deepseek-coder:6.7b` - 7GB RAM, coding specialist
- `gpt-oss:20b` - 20GB RAM, high-quality general model
- `granite-embedding:278m` - 562MB, lightweight embeddings

#### Cloud Models

- `gpt-4o` - Multimodal, highest quality
- `gpt-4o-mini` - Fast, cost-effective
- `claude-3-sonnet` - Long context, excellent reasoning

## Usage

### Command Line Interface

#### Enable Auto-Selection

```bash
# Enable automatic model selection
./cortex-code code
cortex> /autopick on

# Disable automatic model selection
cortex> /autopick off

# Check current status
cortex> /autopick
```

#### List Available Models

```bash
cortex> /models
Available models:
  qwen3-coder-7b-mlx (mlx) - Tasks: Coding, Chat, Reasoning
  deepseek-coder:6.7b (ollama) - Tasks: Coding, Reasoning
  gpt-4o (github) - Tasks: Reasoning, Multimodal, Coding, Chat
```

#### Get Model Information

```bash
cortex> /model qwen3-coder-7b-mlx
Model: qwen3-coder-7b-mlx (mlx)
  Memory: 8.0 GB
  Context: 32768 tokens
  Quality: 0.85
  Speed: 0.90
  Tasks: Coding, Chat, Reasoning
```

### Environment Variables

```bash
# Enable/disable auto-selection
export CORTEX_AUTOPICK=true

# Override specific model
export CORTEX_MODEL=qwen3-coder-7b-mlx

# Set model paths
export MLX_MODEL_PATH=/Volumes/ExternalSSD/ai-models/local-models
```

### Programmatic Usage

```rust
use cortex_code::model_picker::{ModelPicker, SelectionCriteria, TaskType};

// Create model picker
let picker = ModelPicker::new(config)?;

// Define selection criteria
let criteria = SelectionCriteria {
    task_type: TaskType::Coding,
    max_memory_gb: Some(8.0),
    prefer_speed: true,
    prefer_quality: false,
    allow_cloud: true,
};

// Select best model
let selected = picker.select_best_model(criteria)?;
println!("Selected: {} ({})", selected.name, selected.selection_reason);
```

## Selection Algorithm

### Task-Based Selection

1. **Coding Tasks**
   - Prefers: `qwen3-coder-7b-mlx`, `deepseek-coder:6.7b`
   - Fallback: `gpt-4o-mini`, `gpt-4o`

2. **Embedding Tasks**
   - Prefers: `qwen3-embedding-4b-mlx`, `granite-embedding:278m`
   - Optimized for vector similarity

3. **Reasoning Tasks**
   - Prefers: `gpt-oss:20b`, `qwen3-coder-7b-mlx`
   - Fallback: `claude-3-sonnet`, `gpt-4o`

4. **Quick Tasks**
   - Prefers: `Phi-3-mini-4k-instruct-4bit`
   - Optimized for speed over quality

### Scoring System

Models are scored based on:

- **Quality Score** (40% weight): Model capability rating
- **Speed Score** (20-40% weight): Inference speed rating
- **Cost Score** (30% weight): Inverted cost (lower cost = higher score)
- **Memory Efficiency** (10% bonus): Bonus for models under 8GB

### Selection Examples

#### Coding Request

```
Prompt: "Write a function to sort an array"
→ Task Type: Coding
→ Selected: qwen3-coder-7b-mlx (MLX provider)
→ Reason: Fast coding specialist, 8GB RAM, local execution
```

#### Quick Question

```
Prompt: "Hi"
→ Task Type: Quick
→ Selected: Phi-3-mini-4k-instruct-4bit (MLX provider)
→ Reason: Fastest model, minimal resources, perfect for quick tasks
```

#### Complex Analysis

```
Prompt: "Analyze this complex architectural pattern..."
→ Task Type: Reasoning
→ Selected: gpt-oss:20b (Ollama provider)
→ Reason: High-quality reasoning model, acceptable speed for complex tasks
```

## Configuration

### External Model Inventory

The system loads models from `/Users/jamiecraik/.Cortex-OS/data/external-ssd-model-inventory.json`:

```json
{
  "mlx": [
    {
      "name": "qwen3-coder-7b-mlx",
      "path": "/Volumes/ExternalSSD/ai-models/local-models/qwen3-coder-7b-mlx",
      "ram_gb": 8.0,
      "repo": "mlx-community/qwen3-coder-7b-mlx"
    }
  ],
  "ollama": [
    {
      "name": "deepseek-coder",
      "tag": "6.7b",
      "manifest_path": "/Volumes/ExternalSSD/ai-models/ollama/...",
      "size_bytes": 7000000000
    }
  ]
}
```

### Provider Configuration

Cloud providers are configured in `cortex.json`:

```json
{
  "providers": {
    "default": "github",
    "fallback": ["openai", "anthropic", "mlx"],
    "config": {
      "mlx": {
        "models": ["qwen3-coder-7b-mlx", "qwen3-embedding-4b-mlx"],
        "free_tier": true,
        "requires_key": false,
        "provider_type": "local"
      }
    }
  }
}
```

## Troubleshooting

### Model Not Found

```bash
# Check available models
cortex> /models

# Verify external inventory
ls -la /Users/jamiecraik/.Cortex-OS/data/external-ssd-model-inventory.json

# Check external SSD models
ls -la /Volumes/ExternalSSD/ai-models/local-models/
```

### MLX Models Not Loading

```bash
# Check MLX installation
python -c "import mlx_lm; print('MLX available')"

# Verify model path
ls -la /Volumes/ExternalSSD/ai-models/local-models/qwen3-coder-7b-mlx/
```

### Ollama Models Not Working

```bash
# Check Ollama service
ollama list

# Check manifest files
ls -la /Volumes/ExternalSSD/ai-models/ollama/models/manifests/
```

## Performance Considerations

### Memory Requirements

- **2GB**: `Phi-3-mini-4k-instruct-4bit` - Quick tasks
- **4GB**: `qwen3-embedding-4b-mlx` - Embeddings
- **8GB**: `qwen3-coder-7b-mlx` - Coding tasks
- **20GB**: `gpt-oss:20b` - Complex reasoning

### Speed Benchmarks

- **MLX Models**: ~100-200 tokens/second (Apple Silicon optimized)
- **Ollama Models**: ~50-100 tokens/second (Good CPU performance)
- **Cloud APIs**: ~20-50 tokens/second (Network dependent)

### Cost Optimization

1. Local models (MLX/Ollama) are always free
2. Cloud models used only as fallback
3. `gpt-4o-mini` preferred over `gpt-4o` for cost
4. Auto-selection minimizes expensive model usage

## Future Enhancements

- **Fine-tuning Integration**: Custom model support
- **Performance Learning**: Adaptive selection based on usage patterns
- **Resource Monitoring**: Dynamic memory and CPU optimization
- **Model Caching**: Intelligent model preloading
- **Quality Feedback**: User preference learning
