---
title: Testing
sidebar_label: Testing
---

# Testing & QA

Run unit tests with `pytest`:
```bash
uv sync
.venv/bin/python -m pytest apps/cortex-py/tests -q
```
The `tests/test_mlx_unified.py` suite verifies embedding and CLI behavior. Aim for high coverage on new contributions and follow TDD by writing failing tests first.
