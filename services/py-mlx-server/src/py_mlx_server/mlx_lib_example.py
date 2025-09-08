try:
    import mlx.core as mx
except Exception:  # pragma: no cover - optional dependency
    mx = None


def build_array():
    """Return a simple MLX array or ``None`` if MLX isn't installed."""
    if mx is None:  # pragma: no cover - graceful fallback
        return None
    return mx.array([1.0, 2.0, 3.0]).tolist()
