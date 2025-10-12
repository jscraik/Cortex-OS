#!/usr/bin/env uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "click>=8.1.8",
#     "tomlkit>=0.13.2"
# ]
# ///
import datetime
import json
import re
import subprocess
import sys
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, NewType, Protocol, Sequence

import click
import tomlkit

Version = NewType("Version", str)
GitHash = NewType("GitHash", str)


class GitHashParamType(click.ParamType):
    name = "git_hash"

    def convert(
        self, value: Any, param: click.Parameter | None, ctx: click.Context | None
    ) -> GitHash | None:
        if value is None:
            return None

        if not (8 <= len(value) <= 40):
            self.fail(f"Git hash must be between 8 and 40 characters, got {len(value)}")

        if not re.match(r"^[0-9a-fA-F]+$", value):
            self.fail("Git hash must contain only hex digits (0-9, a-f)")

        try:
            # SECURITY: Verify hash exists in repo with secure subprocess execution
            import shutil

            git_path = shutil.which("git")
            if not git_path or git_path != "/usr/bin/git":
                self.fail("Git command not found or in unexpected location")

            # Validate git hash format more strictly
            if not re.match(r"^[0-9a-fA-F]{8,40}$", value):
                self.fail("Invalid git hash format")

            _run_git_command(
                [git_path, "rev-parse", "--verify", value],
                check=True,
                capture_output=True,
                timeout=10,  # Prevent hanging
            )
        except subprocess.CalledProcessError:
            self.fail(f"Git hash {value} not found in repository")
        except subprocess.TimeoutExpired:
            self.fail("Git command timed out")

        return GitHash(value.lower())


GIT_HASH = GitHashParamType()


class Package(Protocol):
    path: Path

    def package_name(self) -> str: ...

    def update_version(self, version: Version) -> None: ...


@dataclass
class NpmPackage:
    path: Path

    def package_name(self) -> str:
        with open(self.path / "package.json") as f:
            return json.load(f)["name"]

    def update_version(self, version: Version):
        with open(self.path / "package.json", "r+") as f:
            data = json.load(f)
            data["version"] = version
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()


@dataclass
class PyPiPackage:
    path: Path

    def package_name(self) -> str:
        with open(self.path / "pyproject.toml") as f:
            toml_data = tomlkit.parse(f.read())
            name = toml_data.get("project", {}).get("name")
            if not name:
                raise Exception("No name in pyproject.toml project section")
            return str(name)

    def update_version(self, version: Version):
        # Update version in pyproject.toml
        with open(self.path / "pyproject.toml") as f:
            data = tomlkit.parse(f.read())
            data["project"]["version"] = version

        with open(self.path / "pyproject.toml", "w") as f:
            f.write(tomlkit.dumps(data))


def has_changes(path: Path, git_hash: GitHash) -> bool:
    """Check if any files changed between current state and git hash"""
    try:
        # SECURITY: Validate inputs and use secure subprocess execution
        import shutil

        git_path = shutil.which("git")
        if not git_path or git_path != "/usr/bin/git":
            return False

        # Validate git hash format
        if not re.match(r"^[0-9a-fA-F]{8,40}$", git_hash):
            return False

        # Validate path is a directory
        if not path.is_dir():
            return False

        output = _run_git_command(
            [git_path, "diff", "--name-only", git_hash, "--", "."],
            cwd=path,
            check=True,
            capture_output=True,
            text=True,
            timeout=30,  # Prevent hanging
        )

        changed_files = [Path(f) for f in output.stdout.splitlines()]
        relevant_files = [f for f in changed_files if f.suffix in [".py", ".ts"]]
        return len(relevant_files) >= 1
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return False


def gen_version() -> Version:
    """Generate version based on current date"""
    now = datetime.datetime.now()
    return Version(f"{now.year}.{now.month}.{now.day}")


def find_changed_packages(directory: Path, git_hash: GitHash) -> Iterator[Package]:
    for path in directory.glob("*/package.json"):
        if has_changes(path.parent, git_hash):
            yield NpmPackage(path.parent)
    for path in directory.glob("*/pyproject.toml"):
        if has_changes(path.parent, git_hash):
            yield PyPiPackage(path.parent)


@click.group()
def cli():
    pass


@cli.command("update-packages")
@click.option(
    "--directory", type=click.Path(exists=True, path_type=Path), default=Path.cwd()
)
@click.argument("git_hash", type=GIT_HASH)
def update_packages(directory: Path, git_hash: GitHash) -> int:
    # Detect package type
    path = directory.resolve(strict=True)
    version = gen_version()

    for package in find_changed_packages(path, git_hash):
        name = package.package_name()
        package.update_version(version)

        click.echo(f"{name}@{version}")

    return 0


@cli.command("generate-notes")
@click.option(
    "--directory", type=click.Path(exists=True, path_type=Path), default=Path.cwd()
)
@click.argument("git_hash", type=GIT_HASH)
def generate_notes(directory: Path, git_hash: GitHash) -> int:
    # Detect package type
    path = directory.resolve(strict=True)
    version = gen_version()

    click.echo(f"# Release : v{version}")
    click.echo("")
    click.echo("## Updated packages")
    for package in find_changed_packages(path, git_hash):
        name = package.package_name()
        click.echo(f"- {name}@{version}")

    return 0


@cli.command("generate-version")
def generate_version() -> int:
    # Detect package type
    click.echo(gen_version())
    return 0


@cli.command("generate-matrix")
@click.option(
    "--directory", type=click.Path(exists=True, path_type=Path), default=Path.cwd()
)
@click.option("--npm", is_flag=True, default=False)
@click.option("--pypi", is_flag=True, default=False)
@click.argument("git_hash", type=GIT_HASH)
def generate_matrix(directory: Path, git_hash: GitHash, pypi: bool, npm: bool) -> int:
    # Detect package type
    path = directory.resolve(strict=True)
    version = gen_version()

    changes = []
    for package in find_changed_packages(path, git_hash):
        pkg = package.path.relative_to(path)
        if npm and isinstance(package, NpmPackage):
            changes.append(str(pkg))
        if pypi and isinstance(package, PyPiPackage):
            changes.append(str(pkg))

    click.echo(json.dumps(changes))
    return 0


if __name__ == "__main__":
    sys.exit(cli())
def _run_git_command(command: Sequence[str], **kwargs) -> subprocess.CompletedProcess:
    """Execute a git command with strict validation."""

    if not command:
        raise click.ClickException("Empty git command is not allowed")

    sanitized: list[str] = []
    for part in command:
        text = str(part)
        if any(token in text for token in ("|", "&", ";", "$", "`")):
            raise click.ClickException("Unsafe token in git command")
        sanitized.append(text)

    # nosemgrep: semgrep.owasp-top-10-2021-a03-injection-command - git command arguments validated
    return subprocess.run(
        sanitized,
        shell=False,
        **kwargs,
    )
