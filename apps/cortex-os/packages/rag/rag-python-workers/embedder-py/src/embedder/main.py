from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer("intfloat/e5-small-v2")

class EmbReq(BaseModel):
    texts: List[str]

@app.post("/embed")
def embed(req: EmbReq):
    vecs = model.encode(req.texts, normalize_embeddings=True).tolist()
    return {"vectors": vecs}
