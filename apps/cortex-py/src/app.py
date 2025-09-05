from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .mlx.embedding_generator import MLXEmbeddingGenerator

app = FastAPI()
_generator = MLXEmbeddingGenerator()


class EmbedRequest(BaseModel):
    text: str


@app.post("/embed")
def embed(req: EmbedRequest):
    try:
        embedding = _generator.generate_embedding(req.text)
        return {"embedding": embedding}
    except Exception as e:  # pragma: no cover - simple API surface
        raise HTTPException(status_code=500, detail=str(e))
