from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import time
from functools import lru_cache

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from pydantic import BaseModel

MODEL_NAME = os.getenv("MODEL_NAME")
if MODEL_NAME is None:
    raise RuntimeError("MODEL_NAME environment variable is required")

API_TOKEN = os.getenv("API_TOKEN")
if API_TOKEN is None:
    raise RuntimeError("API_TOKEN environment variable is required")

git_path = shutil.which("git")
if git_path is None:
    raise RuntimeError("git executable not found")
COMMIT_HASH = subprocess.check_output([git_path, "rev-parse", "HEAD"], text=True).strip()  # noqa: S603

REQUEST_COUNT = Counter(
    "inference_requests_total",
    "Total inference requests",
    ["model"],
)
REQUEST_LATENCY = Histogram(
    "inference_request_latency_seconds",
    "Latency of inference requests",
    ["model"],
)
CACHE_HITS = Counter(
    "inference_cache_hits_total",
    "Inference cache hits",
    ["model"],
)

app = FastAPI()

if os.getenv("FORCE_HTTPS", "false").lower() == "true":
    app.add_middleware(HTTPSRedirectMiddleware)

LOGGER = logging.getLogger("ml_inference")
logging.basicConfig(level=logging.INFO)

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> None:
    if credentials.credentials != API_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid or missing token")


class InferenceRequest(BaseModel):
    prompt: str


def _redact(text: str) -> str:
    return re.sub(r"\d", "[REDACTED]", text)


BANNED_WORDS = {"badword"}


@lru_cache(maxsize=1024)
def _model_inference(prompt: str) -> str:
    return prompt[::-1]


@app.post("/predict")
async def predict(
    request: InferenceRequest, _: None = Depends(verify_token)
) -> dict[str, str]:
    if any(word in request.prompt.lower() for word in BANNED_WORDS):
        raise HTTPException(status_code=400, detail="Unsafe prompt")

    before = _model_inference.cache_info().hits
    start = time.perf_counter()
    result = _model_inference(request.prompt)
    duration = time.perf_counter() - start

    REQUEST_COUNT.labels(MODEL_NAME).inc()
    REQUEST_LATENCY.labels(MODEL_NAME).observe(duration)
    after = _model_inference.cache_info().hits
    if after > before:
        CACHE_HITS.labels(MODEL_NAME).inc()

    LOGGER.info("prompt=%s response=%s", _redact(request.prompt), _redact(result))

    return {"response": result}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL_NAME, "commit": COMMIT_HASH}


@app.get("/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready", "model": MODEL_NAME, "commit": COMMIT_HASH}


@app.get("/metrics")
async def metrics(_: None = Depends(verify_token)) -> Response:
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
