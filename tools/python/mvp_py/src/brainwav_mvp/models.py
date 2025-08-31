from typing import Any

from pydantic import BaseModel


class Problem(BaseModel):
    type: str
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    meta: dict[str, Any] | None = None


class Result(BaseModel):
    ok: bool
    value: Any | None = None
    error: dict[str, Any] | None = None
