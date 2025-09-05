#!/usr/bin/env python3

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def validate_version(version: str) -> str:
    """Validate and sanitize version string to prevent command injection."""
    # Only allow semantic version format: x.y.z with optional pre-release
    pattern = r"^(\d+)\.(\d+)\.(\d+)(?:-[\w\.\-]+)?$"
    if not re.match(pattern, version):
        raise ValueError(f"Invalid version format: {version}. Expected format: x.y.z")
    return version


def main() -> int:
    parser = argparse.ArgumentParser(
        description="""Stage a release for the npm module.

Run this after the GitHub Release has been created and use
`--release-version` to specify the version to release.

Optionally pass `--tmp` to control the temporary staging directory that will be
forwarded to stage_release.sh.
"""
    )
    parser.add_argument(
        "--release-version", required=True, help="Version to release, e.g., 0.3.0"
    )
    parser.add_argument(
        "--tmp",
        help="Optional path to stage the npm package; forwarded to stage_release.sh",
    )
    args = parser.parse_args()
    version = args.release_version

    # Validate version to prevent command injection
    try:
        version = validate_version(version)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    # Find full path to gh command for security
    gh_path = shutil.which("gh")
    if not gh_path:
        print("Error: 'gh' command not found in PATH", file=sys.stderr)
        return 1

    # Security: Version validated above, workflow data from trusted GitHub API
    # nosemgrep: python.lang.security.audit.subprocess-shell-injection
    gh_run = subprocess.run(
        [
            gh_path,
            "run",
            "list",
            "--branch",
            f"rust-v{version}",
            "--json",
            "workflowName,url,headSha",
            "--jq",
            'first(.[] | select(.workflowName == "rust-release"))',
        ],
        stdout=subprocess.PIPE,
        check=True,
    )
    gh_run.check_returncode()
    workflow = json.loads(gh_run.stdout)
    sha = workflow["headSha"]

    print(f"should `git checkout {sha}`")

    current_dir = Path(__file__).parent.resolve()
    cmd = [
        str(current_dir / "stage_release.sh"),
        "--version",
        version,
        "--workflow-url",
        workflow["url"],
    ]
    if args.tmp:
        cmd.extend(["--tmp", args.tmp])

    # Security: Command constructed from validated inputs and trusted paths

    stage_release = subprocess.run(cmd)
    stage_release.check_returncode()

    return 0


if __name__ == "__main__":
    sys.exit(main())
