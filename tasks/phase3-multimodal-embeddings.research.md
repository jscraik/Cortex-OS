# Phase 3: Multimodal AI & Hybrid Search - Research

**Date**: 2025-01-04  
**Phase**: 3.1 Multimodal Embedding Service  
**Status**: Research Complete

---

## Executive Summary

Phase 3.1 focuses on extending the existing text-only embedding infrastructure to support multimodal content (images, audio, video) using MLX CLIP models. The current implementation already has a solid foundation with MLX embedding generation, FastAPI endpoints, and A2A event communication.

## Current State Analysis

### ✅ **Existing Infrastructure**

1. **MLX Embedding System** (`apps/cortex-py/src/mlx/embedding_generator.py`)
   - Mature text embedding support with Qwen3 models (0.6B, 4B, 8B)
   - Hybrid backend: MLX (Darwin) + sentence-transformers fallback
   - Fast test mode for CI/development
   - Output dimensions: 1536 (all models)
   - Context length: 8192 tokens

2. **REST API** (`apps/cortex-py/src/app.py`)
   - `/embed` - Single text embedding
   - `/embeddings` - Batch text embeddings
   - `/health` - Health checks with brAInwav branding
   - `/models` - Model listing
   - A2A event emission on embedding completion

3. **Memory Storage** (`packages/memories/`)
   - PostgreSQL via Prisma
   - Vector storage (Float[] type)
   - No multimodal support yet (no `modality` field or `content` blob field)
   - Hybrid search infrastructure removed (legacy code)

4. **Dependencies** (Python)
   - MLX ecosystem: `mlx>=0.29.0`, `mlx-lm>=0.27.0`, `mlx-vlm>=0.3.0` (Darwin only)
   - Vision/language: `transformers>=4.55.4`, `torch>=2.8.0`
   - Embeddings: `sentence-transformers>=3.3.0`
   - API: `fastapi>=0.116.1`, `uvicorn>=0.35.0`

### ⚠️ **Gaps Identified**

1. **No CLIP Integration**
   - `mlx-vlm` is installed but not used
   - No image/audio embedding generation code
   - No multimodal model configurations

2. **Memory Schema Limitations**
   - Missing `modality` enum field (TEXT, IMAGE, AUDIO, VIDEO)
   - Missing `content` blob field for binary data storage
   - No file type validation or size limits

3. **API Endpoints Missing**
   - No `/embed/multimodal` endpoint
   - No multimodal validation middleware
   - No modality-specific error handling

4. **Testing Gaps**
   - No multimodal embedding tests
   - No file upload/validation tests
   - No edge case coverage (corrupt files, size limits)

---

## Architecture Decisions

### 1. **Modality Support**

Following CODESTYLE.md and the TDD plan, we'll support:
- **TEXT**: Existing Qwen3 embeddings (1536 dims)
- **IMAGE**: CLIP vision embeddings (512 dims)
- **AUDIO**: Audio spectrogram → CLIP or Whisper embeddings (512 dims)
- **VIDEO**: Frame sampling → CLIP embeddings (512 dims)

### 2. **File Type Validation**

Implement guard clauses per CODESTYLE.md:
```python
# Supported formats
IMAGE_FORMATS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'}
AUDIO_FORMATS = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'}
VIDEO_FORMATS = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}

# Size limits (brAInwav standards)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024 # 100MB
MAX_TEXT_SIZE = 1 * 1024 * 1024    # 1MB
```

### 3. **CLIP Model Selection**

Use Hugging Face CLIP models compatible with MLX:
- **openai/clip-vit-base-patch32**: 512-dim embeddings, balanced speed/quality
- **openai/clip-vit-large-patch14**: 768-dim embeddings, higher quality
- Fallback to PyTorch CLIP if MLX unavailable

### 4. **Memory Schema Extension**

Prisma schema changes:
```prisma
enum Modality {
  TEXT
  IMAGE
  AUDIO
  VIDEO
}

model Memory {
  // ... existing fields ...
  modality       Modality @default(TEXT)
  content        Bytes?   // Binary data storage
  contentType    String?  // MIME type
  contentSize    Int?     // Size in bytes
}
```

### 5. **API Design**

New endpoint following functional patterns (CODESTYLE.md):
```python
@app.post("/embed/multimodal")
async def embed_multimodal(
    file: UploadFile,
    modality: str,
    normalize: bool = True
):
    # Guard clauses for validation
    # Multimodal embedding generation
    # A2A event emission with brAInwav branding
```

---

## Implementation Strategy

### Phase 3.1.1: Schema & Types (TDD)
1. **Red**: Write failing Prisma migration test
2. **Green**: Add `modality`, `content`, `contentType`, `contentSize` to schema
3. **Refactor**: Update TypeScript contracts

### Phase 3.1.2: File Validation (TDD)
1. **Red**: Write tests for unsupported formats, size limits
2. **Green**: Implement validation functions with guard clauses
3. **Refactor**: Extract to `src/multimodal/validation.py`

### Phase 3.1.3: CLIP Integration (TDD)
1. **Red**: Write image embedding test (expected 512-dim vector)
2. **Green**: Implement CLIP model loading and inference
3. **Refactor**: Add to `src/mlx/clip_embedder.py`

### Phase 3.1.4: Multimodal Endpoint (TDD)
1. **Red**: Write API integration test with mock image
2. **Green**: Implement `/embed/multimodal` with validation
3. **Refactor**: Add brAInwav branding, A2A events

### Phase 3.1.5: Audio/Video Support (TDD)
1. **Red**: Write audio/video embedding tests
2. **Green**: Implement frame extraction and audio processing
3. **Refactor**: Unify multimodal embedding interface

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CLIP model download size (>1GB) | CI/dev setup delays | Add fast test mode with mock embeddings |
| PyTorch dependency conflicts | Build failures | Pin versions in `pyproject.toml` |
| Memory usage spikes (large files) | Service crashes | Streaming file processing + memory limits |
| Prisma migration on production DB | Downtime | Use `modality` default value (TEXT) for backward compat |

---

## Dependencies

### Before Starting Phase 3.1:
- ✅ Phase 1.3 complete (Memory adapter migration)
- ✅ Python environment ready (`uv sync`)
- ✅ PostgreSQL running (for Prisma migrations)

### External Libraries Needed:
- Existing: `mlx-vlm`, `transformers`, `torch`
- New: `Pillow` (image processing), `librosa` (audio processing)

---

## Success Criteria

### Phase 3.1 Complete When:
- ✅ Prisma schema extended with `Modality` enum
- ✅ `/embed/multimodal` endpoint accepts images/audio/video
- ✅ CLIP embeddings generated for all modalities
- ✅ File validation rejects invalid formats/sizes
- ✅ 95% test coverage on multimodal code paths
- ✅ brAInwav branding in all error messages and events
- ✅ A2A events emit multimodal embedding metadata
- ✅ Memory storage handles binary content

### Performance Targets:
- Image embedding: P95 < 100ms
- Audio embedding: P95 < 200ms
- Video frame extraction: P95 < 500ms
- Memory usage: < 2GB under load

---

## Next Steps

1. **Start Phase 3.1.1**: Update Prisma schema (RED → GREEN → REFACTOR)
2. **Update Todo List**: Mark research complete, start implementation
3. **Create Test Files**: Set up test structure before implementation

---

## References

- [TDD Plan Phase 3](/tasks/cortex-os-&-cortex-py-tdd-plan.md#phase-3-multimodal-ai--hybrid-search-week-5)
- [CODESTYLE.md](/CODESTYLE.md) - Function patterns, naming, error handling
- [MLX VLM Docs](https://github.com/ml-explore/mlx-vlm)
- [OpenAI CLIP Models](https://github.com/openai/CLIP)
- [Memory Types Contract](/packages/memories/src/domain/types.ts)
