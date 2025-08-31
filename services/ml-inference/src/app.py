from __future__ import annotations

import logging
import os
import re
import shutil
import subprocess
import time
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Histogram,
    generate_latest,
)
from pydantic import BaseModel

MODEL_NAME = os.getenv("MODEL_NAME")
if MODEL_NAME is None:
    raise RuntimeError("MODEL_NAME environment variable is required")

GIT = shutil.which("git")
if GIT is None:
    raise RuntimeError("git executable not found")
COMMIT_HASH = subprocess.check_output([GIT, "rev-parse", "HEAD"], text=True).strip()  # noqa: S603

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

LOGGER = logging.getLogger("ml_inference")
logging.basicConfig(level=logging.INFO)


class InferenceRequest(BaseModel):
    prompt: str


def _redact(text: str) -> str:
    return re.sub(r"\d", "[REDACTED]", text)


BANNED_WORDS = {"badword"}


@lru_cache(maxsize=1024)
def _model_inference(prompt: str) -> str:
    time.sleep(0.01)
    return prompt[::-1]


@app.post("/predict")
async def predict(request: InferenceRequest) -> dict[str, str]:
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
async def metrics() -> Response:
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
