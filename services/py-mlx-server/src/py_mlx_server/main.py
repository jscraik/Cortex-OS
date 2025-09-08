from dataclasses import dataclass
import os

def get_port_env_var(var_name="PORT", default="8000"):
    value = os.getenv(var_name, default)
    try:
        return int(value)
    except ValueError:
        raise ValueError(
            f"Invalid value for {var_name}: '{value}'. Must be a valid integer."
        )

from fastapi import FastAPI


@dataclass
class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = get_port_env_var()


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
