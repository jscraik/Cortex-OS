import importlib
import pathlib
import sys
import time

import pytest

PACKAGES = [
    ("cortex_core", pathlib.Path("libs/python/cortex_core/src")),
    ("cortex_ml", pathlib.Path("libs/python/cortex_ml/src")),
    ("brainwav_memories", pathlib.Path("libs/python/memories/src")),
]


@pytest.mark.parametrize("module, src_dir", PACKAGES)
def test_import_time(module: str, src_dir: pathlib.Path) -> None:
    if not src_dir.exists():
        pytest.skip("source directory missing")
    sys.path.insert(0, str(src_dir))
    start = time.perf_counter()
    try:
        importlib.import_module(module)
    except ModuleNotFoundError:
        pytest.skip(f"module {module} not importable")
    duration = time.perf_counter() - start
    sys.path.pop(0)
    assert duration < 1.0
