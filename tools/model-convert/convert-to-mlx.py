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

logger = logging.getLogger(__name__)


def get_mlxknife_path() -> str:
    """Return path to mlxknife if available, else raise error."""
    mlxknife_path = shutil.which("mlxknife")
    if not mlxknife_path:
        raise FileNotFoundError(
            "mlxknife not found. Install from https://github.com/mzau/mlx-knife.git"
        )
    result = subprocess.run(
        [mlxknife_path, "--version"], capture_output=True, text=True
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

    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)

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

    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
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
