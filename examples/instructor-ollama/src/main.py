"""Use OpenAI Instructor with Ollama."""

from __future__ import annotations

import os

import instructor
from openai import OpenAI
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int
    bio: str | None = None


OLLAMA_MODELS = [
    m.strip()
    for m in os.getenv("OLLAMA_MODELS", "qwen3-coder:30b").split(",")
    if m.strip()
]

client = instructor.from_openai(
    OpenAI(base_url="http://localhost:11434/v1", api_key="ollama"),
    mode=instructor.Mode.JSON,
)


def extract_user(prompt: str) -> User:
    """Attempt extraction using the first working model."""

    last_err: Exception | None = None
    for model in OLLAMA_MODELS:
        try:
            return client.chat.completions.create(
                model=model,
                response_model=User,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:  # pragma: no cover - depends on model availability
            last_err = exc
    raise RuntimeError(f"All models failed: {last_err}")


user = extract_user("Extract: John is 25")
print(user.model_dump_json(indent=2))
