"""
Shared Instructor client utilities for Cortex-OS Python codebase.

This module centralizes creation and usage of Instructor clients configured
for Ollama via the OpenAI-compatible API.

Key behaviors:
- Uses `OLLAMA_BASE_URL` env var (default: http://localhost:11434/v1)
- Defaults to deterministic structured extraction (temperature=0.0, seed=42)
- Exposes sync and async client factories using instructor.from_openai

Note: We intentionally avoid strict typing against Instructor client classes
to keep compatibility across versions and mypy strict settings.
"""

from __future__ import annotations

import os
from collections.abc import Mapping, Sequence
from typing import Any

import instructor  # type: ignore
from openai import AsyncOpenAI, OpenAI  # type: ignore


def _ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")


def create_sync_instructor(mode: Any | None = None) -> Any:
    """Create a sync Instructor client patched over OpenAI client for Ollama.

    Args:
        mode: Optional Instructor Mode (e.g., instructor.Mode.JSON). If None, uses default.

    Returns:
        An Instructor client instance (sync) with `.chat.completions.*` APIs.
    """
    base = OpenAI(base_url=_ollama_base_url(), api_key="ollama")
    if mode is None:
        # Prefer JSON mode when available for strict structured outputs
        mode = getattr(getattr(instructor, "Mode", None), "JSON", None)
    return (
        instructor.from_openai(base, mode=mode)
        if mode is not None
        else instructor.from_openai(base)
    )


def create_async_instructor(mode: Any | None = None) -> Any:
    """Create an async Instructor client patched over AsyncOpenAI for Ollama.

    Args:
        mode: Optional Instructor Mode (e.g., instructor.Mode.JSON). If None, uses default.

    Returns:
        An Instructor client instance (async) with `.chat.completions.*` APIs.
    """
    base = AsyncOpenAI(base_url=_ollama_base_url(), api_key="ollama")
    if mode is None:
        mode = getattr(getattr(instructor, "Mode", None), "JSON", None)
    return (
        instructor.from_openai(base, mode=mode)
        if mode is not None
        else instructor.from_openai(base)
    )


async def astructured_chat(
    client: Any,
    *,
    model: str,
    response_model: Any,
    messages: Sequence[Mapping[str, Any]],
    temperature: float | None = 0.0,
    seed: int | None = 42,
    max_retries: int | None = 3,
    **kwargs: Any,
) -> Any:
    """Helper to perform structured chat completion (async).

    Applies deterministic-friendly defaults for structured extraction.
    """
    return await client.chat.completions.create(
        model=model,
        response_model=response_model,
        messages=list(messages),
        temperature=temperature,
        seed=seed,
        max_retries=max_retries,
        **kwargs,
    )


def structured_chat(
    client: Any,
    *,
    model: str,
    response_model: Any,
    messages: Sequence[Mapping[str, Any]],
    temperature: float | None = 0.0,
    seed: int | None = 42,
    max_retries: int | None = 3,
    **kwargs: Any,
) -> Any:
    """Helper to perform structured chat completion (sync).

    Applies deterministic-friendly defaults for structured extraction.
    """
    return client.chat.completions.create(
        model=model,
        response_model=response_model,
        messages=list(messages),
        temperature=temperature,
        seed=seed,
        max_retries=max_retries,
        **kwargs,
    )
