from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class Budget(BaseModel):
    wallClockMs: int
    maxSteps: int
    tokens: Optional[int] = None
    costUSD: Optional[float] = None

class Task(BaseModel):
    id: str
    kind: str
    input: Any
    tags: Optional[List[str]] = None
    budget: Budget
    ctx: Optional[Dict[str, Any]] = None

class Error(BaseModel):
    code: str
    message: str

class Result(BaseModel):
    taskId: str
    ok: bool
    output: Optional[Any] = None
    error: Optional[Error] = None
    evidence: Optional[List[Dict[str, Any]]] = None
    usage: Optional[Dict[str, Any]] = None

class Memory(BaseModel):
    id: str
    kind: str
    text: Optional[str] = None
    vector: Optional[List[float]] = None
    embeddingModel: Optional[str] = None
    tags: List[str]
    createdAt: str
    updatedAt: str
    expiresAt: Optional[str] = None
    provenance: Dict[str, Any]