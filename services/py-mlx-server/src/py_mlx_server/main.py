from dataclasses import dataclass
import os

from fastapi import FastAPI


@dataclass
class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()
app = FastAPI()


@app.get("/ping")
async def ping():
    return {"message": "pong"}


@app.get("/health")
async def health():
    return {"status": "ok"}


def run() -> None:  # pragma: no cover - convenience wrapper
    import uvicorn

    uvicorn.run("py_mlx_server.main:app", host=settings.host, port=settings.port)


if __name__ == "__main__":  # pragma: no cover
    run()
