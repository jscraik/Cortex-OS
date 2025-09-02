"""FastAPI application placeholder."""

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root() -> dict:
    return {"status": "ok"}
