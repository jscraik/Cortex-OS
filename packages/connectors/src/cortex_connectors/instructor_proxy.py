"""Utilities that wrap connectors with Instructor JSON guarantees."""

from __future__ import annotations

import inspect
from typing import Any, Callable, Dict, Type, TypeVar

from instructor import Mode, generate_openai_schema
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class InstructorJSONProxy:
    """Proxy that enforces JSON compliance for connector responses."""

    def __init__(self, dispatcher: Callable[[Dict[str, Any]], Any]) -> None:
        self._dispatcher = dispatcher
        self._mode = Mode.JSON_SCHEMA

    def invoke(self, payload: Dict[str, Any], response_model: Type[T]) -> T:
        raw_response = self._dispatcher(payload)
        if inspect.isawaitable(raw_response):
            raise RuntimeError("Use `ainvoke` for async dispatchers")
        try:
            return _validate_with_instructor(response_model, raw_response)
        except ValidationError as exc:
            raise ValueError("Connector response failed Instructor validation") from exc

    async def ainvoke(self, payload: Dict[str, Any], response_model: Type[T]) -> T:
        raw_response = self._dispatcher(payload)
        if inspect.isawaitable(raw_response):
            raw_response = await raw_response  # type: ignore[assignment]
        try:
            return _validate_with_instructor(response_model, raw_response)
        except ValidationError as exc:
            raise ValueError("Connector response failed Instructor validation") from exc


def _validate_with_instructor(response_model: Type[T], payload: Dict[str, Any]) -> T:
    # Generating the schema ensures Instructor JSON mode compatibility and provides
    # parity with downstream consumers that rely on the same JSON contract.
    generate_openai_schema(response_model)
    return response_model.model_validate(payload)


__all__ = ["InstructorJSONProxy"]
