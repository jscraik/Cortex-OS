"""
brAInwav Cortex-OS: instructor adapter for schema-constrained outputs.
Accepts a callable validator to avoid hard dependency.
"""
from typing import Callable, Generic, TypeVar

T = TypeVar("T")


class InstructorAdapter(Generic[T]):
    def __init__(self, validate: Callable[[str], T]):
        self._validate = validate

    async def parse(self, text: str) -> T:
        try:
            return self._validate(text)
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(
                f"brAInwav Cortex-OS: instructor validation failed: {exc}") from exc
