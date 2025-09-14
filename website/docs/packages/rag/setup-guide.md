---
title: Setup Guide
sidebar_label: Setup Guide
---

# RAG Package Enhancement Setup Guide

## Overview

This document provides setup instructions and dependency information for the enhanced Cortex-OS RAG package. Follow these steps to configure your development environment for implementing the planned enhancements.

## System Requirements

### Core Requirements

- Node.js 18+ (22+ recommended)
- Python 3.8+ (3.11+ recommended)
- Git
- Sufficient storage for model caching (minimum 10GB free space)

### Optional Requirements

- Docker (for containerized services)
- Graph database (Memgraph or Neo4j) for knowledge graphs
- OCR service (Tesseract or Google Vision)
- Speech-to-text service (Whisper or Google Speech)

## Node.js Dependencies

### Installation

```bash
# Navigate to the RAG package directory
cd packages/rag

# Install Node.js dependencies
pnpm install
```

### Core Dependencies

```json
{
  "dependencies": {
    "@cortex-os/contracts": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

## Python Dependencies

### Installation

```bash
# Navigate to the RAG package directory
cd packages/rag

# Create virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install core Python dependencies
pip install torch transformers numpy
```

### Core Python Dependencies

```txt
```
# Core ML dependencies
torch&gt;=2.0.0
transformers&gt;=4.30.0
numpy&gt;=1.21.0

# MLX dependencies (Apple Silicon only)
mlx&gt;=0.0.10
mlx-lm&gt;=0.1.0

# Document processing dependencies
pdfplumber&gt;=0.9.0
python-docx&gt;=0.8.11
python-pptx&gt;=0.6.21
openpyxl&gt;=3.1.0
beautifulsoup4&gt;=4.12.0
lxml&gt;=4.9.0

# OCR dependencies
pytesseract&gt;=0.3.10
Pillow&gt;=9.0.0

# Audio processing dependencies
openai-whisper&gt;=20231106
pydub&gt;=0.25.1

# Web crawling dependencies
requests&gt;=2.31.0
selenium&gt;=4.15.0
playwright&gt;=1.40.0

# Code analysis dependencies
tree-sitter&gt;=0.20.0
tree-sitter-languages&gt;=1.8.0

# Graph database dependencies
neo4j&gt;=5.14.0
```

### Installing Optional Dependencies

```bash
# Install MLX dependencies (Apple Silicon only)
pip install mlx mlx-lm

# Install OCR dependencies
pip install pytesseract Pillow

# Install audio processing dependencies
pip install openai-whisper pydub

# Install web crawling dependencies
pip install requests selenium playwright
playwright install-deps

# Install code analysis dependencies
pip install tree-sitter tree-sitter-languages

# Install graph database dependencies
pip install neo4j
```

## External Services Configuration

### Hugging Face

1. Create an account at https://huggingface.co
2. Generate an access token at https://huggingface.co/settings/tokens
3. Set environment variable:

```bash
export HUGGINGFACE_TOKEN=your_token_here
```

### YouTube API (for video processing)

1. Create a Google Cloud Project
2. Enable YouTube Data API v3
3. Create API credentials
4. Set environment variable:

```bash
export YOUTUBE_API_KEY=your_api_key_here
```

### OCR Services

#### Tesseract (Local OCR)

```bash
# macOS
brew install tesseract

# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

#### Google Vision (Cloud OCR)

1. Create Google Cloud Project
2. Enable Vision API
3. Create service account and download credentials
4. Set environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
export OCR_PROVIDER=google_vision
```

### Speech-to-Text Services

#### Whisper (Local Transcription)

```bash
# Installed with audio processing dependencies
# Models will be downloaded automatically on first use
```

#### Google Speech (Cloud Transcription)

1. Enable Google Speech-to-Text API
2. Create service account and download credentials
3. Set environment variables:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
export TRANSCRIPTION_PROVIDER=google_speech
```

## Graph Database Setup

### Memgraph (Recommended for development)

```bash
# Using Docker
docker run -p 7687:7687 -p 7444:7444 -p 3000:3000 memgraph/memgraph-platform:latest

# Or install locally
# Follow instructions at: https://memgraph.com/docs/getting-started
```

### Neo4j (For production)

```bash
# Using Docker
docker run -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest

# Or install locally
# Follow instructions at: https://neo4j.com/docs/operations-manual/current/installation/
```

## Environment Variables

Create a `.env` file in the RAG package directory:

```bash
# Document Processing
DOCUMENT_PROCESSOR_BACKEND=markitdown
OCR_PROVIDER=tesseract
TRANSCRIPTION_PROVIDER=whisper

# Multimodal
VLM_PROVIDER=openai
GRAPH_DATABASE_URL=memgraph://localhost:7687

# Web Acquisition
CRAWLER_RESPECT_ROBOTS=true
CRAWLER_RATE_LIMIT=10
YOUTUBE_API_KEY=your_api_key_here

# Code Analysis
TREE_SITTER_PARSER_PATH=/usr/local/lib/tree-sitter
CODE_GRAPH_DATABASE=neo4j://localhost:7687

# Hugging Face
HUGGINGFACE_TOKEN=your_token_here

# Model Paths (if using local models)
QWEN_EMBED_MODEL_PATH=/path/to/qwen/embedding/model
QWEN_RERANKER_MODEL_PATH=/path/to/qwen/reranker/model
MLX_MODEL_PATH=/path/to/mlx/model
```

## Development Setup

### 1. Clone External Repositories

```bash
# Create a directory for external dependencies
mkdir -p ../external-deps
cd ../external-deps

# Clone key repositories
git clone https://github.com/microsoft/markitdown.git
git clone https://github.com/docling-project/docling.git
git clone https://github.com/run-llama/semtools.git
```

### 2. Install Rust (for semtools)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install semtools
cargo install semtools
```

### 3. Build External Tools

```bash
# Build any external tools that require compilation
# Check individual repository documentation for build instructions
```

## Testing Setup

### Unit Tests

```bash
# Run unit tests
pnpm test

# Run specific test files
pnpm test document-processing
pnpm test multimodal
```

### Integration Tests

```bash
# Run integration tests
pnpm test:integration

# Run specific integration tests
pnpm test:integration web-acquisition
```

### Performance Tests

```bash
# Run performance tests
pnpm test:performance
```

## Development Workflow

### 1. Branching Strategy

```bash
# Create feature branch
git checkout -b feature/document-processing

# Commit changes with conventional commits
git commit -m "feat(document-processing): add PDF conversion capability"

# Push and create pull request
git push origin feature/document-processing
```

### 2. Code Quality

```bash
# Run linter
pnpm lint

# Run type checker
pnpm typecheck

# Format code
pnpm format
```

### 3. Documentation

```bash
# Generate documentation
pnpm docs:generate

# Check documentation coverage
pnpm docs:check
```

## Troubleshooting

### Common Issues

1. **Python Dependencies Not Found**

   ```bash
   # Ensure virtual environment is activated
   source .venv/bin/activate

   # Reinstall dependencies
   pip install -r requirements.txt
```

2. **MLX Not Available**

   ```bash
   # MLX is only available on Apple Silicon Macs
   # Use Ollama fallback for other platforms
   export MODEL_BACKEND=ollama
```

3. **Graph Database Connection Issues**

   ```bash
   # Check if database is running
   docker ps | grep memgraph

   # Start database if not running
   docker start memgraph-container
```

4. **Insufficient Storage for Models**

   ```bash
   # Check available storage
   df -h

   # Clear model cache if needed
   rm -rf ~/.cache/huggingface/
```

### Getting Help

1. Check the documentation in `docs/` directory
2. Review existing issues in the repository
3. Consult the technical specification in `docs/plan/technical-spec.md`
4. Reach out to the team leads for specific enhancement areas

## Next Steps

1. Complete the environment setup as described above
2. Run the initial test suite to verify setup
3. Begin implementation of Phase 1 components
4. Update this document as new dependencies are added

```