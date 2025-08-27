import pathlib
import tomllib

import pytest

PROJECTS = [
    ("cortex_core", pathlib.Path("libs/python/cortex_core/pyproject.toml")),
    ("cortex_ml", pathlib.Path("libs/python/cortex_ml/pyproject.toml")),
    ("brainwav_memories", pathlib.Path("libs/python/memories/pyproject.toml")),
]


@pytest.mark.parametrize("expected_name, path", PROJECTS)
def test_pyproject_basic(expected_name: str, path: pathlib.Path) -> None:
    data = tomllib.loads(path.read_text())
    project = data["project"]
    name = project["name"].replace("-", "_")
    assert name == expected_name.replace("-", "_")
    assert isinstance(project.get("version"), str)
    assert "requires-python" in project
