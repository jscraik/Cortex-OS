from pydantic import BaseModel, Field
from typing import List, Optional, Tuple, Literal


class Evidence(BaseModel):
    uri: str
    range: Optional[Tuple[int, int]] = None


class Provenance(BaseModel):
    source: Literal["user", "agent", "system"]
    actor: Optional[str] = None
    evidence: Optional[List[Evidence]] = None
    hash: Optional[str] = None


class Policy(BaseModel):
    pii: Optional[bool] = None
    scope: Optional[Literal["session", "user", "org"]] = None


class Memory(BaseModel):
    id: str
    kind: Literal["note", "event", "artifact", "embedding"]
    text: Optional[str] = None
    vector: Optional[List[float]] = None
    tags: List[str] = Field(default_factory=list)
    ttl: Optional[str] = None
    createdAt: str
    updatedAt: str
    provenance: Provenance
    policy: Optional[Policy] = None
    embeddingModel: Optional[str] = None

