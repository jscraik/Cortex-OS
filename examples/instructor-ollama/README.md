# Instructor + Ollama Example

This example demonstrates using the [OpenAI Instructor](https://github.com/jxnl/instructor) library with a local [Ollama](https://ollama.com) instance. By default it targets the `qwen3-coder:30b` model but you can override the model list via the `OLLAMA_MODELS` environment variable.

## Prerequisites

- Python 3.11+
- Ollama installed and running
- `qwen3-coder:30b` model available: `ollama pull qwen3-coder:30b`

## Install Dependencies

```bash

uv pip install -e ../..  # installs project deps including instructor in editable mode
```

## Run

```bash
python src/main.py
```

The script will send a request to the local Ollama server through the OpenAI-compatible API and parse the structured result.
