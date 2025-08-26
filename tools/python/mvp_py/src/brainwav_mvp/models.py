from pydantic import BaseModel
from typing import Any, Optional, Dict


class Problem(BaseModel):
    type: str
    title: str
    status: int
    detail: Optional[str] = None
    instance: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


class Result(BaseModel):
    ok: bool
    value: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None

