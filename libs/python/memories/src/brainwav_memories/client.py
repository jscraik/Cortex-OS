import httpx
from .models import Memory


class MemoriesClient:
    def __init__(self, base_url: str, token: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}

    def save(self, m: Memory) -> Memory:
        r = httpx.post(
            f"{self.base_url}/memories", json=m.model_dump(), headers=self.headers, timeout=30
        )
        r.raise_for_status()
        return Memory(**r.json())

    def get(self, id: str) -> Memory | None:
        r = httpx.get(f"{self.base_url}/memories/{id}", headers=self.headers, timeout=30)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return Memory(**r.json())

