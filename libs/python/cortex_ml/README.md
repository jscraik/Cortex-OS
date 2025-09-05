# cortex_ml (Python)

Shared utilities for structured LLM outputs with Instructor + Ollama.

- Module: `cortex_ml.instructor_client`
- Supports: sync and async clients (`create_sync_instructor`,
  `create_async_instructor`)
- Helpers: `structured_chat`, `astructured_chat` with deterministic defaults
- Env: `OLLAMA_BASE_URL` (default `http://localhost:11434/v1`)

## Install (library-only workflow)

```bash
python3 -m venv .venv-cortexml && source .venv-cortexml/bin/activate
pip install instructor openai pydantic pytest
```

Ensure Ollama is running locally and pull a model:

```bash
ollama pull llama3.2
```

## Quickstart

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

Async:

```python
import asyncio
from pydantic import BaseModel
from cortex_ml import instructor_client as ic

class Person(BaseModel):
    name: str
    age: int

async def main():
    aclient = ic.create_async_instructor()
    person = await ic.astructured_chat(
        aclient,
        model="llama3.2",
        response_model=Person,
        messages=[{"role": "user", "content": "Jane is 30"}],
    )
    print(person)

asyncio.run(main())
```

## API Contract

- `create_sync_instructor(mode: Any | None = None) -> Any`
  - Returns an Instructor-patched OpenAI client pointing to
    Ollama
  - Defaults to JSON mode when available
    (`instructor.Mode.JSON`)
- `create_async_instructor(mode: Any | None = None) -> Any`
  - Async variant
- `structured_chat(client, *, model, response_model, messages,
temperature=0.0, seed=42, max_retries=3, **kwargs)`
  - Synchronous helper applying deterministic defaults
- `astructured_chat(...)` — async equivalent

## Determinism & Defaults

- `temperature=0.0`, `seed=42`, `max_retries=3` applied by helpers
- You can override any of these via keyword args

## Troubleshooting

- Ensure `OLLAMA_BASE_URL` is set if Ollama is not on the default
  `http://localhost:11434/v1`.
- Make sure a valid local model is pulled, e.g.,
  `ollama pull llama3.2`.
- If you see structured output mismatches, verify your
  `response_model` is a Pydantic model and reduce `temperature`.
- For strict JSON mode behavior, ensure your installed
  `instructor` version supports `Mode.JSON`.

## References

- Instructor docs: [python.useinstructor.com](https://python.useinstructor.com/)
- Ollama OpenAI compatibility: [docs/openai.md](https://github.com/ollama/ollama/blob/main/docs/openai.md)
