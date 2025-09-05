#!/usr/bin/env python3

"""Utility to download an npm release artifact for a given version and publish it.

This script performs conservative validation on inputs and runs external
commands without invoking a shell to avoid command injection risks. It will
download the GitHub release asset named `codex-npm-<version>.tgz` from the
`openai/codex` repo (tagged `rust-v<version>`) using the `gh` CLI and then
call `npm publish` on the downloaded tarball.

Usage:
  publish_to_npm.py 0.20.0 [--dir /path/to/dir] [--dry-run]

Requirements:
  - `gh` (GitHub CLI) available in PATH and authenticated for `openai/codex`.
  - `npm` installed and logged in for publishing `@openai/codex`.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from subprocess import CompletedProcess


def _is_safe_arg(a: object) -> bool:
    """Conservative validation for CLI args passed to subprocess.

    Allows alphanumerics plus a small set of safe punctuation characters.
    This intentionally excludes characters like `;`, `|`, `&`, `$`, `` ` ``,
    and newlines which could be abused when combined with shell invocation.
    """

    return isinstance(a, str) and bool(re.match(r"^[A-Za-z0-9._\-@:/\\]+$", a))


def run_checked(cmd: list[str], cwd: Path | None = None) -> None:
    """Run a command with checked arguments and raise on non-zero exit."""

    if not all(_is_safe_arg(x) for x in cmd):
        raise ValueError(f"Refusing to run unsafe command: {cmd}")

    # Arguments are validated above with `_is_safe_arg` — call subprocess
    # without a shell. Suppress the generic semgrep injection rule here.
    # nosemgrep: semgrep.owasp-top-10-2021-a03-injection
    subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=True)


def safe_exec(
    cmd_list: list[str], env: dict[str, str] | None = None
) -> CompletedProcess[bytes]:
    """Run a validated command and return CompletedProcess capturing output."""

    if not all(_is_safe_arg(x) for x in cmd_list):
        raise ValueError(f"Refusing to run unsafe command: {cmd_list}")

    # Arguments are validated above with `_is_safe_arg` — call subprocess
    # without a shell and capture output. Suppress the generic semgrep
    # injection rule here.
    # nosemgrep: semgrep.owasp-top-10-2021-a03-injection
    return subprocess.run(cmd_list, env=env, check=False, capture_output=True)


def validate_version(v: str) -> str:
    """Validate version looks like a semantic version (X.Y.Z with optional suffix)."""

    pattern = r"^(\d+)\.(\d+)\.(\d+)(?:[-+][A-Za-z0-9_.-]+)?$"
    if not re.match(pattern, v):
        raise argparse.ArgumentTypeError(f"Invalid version format: {v}")
    return v


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Download the npm release artifact for a given version and publish it."
        )
    )

    parser.add_argument(
        "version",
        type=lambda s: validate_version(s.lstrip("v")),
        help="Release version to publish, e.g. 0.20.0 (without the 'v' prefix)",
    )
    parser.add_argument(
        "--dir",
        type=Path,
        help=(
            "Optional directory to download the artifact into. Defaults to a temporary directory."
        ),
    )
    parser.add_argument(
        "-n",
        "--dry-run",
        action="store_true",
        help="Delegate to `npm publish --dry-run` (still downloads the artifact).",
    )

    args = parser.parse_args()

    version: str = args.version
    tag = f"rust-v{version}"
    asset_name = f"codex-npm-{version}.tgz"

    if args.dir:
        download_dir = args.dir
        download_dir_context_manager = None
    else:
        download_dir_context_manager = tempfile.TemporaryDirectory()
        download_dir = Path(download_dir_context_manager.name)

    download_dir.mkdir(parents=True, exist_ok=True)

    # Locate `gh` and `npm` in PATH
    repo = "openai/codex"
    gh_path = shutil.which("gh")
    if not gh_path:
        print("Error: 'gh' command not found in PATH", file=sys.stderr)
        return 1

    npm_path = shutil.which("npm") or "npm"

    # Download the release asset using `gh release download`
    gh_cmd = [
        gh_path,
        "release",
        "download",
        tag,
        "--repo",
        repo,
        "--pattern",
        asset_name,
        "--dir",
        str(download_dir),
    ]

    print(f"Downloading {asset_name} from {repo}@{tag} into {download_dir}...")
    try:
        run_checked(gh_cmd)
    except subprocess.CalledProcessError as e:
        print(f"gh release download failed (exit {e.returncode})", file=sys.stderr)
        return e.returncode

    artifact_path = download_dir / asset_name
    if not args.dry_run and not artifact_path.is_file():
        print(
            f"Error: expected artifact not found after download: {artifact_path}",
            file=sys.stderr,
        )
        return 1

    # Prepare npm publish command. We pass the artifact path as an argument.
    npm_cmd = [npm_path, "publish"]
    if args.dry_run:
        npm_cmd.append("--dry-run")
    npm_cmd.append(str(artifact_path))

    # Ensure CI is unset so npm can open a browser for 2FA if needed.
    env = os.environ.copy()
    env.pop("CI", None)

    print("Running:", " ".join(npm_cmd))

    proc = safe_exec(npm_cmd, env=env)
    try:
        proc.check_returncode()
    except subprocess.CalledProcessError as e:
        stderr = proc.stderr.decode(errors="replace") if proc.stderr else ""
        stdout = proc.stdout.decode(errors="replace") if proc.stdout else ""
        print(f"npm publish failed (exit {e.returncode}):", file=sys.stderr)
        if stdout:
            print("stdout:", stdout, file=sys.stderr)
        if stderr:
            print("stderr:", stderr, file=sys.stderr)
        return e.returncode

    print("Publish complete.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
