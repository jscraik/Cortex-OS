from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class Message(BaseModel):
    id: int | str
    message: str


app = FastAPI()


    return JSONResponse({"id": req.id, "result": {"ok": True, "echo": req.model_dump()}})
