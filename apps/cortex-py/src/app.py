import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from .mlx.embedding_generator import MLXEmbeddingGenerator
except Exception:  # pragma: no cover - fallback for direct execution
    from mlx.embedding_generator import MLXEmbeddingGenerator  # type: ignore

logger = logging.getLogger(__name__)


class EmbedRequest(BaseModel):
    text: str


def create_app(generator: MLXEmbeddingGenerator | None = None) -> FastAPI:
    app = FastAPI()
    gen = generator or MLXEmbeddingGenerator()

    @app.post("/embed")
    def embed(req: EmbedRequest):
        if not req.text:
            logger.error("empty text payload")
            raise HTTPException(status_code=422, detail="text must not be empty")
        try:
            embedding = gen.generate_embedding(req.text)
            return {"embedding": embedding}
        except Exception as e:  # pragma: no cover - simple API surface
            raise HTTPException(status_code=500, detail=str(e))

    return app


try:
    app = create_app()
except Exception:  # pragma: no cover - generator unavailable
    logger.warning("MLXEmbeddingGenerator unavailable during import", exc_info=True)
    app = FastAPI()
