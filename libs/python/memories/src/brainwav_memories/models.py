from typing import Literal

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    uri: str
    range: tuple[int, int] | None = None


class Provenance(BaseModel):
    source: Literal["user", "agent", "system"]
    actor: str | None = None
    evidence: list[Evidence] | None = None
    hash: str | None = None


class Policy(BaseModel):
    pii: bool | None = None
    scope: Literal["session", "user", "org"] | None = None


class Memory(BaseModel):
    id: str
    kind: Literal["note", "event", "artifact", "embedding"]
    text: str | None = None
    vector: list[float] | None = None
    tags: list[str] = Field(default_factory=list)
    ttl: str | None = None
    created_at: str
    updated_at: str
    provenance: Provenance
    policy: Policy | None = None
    embedding_model: str | None = None
