# Instructor + Ollama Example

This example demonstrates using the [OpenAI Instructor](https://github.com/jxnl/instructor) library with a local [Ollama](https://ollama.com) instance running the `gpt-oss` model.

## Prerequisites

- Python 3.11+
- Ollama installed and running
- `gpt-oss` model available: `ollama pull gpt-oss:20b`

## Install Dependencies

```bash
uv pip install -e ../..  # installs project deps including instructor in editable mode
```

## Run

```bash
python src/main.py
```

The script will send a request to the local Ollama server through the OpenAI-compatible API and parse the structured result.
