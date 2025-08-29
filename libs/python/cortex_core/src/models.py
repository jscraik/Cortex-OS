from typing import Any

from pydantic import BaseModel


class Budget(BaseModel):
    wall_clock_ms: int
    max_steps: int
    tokens: int | None = None
    cost_usd: float | None = None


class Task(BaseModel):
    id: str
    kind: str
    input: Any
    tags: list[str] | None = None
    budget: Budget
    ctx: dict[str, Any] | None = None


class Error(BaseModel):
    code: str
    message: str


class Result(BaseModel):
    task_id: str
    ok: bool
    output: Any | None = None
    error: Error | None = None
    evidence: list[dict[str, Any]] | None = None
    usage: dict[str, Any] | None = None


class Memory(BaseModel):
    id: str
    kind: str
    text: str | None = None
    vector: list[float] | None = None
    embedding_model: str | None = None
    tags: list[str]
    created_at: str
    updated_at: str
    expires_at: str | None = None
    provenance: dict[str, Any]
