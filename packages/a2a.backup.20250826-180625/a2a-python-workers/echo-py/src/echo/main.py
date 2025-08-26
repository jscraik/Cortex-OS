from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

app = FastAPI()

class Envelope(BaseModel):
    id: str
    type: str
    occurredAt: str
    headers: dict = {}
    payload: dict | list | str | int | float | bool | None = None

@app.post("/a2a")
def handle(msg: Envelope):
    return {"ok": True, "echo": msg.model_dump(), "handledAt": datetime.utcnow().isoformat()}
