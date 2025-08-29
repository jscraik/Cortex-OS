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
    # Accept both snake_case and camelCase for compatibility with tests / callers
    # accept both snake_case and camelCase for compatibility with callers/tests
    # mark as required using Field(..., alias=...) so Pydantic treats them as
    # required inputs when only the alias is provided.
    created_at: str = Field(..., alias="createdAt")
    updated_at: str = Field(..., alias="updatedAt")
    provenance: Provenance
    policy: Policy | None = None
    embedding_model: str | None = None

    # Pydantic v2 configuration: allow population by field name (snake_case)
    # and still accept alias names (camelCase) when parsing.
    model_config = {
        "populate_by_name": True,
    }
