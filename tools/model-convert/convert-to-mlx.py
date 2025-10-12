#!/usr/bin/env python3
"""
Wrapper to convert HuggingFace models to MLX format using mlx-knife.
Supports both embedding models and cross-encoders for reranking.

Usage:
  python tools/model-convert/convert-to-mlx.py --hf microsoft/bge-base-en-v1.5 --out /Volumes/ExternalSSD/.cache/huggingface/models/mlx/bge-base-en-v1.5
  python tools/model-convert/convert-to-mlx.py --hf BAAI/bge-reranker-base --out /Volumes/ExternalSSD/.cache/huggingface/models/mlx/bge-reranker-base
"""

import argparse
import logging
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Sequence

logger = logging.getLogger(__name__)


def get_mlxknife_path() -> str:
    """Return path to mlxknife if available, else raise error."""
    mlxknife_path = shutil.which("mlxknife")
    if not mlxknife_path:
        raise FileNotFoundError(
            "mlxknife not found. Install from https://github.com/mzau/mlx-knife.git"
        )

    # SECURITY: Validate mlxknife binary path for safety
    import os

    if not os.path.isfile(mlxknife_path) or not os.access(mlxknife_path, os.X_OK):
        raise RuntimeError(f"mlxknife at {mlxknife_path} is not executable")

    # SECURITY: Test mlxknife version with secure subprocess execution
    result = _run_allowlisted_command(
        [mlxknife_path, "--version"],
        capture_output=True,
        text=True,
        timeout=10,  # Prevent hanging
    )
    if result.returncode != 0:
        raise RuntimeError(f"mlxknife --version failed: {result.stderr}")
    return mlxknife_path


def convert_model(hf_model: str, output_path: str, task: str) -> bool:
    """Convert HuggingFace model to MLX format using mlx-knife."""
    try:
        mlxknife_path = get_mlxknife_path()
    except (FileNotFoundError, RuntimeError) as err:
        logger.error(err)
        return False

    # SECURITY: Validate inputs to prevent injection
    # Validate HuggingFace model name format
    import re

    if not re.match(
        r"^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?(/[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?)?$",
        hf_model,
    ):
        logger.error("Invalid HuggingFace model name format: %s", hf_model)
        return False

    # Validate task parameter
    valid_tasks = ["feature-extraction", "text-classification"]
    if task not in valid_tasks:
        logger.error("Invalid task: %s. Must be one of: %s", task, valid_tasks)
        return False

    # Validate and create output directory
    try:
        output_dir = Path(output_path).resolve()
        output_dir.mkdir(parents=True, exist_ok=True)
    except (OSError, ValueError) as e:
        logger.error("Invalid output path: %s", e)
        return False

    cmd = [
        mlxknife_path,
        "convert",
        "--model",
        hf_model,
        "--output",
        str(output_dir),
        "--task",
        task,
    ]

    logger.info("Converting %s to MLX format", hf_model)
    logger.debug("Command: %s", " ".join(cmd))

    # SECURITY: Use secure subprocess execution
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=False,  # Prevent shell injection
    )  # nosemgrep: semgrep.owasp-top-10-2021-a03-injection-command - command constructed from validated inputs
    assert process.stdout is not None  # for type checkers
    for line in process.stdout:
        print(line, end="")
    return_code = process.wait()
    if return_code != 0:
        logger.error("mlxknife conversion failed with exit code %s", return_code)
        return False
    logger.info("✅ Successfully converted %s to %s", hf_model, output_dir)
    return True


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert HuggingFace models to MLX format"
    )
    parser.add_argument("--hf", "--model", required=True, help="HuggingFace model name")
    parser.add_argument(
        "--out", "--output", required=True, help="Output directory for MLX model"
    )
    parser.add_argument(
        "--task",
        required=True,
        choices=["feature-extraction", "text-classification"],
        help="Task type for model conversion",
    )

    args = parser.parse_args()

    success = convert_model(args.hf, args.out, args.task)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    main()
def _run_allowlisted_command(command: Sequence[str], **kwargs) -> subprocess.CompletedProcess:
    """Execute a validated command to avoid injection."""

    if not command:
        raise RuntimeError("Empty command is not allowed")

    sanitized: list[str] = []
    for part in command:
        text = str(part)
        if any(token in text for token in ("|", "&", ";", "$", "`")):
            raise RuntimeError(f"Unsafe token in command part: {text}")
        sanitized.append(text)

    # nosemgrep: semgrep.owasp-top-10-2021-a03-injection-command - command arguments validated
    return subprocess.run(
        sanitized,
        shell=False,
        **kwargs,
    )
