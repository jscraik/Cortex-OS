#!/usr/bin/env python3
"""
Wrapper to convert HuggingFace models to MLX format using mlx-knife.
Supports both embedding models and cross-encoders for reranking.

Usage:
  python tools/model-convert/convert-to-mlx.py --hf microsoft/bge-base-en-v1.5 --out /Volumes/ExternalSSD/.cache/huggingface/models/mlx/bge-base-en-v1.5
  python tools/model-convert/convert-to-mlx.py --hf BAAI/bge-reranker-base --out /Volumes/ExternalSSD/.cache/huggingface/models/mlx/bge-reranker-base
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def check_mlxknife():
    """Check if mlx-knife is available."""
    try:
        mlxknife_path = shutil.which("mlxknife")
        if not mlxknife_path:
            return False
        result = subprocess.run(
            [mlxknife_path, "--version"], capture_output=True, text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def convert_model(hf_model: str, output_path: str):
    """Convert HuggingFace model to MLX format using mlx-knife."""

    if not check_mlxknife():
        print(
            "Error: mlx-knife not found. Install from https://github.com/mzau/mlx-knife.git"
        )
        sys.exit(1)

    output_dir = Path(output_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Build mlxknife command
    mlxknife_path = shutil.which("mlxknife")
    if not mlxknife_path:
        print("Error: mlx-knife not found in PATH")
        return False

    cmd = [mlxknife_path, "convert", "--model", hf_model, "--output", str(output_dir)]

    # Add model-specific flags if needed
    if "reranker" in hf_model.lower():
        cmd.extend(["--task", "text-classification"])
    elif "embed" in hf_model.lower() or "bge" in hf_model.lower():
        cmd.extend(["--task", "feature-extraction"])

    print(f"Converting {hf_model} to MLX format...")
    print(f"Command: {' '.join(cmd)}")

    try:
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"✅ Successfully converted {hf_model} to {output_dir}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error converting {hf_model}:")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Convert HuggingFace models to MLX format"
    )
    parser.add_argument("--hf", "--model", required=True, help="HuggingFace model name")
    parser.add_argument(
        "--out", "--output", required=True, help="Output directory for MLX model"
    )

    args = parser.parse_args()

    success = convert_model(args.hf, args.out)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
