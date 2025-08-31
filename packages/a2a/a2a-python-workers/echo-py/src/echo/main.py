from datetime import datetime

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Envelope(BaseModel):
    id: str
    type: str
    occurred_at: str
    headers: dict = {}
    payload: dict | list | str | int | float | bool | None = None


@app.post("/a2a")
def handle(msg: Envelope):
    return {
        "ok": True,
        "echo": msg.model_dump(),
        "handledAt": datetime.utcnow().isoformat(),
    }
