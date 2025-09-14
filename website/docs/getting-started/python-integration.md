---
sidebar_position: 2
---

# Python Integration

Structured LLM outputs across the Python portions of Cortex-OS use the
[Instructor](https://python.useinstructor.com/) library against an
OpenAI‑compatible Ollama endpoint.

## Overview

| Aspect         | Implementation                                             |
| -------------- | ---------------------------------------------------------- |
| Transport      | OpenAI-compatible HTTP (Ollama)                            |
| Validation     | Pydantic models + Instructor JSON / JSON schema modes      |
| Determinism    | `temperature=0.0`, explicit `seed` support where available |
| Retries        | Default `max_retries=3` (tunable)                          |
| Shared Utility | `libs/python/cortex_ml/src/cortex_ml/instructor_client.py` |
| Async + Sync   | Both supported with mirrored helpers                       |

## Environment Setup

Minimal workflow for Python-only contributors.

### Option A: uv (preferred)

```bash
uv sync
```

### Option B: Virtualenv

```bash
python3 -m venv .venv-py313
source .venv-py313/bin/activate
pip install -r requirements.txt  # if present

# Or install directly for focused work
pip install instructor openai pydantic pytest
```

### Ollama Runtime

Install Ollama (see official docs) then pull at least one model:

```bash
ollama pull llama3.2
```

Set a base URL if different from default:

```bash
export OLLAMA_BASE_URL="http://localhost:11434/v1"
```

## Synchronous Example

```python
from pydantic import BaseModel
from cortex_ml import instructor_client as ic

class Person(BaseModel):
    name: str
    age: int

client = ic.create_sync_instructor()
person = ic.structured_chat(
    client,
    model="llama3.2",
    response_model=Person,
    messages=[{"role": "user", "content": "John is 25 years old"}],
)
print(person)
```

## Configuration & Defaults

| Setting       | Default                                           | Notes                                    |
| ------------- | ------------------------------------------------- | ---------------------------------------- |
| `temperature` | `0.0`                                             | Deterministic-friendly                   |
| `seed`        | `42`                                              | Used if backend honors seeds             |
| `max_retries` | `3`                                               | Basic transient fault handling           |
| `mode`        | `instructor.Mode.JSON`                            | Structured JSON responses when available |
| `api_key`     | `"ollama"`                                        | Placeholder (ignored by local Ollama)    |
| `base_url`    | `$OLLAMA_BASE_URL` or `http://localhost:11434/v1` | OpenAI-compatible path                   |

## Best Practices

1. **Define strict Pydantic models** for each structured output
2. **Keep temperature at 0.0** for reproducibility unless explicitly exploring creativity
3. **Check model availability** (`ollama list`) before running tests relying on specific models
4. **Wrap new prompt patterns** in helper functions that always return validated models
5. **Prefer async flows** when chaining multiple LLM calls to avoid blocking

## Advanced Patterns

### Multi‑Provider Switching

Seamlessly switch between providers while keeping the same response model contracts:

```python
import instructor

# Same code works with any provider
client = instructor.from_provider("openai/gpt-4o")
client = instructor.from_provider("anthropic/claude-3")
client = instructor.from_provider("ollama/llama3.2")
client = instructor.from_provider("deepseek/deepseek-chat")

# Structured extraction stays identical
user = client.chat.completions.create(
    model="llama3.2",
    response_model=User,
    messages=[{"role": "user", "content": "Extract: John is 25"}],
)
```

## Troubleshooting

| Issue                     | Resolution                                                                       |
| ------------------------- | -------------------------------------------------------------------------------- |
| `Connection refused`      | Ensure `ollama serve` is running or service installed                           |
| Model not found           | `ollama pull <model>` (e.g. `ollama pull llama3.2`)                             |
| Validation errors         | Print `model_json_schema()` for your Pydantic model to verify field names/types |
| Non-deterministic outputs | Confirm `temperature=0` and consistent prompt + model version                   |
| Slow first response       | Initial model load; subsequent calls should warm cache                          |

## References

- [Instructor Documentation](https://python.useinstructor.com/)
- [Instructor GitHub](https://github.com/567-labs/instructor)
- [Ollama OpenAI Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)
