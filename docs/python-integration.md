# Python Integration (Instructor + Ollama)

Structured LLM outputs across the Python portions of the repository use the
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

## Shared Utility Functions

Key exports from `instructor_client.py` (abridged):

| Function                    | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `create_sync_instructor()`  | Returns patched OpenAI client for sync calls |
| `create_async_instructor()` | Async variant                                |
| `structured_chat()`         | Sync structured response (Pydantic model)    |
| `astructured_chat()`        | Async variant                                |
| `build_messages()`          | Helper for consistent message shape          |

Underlying client initialization patches the OpenAI client via Instructor's
`from_openai` helpers and sets defaults for deterministic generation.

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

### Direct Low-Level Pattern (Explicit Base Client)

If you prefer constructing the underlying OpenAI-compatible client yourself (mirroring
the snippet provided), you can do the following. This is functionally equivalent to
`create_sync_instructor()` but shown here for clarity and quick copy/paste:

```python
import instructor
from openai import OpenAI

# Works with local models via Ollama. No API costs, privacy retained.
client = instructor.from_openai(
    OpenAI(
        base_url="http://localhost:11434/v1",  # or os.environ.get("OLLAMA_BASE_URL")
        api_key="ollama",  # placeholder; Ollama ignores the value
    ),
    mode=instructor.Mode.JSON,
)

# Same structured extraction
user = client.chat.completions.create(
    model="llama3.2",  # any pulled/local model
    response_model=Person,  # a pydantic model
    messages=[{"role": "user", "content": "Extract: John is 25"}],
)
print(user)
```

## Asynchronous Example

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

1. **Define strict Pydantic models** for each structured output.
2. **Keep temperature at 0.0** for reproducibility unless explicitly exploring creativity.
3. **Check model availability** (`ollama list`) before running tests relying on specific models.
4. **Wrap new prompt patterns** in helper functions that always return validated models.
5. **Prefer async flows** when chaining multiple LLM calls to avoid blocking.
6. **Log validation errors** with model schema reference for faster debugging.

## Advanced Patterns

### Multi‑Provider Switching

Seamlessly switch between providers (OpenAI, Anthropic, Ollama, DeepSeek, etc.) using `instructor.from_provider` while keeping the
same response model contracts:

```python
import instructor

# Same code works with any provider
client = instructor.from_provider("openai/gpt-4o")
client = instructor.from_provider("anthropic/claude-3")
client = instructor.from_provider("ollama/llama3.2")
client = instructor.from_provider("deepseek/deepseek-chat")

# Structured extraction stays identical
user = client.chat.completions.create(
    model="llama3.2",  # or provider specific name
    response_model=User,  # Pydantic model
    messages=[{"role": "user", "content": "Extract: John is 25"}],
)
```

### Custom Validators (LLM‑Aware)

Leverage Instructor's validator helpers to enforce semantic constraints beyond static typing:

```python
from instructor import llm_validator
from pydantic import BaseModel, BeforeValidator, Field
from typing_extensions import Annotated

class Review(BaseModel):
    content: Annotated[
        str,
        BeforeValidator(llm_validator("must be professional and constructive")),
    ]
    rating: int = Field(ge=1, le=5)

review = client.chat.completions.create(
    response_model=Review,
    messages=[{"role": "user", "content": "Write a product review"}],
)
# Validation fails if content isn't professional
```

### Parallel Tool / Function Use (Union Responses)

Ask for multiple structured tool invocations at once and let the model choose or emit several:

```python
from typing import Union, Literal, Iterable
from pydantic import BaseModel

class Weather(BaseModel):
    location: str
    units: Literal["imperial", "metric"]

class GoogleSearch(BaseModel):
    query: str

result = client.chat.completions.create(
    response_model=Iterable[Union[Weather, GoogleSearch]],
    messages=[{"role": "user", "content": "Weather in NYC and who won Super Bowl 2024"}],
)
```

### Streaming Partial Objects

Get incremental structured updates (great for progressive UIs):

```python
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int | None = None
    bio: str | None = None

stream = client.chat.completions.create_partial(
    response_model=User,
    messages=[{"role": "user", "content": "Create a user profile"}],
    stream=True,
)

for partial in stream:
    update_ui(partial)
```

### Maybe Pattern (Graceful Uncertainty)

Allow LLM to explicitly communicate uncertainty instead of hallucinating fields:

```python
from instructor import Maybe
from pydantic import BaseModel
from typing import Optional

class UserDetail(BaseModel):
    name: str
    age: int

class MaybeUser(BaseModel):
    result: Optional[UserDetail] = None
    error: bool = False
    message: Optional[str] = None

maybe_user = client.chat.completions.create(
    response_model=MaybeUser,
    messages=[{"role": "user", "content": "Extract: unclear text"}],
)

if maybe_user.result:
    print("Found:", maybe_user.result)
else:
    print("Uncertain:", maybe_user.message)
```

## Troubleshooting

| Issue                     | Resolution                                                                       |
| ------------------------- | -------------------------------------------------------------------------------- |
| `Connection refused`      | Ensure `ollama serve` is running or service installed.                           |
| Model not found           | `ollama pull <model>` (e.g. `ollama pull llama3.2`).                             |
| Validation errors         | Print `model_json_schema()` for your Pydantic model to verify field names/types. |
| Non-deterministic outputs | Confirm `temperature=0` and consistent prompt + model version.                   |
| Slow first response       | Initial model load; subsequent calls should warm cache.                          |

## References

- Instructor Docs: <https://python.useinstructor.com/>
- Instructor GitHub: <https://github.com/567-labs/instructor>
- Ollama OpenAI Compatibility: <https://github.com/ollama/ollama/blob/main/docs/openai.md>

---

Return to: [Quick Start](./quick-start.md) • [Architecture](./architecture.md) • [Root README](../README.md)
