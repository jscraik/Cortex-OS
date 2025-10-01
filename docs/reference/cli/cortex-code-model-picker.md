# Cortex Code Model Picker - 4 Coding Models Priority System

## Overview

The Cortex Code Model Picker has been optimized for a coding AI CLI with a priority-based selection system focusing on 4 key MLX models, followed by Ollama and cloud API fallbacks.

## Priority Model Selection

### Tier 1: MLX Models (Local, Fast, Free)

1. **GLM-4.5-mlx-4Bit** - Primary general coding model
   - Memory: 8GB
   - Quality: 0.92, Speed: 0.88
   - Tasks: Coding, Reasoning, Chat, Multimodal
   - Status: ⚠️ Available (HuggingFace cache)

2. **qwen3-coder-7b-mlx** - Specialized coding model
   - Memory: 8GB  
   - Quality: 0.85, Speed: 0.95
   - Tasks: Coding, Quick fixes
   - Status: ❌ Not installed

3. **Qwen3-Coder-30B-A3B-Instruct-4bit** - Large coding model
   - Memory: 17GB
   - Quality: 0.94, Speed: 0.75
   - Tasks: Coding, Complex reasoning
   - Status: ✅ Working

4. **gpt-oss-20b-8bit-mlx** - Advanced coding model
   - Memory: 24GB
   - Quality: 0.90, Speed: 0.70
   - Tasks: Coding, Advanced reasoning
   - Status: ⚠️ Available (as gpt-oss-20b-MLX-8bit)

### Tier 2: Ollama Models (Local, Good Balance)

- **deepseek-coder:6.7b** - Status: ✅ Working
- **gpt-oss:20b** - Status: ✅ Working

### Tier 3: Cloud APIs (High Quality, Expensive)

- **gpt-4o-mini** (GitHub Models)
- **gpt-4o** (OpenAI)
- **claude-3-haiku** (Anthropic)

## Model Selection Logic

```rust
// Priority-based selection for coding CLI
1. Try MLX models in priority order (1-4)
2. Check model availability on disk
3. Fallback to Ollama if MLX unavailable
4. Final fallback to cloud APIs if allowed
```

## Selection Criteria Presets

### Coding Tasks (Default)

```rust
ModelPicker::create_coding_criteria()
- task_type: Coding
- max_memory_gb: 32.0
- prefer_speed: true
- prefer_quality: true  
- allow_cloud: false
```

### Quick Tasks

```rust  
ModelPicker::create_quick_criteria()
- task_type: Quick
- max_memory_gb: 8.0
- prefer_speed: true
- prefer_quality: false
- allow_cloud: false
```

### With Cloud Fallback

```rust
ModelPicker::create_coding_criteria_with_cloud()
- Same as coding criteria but allow_cloud: true
```

## Available Commands

```bash
/models         # List available models
/model <name>   # Switch to specific model
/autopick <on|off>  # Toggle automatic model selection
/verify         # Check all model availability
/check <model>  # Check specific model
/working        # List only working models
```

## Current Status Summary

**Working Models (3/4 priority MLX models):**

- ✅ Qwen3-Coder-30B-A3B-Instruct-4bit
- ⚠️ GLM-4.5-mlx-4Bit (accessible)
- ⚠️ gpt-oss-20b-MLX-8bit (accessible)

**Missing Models:**

- ❌ qwen3-coder-7b-mlx

**Ollama Fallbacks:**

- ✅ All 7 Ollama models working (including deepseek-coder:6.7b, gpt-oss:20b)

## Usage

The model picker automatically selects the best available model:

```bash
# Auto-selection based on prompt length
./cortex-code
cortex> implement a binary search function
# → Automatically selects best available MLX coding model

# Manual model selection  
cortex> /model GLM-4.5-mlx-4Bit
cortex> /autopick on
```

## Architecture Benefits

1. **Local-First**: Prioritizes fast, free MLX models
2. **Coding-Optimized**: Focused on 4 best coding models
3. **Fallback Safety**: Graceful degradation to Ollama then cloud
4. **Performance**: Smart selection based on task complexity
5. **Verification**: Real-time model availability checking

## File Structure

- `model_picker.rs` - Core selection logic
- `model_verification.rs` - Model health checking
- `coding-models-inventory.json` - Priority model definitions
- `external-ssd-model-inventory.json` - Full model catalog
- `providers/local.rs` - MLX provider with 4 priority models
- `app.rs` - Integration with auto-selection

The system ensures optimal model selection for coding tasks while maintaining fast, local inference as the primary goal.
