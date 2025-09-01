"""Pytest configuration for ml-inference tests."""

import os
import sys
from pathlib import Path


def pytest_configure(config):
    """Configure pytest for ml-inference tests."""
    # Add src directory to Python path (ensure it comes first)
    src_path = Path(__file__).resolve().parents[1] / "src"
    if str(src_path) not in sys.path:
        sys.path.insert(0, str(src_path))
    os.environ.setdefault("MODEL_NAME", "test-model")
    os.environ.setdefault("API_TOKEN", "test-token")
