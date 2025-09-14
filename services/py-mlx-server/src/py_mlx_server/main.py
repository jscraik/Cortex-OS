import os
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


def get_port_env_var(var_name: str = "PORT", default: str = "8000") -> int:
    value = os.getenv(var_name, default)
    try:
        return int(value)
    except ValueError as e:
        raise ValueError(
            f"Invalid value for {var_name}: '{value}'. Must be a valid integer."
        ) from e


@dataclass
class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = get_port_env_var()
    model: str = os.getenv("EMBEDDINGS_MODEL", "qwen3-embed")
    dimensions: int = int(os.getenv("EMBEDDINGS_DIM", "768"))


settings = Settings()
app = FastAPI()


class EmbedRequest(BaseModel):
    # Accept either `input` or `texts` for compatibility
    input: list[str] | str | None = None
    texts: list[str] | None = None
    model: str | None = None


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


@app.get("/ping")
async def ping():
    return {"message": "pong"}


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.model, "dimensions": settings.dimensions}


def _fallback_embed(texts: list[str], dims: int) -> list[list[float]]:
    # Deterministic, lightweight embedding for environments without MLX
    embs: list[list[float]] = []
    for t in texts:
        vec = [0.0] * dims
        for i, ch in enumerate(t.encode("utf-8")):
            vec[i % dims] += (ch % 23) / 23.0
        # simple normalization
        s = sum(vec) or 1.0
        embs.append([v / s for v in vec])
    return embs


@app.post("/embed", response_model=EmbedResponse)
async def embed(req: EmbedRequest) -> Any:
    # Resolve inputs
    inputs: list[str]
    if isinstance(req.input, str):
        inputs = [req.input]
    elif isinstance(req.input, list) and len(req.input) > 0:
        inputs = req.input
    elif isinstance(req.texts, list) and len(req.texts) > 0:
        inputs = req.texts
    else:
        raise HTTPException(status_code=400, detail="Missing 'input' or 'texts'")

    model = req.model or settings.model

    # Try MLX if available; fallback otherwise
    try:
        # Delayed import so environments without MLX don't fail to start
        import importlib

        mlx_core = importlib.util.find_spec("mlx.core")
        if mlx_core is None:
            raise ImportError("mlx.core not found")

        # If you have a proper embedding pipeline, plug it here.
        # For now, mirror the fallback behavior while signaling MLX availability.
        embeddings = _fallback_embed(inputs, settings.dimensions)
    except Exception:
        embeddings = _fallback_embed(inputs, settings.dimensions)

    return EmbedResponse(
        embeddings=embeddings,
        model=model,
        dimensions=settings.dimensions,
    )


def run() -> None:  # pragma: no cover - convenience wrapper
    import uvicorn

    uvicorn.run("py_mlx_server.main:app", host=settings.host, port=settings.port)


if __name__ == "__main__":  # pragma: no cover
    run()
