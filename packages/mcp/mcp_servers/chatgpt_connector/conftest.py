import os
import subprocess
import time
import uuid
from contextlib import suppress

import pytest


def _find_docker() -> bool:
    try:
        subprocess.run(["docker", "--version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception:
        return False


def _get_mapped_port(container_id: str, container_port: int) -> int:
    result = subprocess.run(
        [
            "docker",
            "inspect",
            "-f",
            f"{{{{ (index (index .NetworkSettings.Ports \"{container_port}/tcp\") 0).HostPort }}}}",
            container_id,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return int(result.stdout.strip())


def _wait_for_qdrant(port: int, timeout: float = 30.0) -> None:
    import http.client

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            conn = http.client.HTTPConnection("localhost", port, timeout=2)
            conn.request("GET", "/readyz")
            resp = conn.getresponse()
            if resp.status == 200:
                return
        except Exception:
            pass
        finally:
            with suppress(Exception):
                conn.close()
        time.sleep(0.5)
    raise RuntimeError("Qdrant not ready within timeout")


@pytest.fixture(autouse=True)
def fast_embeddings(monkeypatch):
    """Patch SentenceTransformer with a lightweight stub for fast tests."""
    # Delay import until fixture runs to ensure patch precedes use
    class _FakeModel:
        def __init__(self, *args, **kwargs):
            pass

        def get_sentence_embedding_dimension(self):
            return 8

        def encode(self, text):
            if isinstance(text, list):
                return [[0.1] * 8 for _ in text]
            return [0.1] * 8

    # Patch adapter module embedder
    from . import memory_bridge_adapter as mba
    monkeypatch.setattr(mba, "SentenceTransformer", lambda *a, **k: _FakeModel())


@pytest.fixture(scope="session", autouse=True)
def qdrant_container():
    """Run a Qdrant container for the test session if not already configured."""
    # If the environment already points to a Qdrant instance, don't start a container
    if os.environ.get("QDRANT_HOST") or os.environ.get("QDRANT_URL"):
        yield
        return

    if not _find_docker():
        pytest.skip("Docker not available for Qdrant container; set QDRANT_URL or QDRANT_HOST/PORT to run tests.")

    name = f"qdrant-test-{uuid.uuid4().hex[:8]}"
    run = subprocess.run(
        ["docker", "run", "-d", "--rm", "-P", "--name", name, "qdrant/qdrant:latest"],
        check=True,
        capture_output=True,
        text=True,
    )
    container_id = run.stdout.strip()

    try:
        port = _get_mapped_port(container_id, 6333)
        # Export environment for the server under test
        os.environ["QDRANT_HOST"] = "localhost"
        os.environ["QDRANT_PORT"] = str(port)

        _wait_for_qdrant(port, timeout=45)
        yield
    finally:
        with suppress(Exception):
            subprocess.run(["docker", "rm", "-f", container_id], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
