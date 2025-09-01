"""Pytest configuration for data-pipeline tests."""

import importlib.util
import sys
from pathlib import Path


def pytest_configure(config):
    """Configure pytest for data-pipeline tests."""
    # Add src directory to Python path
    src_path = Path(__file__).resolve().parents[1]
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))

    # Import pipeline module for tests
    spec = importlib.util.spec_from_file_location("pipeline", src_path / "pipeline.py")
    if spec and spec.loader:
        pipeline = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pipeline)
        sys.modules["pipeline"] = pipeline
