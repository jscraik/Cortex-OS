from __future__ import annotations

import importlib
import json
import subprocess
import sys
import textwrap
from collections.abc import Callable, Sequence
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "scripts"


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _create_app_project(repo: Path) -> None:
    project = {
        "$schema": "https://raw.githubusercontent.com/nrwl/nx/master/packages/nx/schemas/project-schema.json",
        "name": "api",
        "projectType": "application",
        "sourceRoot": "apps/api/src",
    }
    _write_text(repo / "apps/api/project.json", json.dumps(project, indent=2))
    _write_text(
        repo / "apps/api/src/router.ts",
        textwrap.dedent(
            """
            import { Router } from 'express';
            const router = Router();
            router.get('/healthz', (_req, res) => res.send('ok'));
            export { router };
            """
        ).strip(),
    )
    _write_text(
        repo / "apps/api/src/status.controller.ts",
        textwrap.dedent(
            """
            import { Controller, Get } from '@nestjs/common';

            @Controller('status')
            export class StatusController {
              @Get('/live')
              check() {
                return 'ok';
              }
            }
            """
        ).strip(),
    )
    _write_text(repo / "apps/api/tests/router.test.ts", "describe('router', () => {});\n")


def _create_package_project(repo: Path) -> None:
    project = {
        "$schema": "https://raw.githubusercontent.com/nrwl/nx/master/packages/nx/schemas/project-schema.json",
        "name": "security",
        "projectType": "library",
        "sourceRoot": "packages/security/src",
    }
    _write_text(repo / "packages/security/project.json", json.dumps(project, indent=2))
    _write_text(
        repo / "packages/security/src/index.ts",
        "export const secret = () => 'locked';\n",
    )
    _write_text(
        repo / "packages/security/tests/index.spec.ts",
        "describe('security', () => { expect(secret()).toBe('locked'); });\n",
    )


def _create_ops_assets(repo: Path) -> None:
    coverage = {
        "total": {
            "lines": {"pct": 87.5},
            "branches": {"pct": 78.0},
            "functions": {"pct": 80.0},
            "statements": {"pct": 84.0},
        }
    }
    _write_text(repo / "coverage/coverage-summary.json", json.dumps(coverage))
    _write_text(repo / "Dockerfile", "FROM node:20-alpine\n")
    _write_text(repo / "docker-compose.yml", "services:{}\n")
    _write_text(
        repo / "infra/k8s/deployment.yaml",
        textwrap.dedent(
            """
            apiVersion: apps/v1
            kind: Deployment
            metadata:
              name: api
            spec:
              replicas: 1
            """
        ).strip(),
    )
    _write_text(repo / "infra/main.tf", "terraform {}\n")
    _write_text(repo / "prisma/schema.prisma", "datasource db { provider = \"postgresql\" }\n")
    _write_text(repo / ".env.example", "PORT=3000\n")
    _write_text(repo / ".github/workflows/ci.yml", "name: ci\n")


def _seed_git(repo: Path) -> None:
    commands: Sequence[Sequence[str]] = (
        ("git", "init"),
        ("git", "config", "user.name", "Codemap Tester"),
        ("git", "config", "user.email", "codemap@example.com"),
        ("git", "add", "-A"),
        ("git", "commit", "-m", "seed"),
    )
    for command in commands:
        subprocess.run(command, cwd=repo, check=True, capture_output=True, text=True)


@pytest.fixture()
def fixture_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "fixture"
    repo.mkdir()
    _create_app_project(repo)
    _create_package_project(repo)
    _create_ops_assets(repo)
    _seed_git(repo)
    return repo


@pytest.fixture(name="codemap_module")
def codemap_module_fixture(monkeypatch: pytest.MonkeyPatch) -> ModuleType:
    if str(SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPTS_DIR))
    if "codemap" in sys.modules:
        del sys.modules["codemap"]
    module = importlib.import_module("codemap")
    monkeypatch.setattr(module, "BRAND", "brAInwav", raising=False)
    return module


def _stubbed_run_factory(
    repo: Path, executed: list[str]
) -> Callable[[Sequence[str], Path | None], tuple[int, str, str]]:
    def run_stub(command: Sequence[str], cwd: Path | None = None) -> tuple[int, str, str]:
        head = command[0] if command else ""
        executed.append(" ".join(command))
        if head == "lizard":
            payload = {
                "files": [
                    {
                        "filename": str(repo / "apps/api/src/router.ts"),
                        "nloc": 24,
                        "average_cyclomatic_complexity": 3.0,
                        "functions": [{"cyclomatic_complexity": 5}],
                    }
                ]
            }
            return 0, json.dumps(payload), ""
        if head == "madge":
            return 0, json.dumps({"graph": {"apps/api/src/router.ts": []}}), ""
        if head == "depcheck":
            return 0, json.dumps({"dependencies": {}, "devDependencies": {}}), ""
        if head == "pydeps":
            return 0, "digraph G {}", ""
        if head == "go":
            return 0, "module@example -> other", ""
        if head == "jdeps":
            return 0, "summary", ""
        completed = subprocess.run(
            command,
            cwd=cwd or repo,
            capture_output=True,
            text=True,
            check=False,
        )
        return completed.returncode, completed.stdout, completed.stderr

    return run_stub


def test_generate_codemap_outputs_expected_sections(
    codemap_module: ModuleType,
    fixture_repo: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    executed: list[str] = []
    monkeypatch.setattr(
        codemap_module,
        "run_command",
        _stubbed_run_factory(fixture_repo, executed),
    )
    out_dir = tmp_path / "out"
    json_path = out_dir / "codemap.json"
    md_path = out_dir / "codemap.md"
    data = codemap_module.generate_codemap(
        repo_path=fixture_repo,
        json_path=json_path,
        markdown_path=md_path,
        since_days=30,
        extra_ignores=None,
        scope="repo",
        sections=None,
        tools=("lizard", "madge", "depcheck"),
    )
    assert json_path.exists()
    assert md_path.exists()
    assert data["scan"]["scope"] == "repo"
    languages = {item["language"] for item in data["languages"]}
    assert languages == {"TypeScript", "Other"}
    assert data["tests"]["count"] == 2
    assert data["tests"]["coverage"]["line"] == 87.5
    assert data["complexity"]["available"] is True
    assert data["analysis"]["js_dependency_graph"]["available"] is True
    summary = md_path.read_text(encoding="utf-8")
    assert "brAInwav codemap" in summary


def test_scope_package_limits_files(
    codemap_module: ModuleType,
    fixture_repo: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    executed: list[str] = []
    monkeypatch.setattr(
        codemap_module,
        "run_command",
        _stubbed_run_factory(fixture_repo, executed),
    )
    data = codemap_module.generate_codemap(
        repo_path=fixture_repo,
        json_path=tmp_path / "codemap.json",
        markdown_path=tmp_path / "codemap.md",
        since_days=30,
        extra_ignores=None,
        scope="package:security",
        sections=None,
        tools=("lizard",),
    )
    languages = {item["language"] for item in data["languages"]}
    assert data["scan"] == {
        "scope": "package",
        "target": "security",
        "root": str(fixture_repo / "packages/security"),
    }
    assert languages == {"TypeScript"}
    assert all("apps/api" not in item["path"] for item in data["size"]["largest_files"])


def test_scope_app_limits_files(
    codemap_module: ModuleType,
    fixture_repo: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    executed: list[str] = []
    monkeypatch.setattr(
        codemap_module,
        "run_command",
        _stubbed_run_factory(fixture_repo, executed),
    )
    data = codemap_module.generate_codemap(
        repo_path=fixture_repo,
        json_path=tmp_path / "codemap.json",
        markdown_path=tmp_path / "codemap.md",
        since_days=30,
        extra_ignores=None,
        scope="app:api",
        sections=None,
        tools=("lizard",),
    )
    assert data["scan"] == {
        "scope": "app",
        "target": "api",
        "root": str(fixture_repo / "apps/api"),
    }
    languages = {item["language"] for item in data["languages"]}
    assert "TypeScript" in languages
    assert all("packages/security" not in item["path"] for item in data["size"]["largest_files"])


def test_sections_filtering_omits_other_sections(
    codemap_module: ModuleType,
    fixture_repo: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    executed: list[str] = []
    monkeypatch.setattr(
        codemap_module,
        "run_command",
        _stubbed_run_factory(fixture_repo, executed),
    )
    data = codemap_module.generate_codemap(
        repo_path=fixture_repo,
        json_path=tmp_path / "codemap.json",
        markdown_path=tmp_path / "codemap.md",
        since_days=30,
        extra_ignores=None,
        scope="repo",
        sections=("git", "complexity"),
        tools=("lizard",),
    )
    keys = set(data.keys())
    assert {"git", "complexity"}.issubset(keys)
    assert "languages" not in keys
    assert "size" not in keys


def test_tool_selection_controls_optional_commands(
    codemap_module: ModuleType,
    fixture_repo: Path,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    executed: list[str] = []
    monkeypatch.setattr(
        codemap_module,
        "run_command",
        _stubbed_run_factory(fixture_repo, executed),
    )
    codemap_module.generate_codemap(
        repo_path=fixture_repo,
        json_path=tmp_path / "codemap.json",
        markdown_path=tmp_path / "codemap.md",
        since_days=30,
        extra_ignores=None,
        scope="repo",
        sections=None,
        tools=("madge",),
    )
    assert any(cmd.startswith("madge") for cmd in executed)
    assert not any(cmd.startswith("lizard") for cmd in executed)


def test_cli_emits_brainwav_branding(fixture_repo: Path, tmp_path: Path) -> None:
    json_path = tmp_path / "codemap.json"
    md_path = tmp_path / "codemap.md"
    script_path = SCRIPTS_DIR / "codemap.py"
    result = subprocess.run(
        [
            sys.executable,
            str(script_path),
            "--repo",
            str(fixture_repo),
            "--out",
            str(json_path),
            "--md",
            str(md_path),
            "--since-days",
            "30",
            "--scope",
            "repo",
            "--sections",
            "git,complexity",
        ],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "brAInwav codemap" in result.stdout
    assert json_path.exists()
    assert md_path.exists()
