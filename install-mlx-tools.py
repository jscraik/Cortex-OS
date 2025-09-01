#!/usr/bin/env python3
"""
Install MLX tools for model inference
Installs: mlx-lm, mlxknife, mlx-vlm (MLX-VL) and other MLX dependencies
"""

import os
import subprocess


def run_command(cmd, description):
    """Run a command and handle errors - Security: Use shell=False and split commands"""
    print(f"Installing {description}...")
    try:
        # Security: Split command to avoid shell injection
        if isinstance(cmd, str):
            import shlex

            cmd_list = shlex.split(cmd)
        else:
            cmd_list = cmd

        subprocess.run(
            cmd_list, shell=False, check=True, capture_output=True, text=True
        )
        print(f"✅ {description} installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install {description}: {e.stderr}")
        return False


def main():
    """Install MLX tools"""
    print("🚀 Installing MLX tools for model inference...")

    # Set environment variables for external SSD cache
    os.environ["HF_HOME"] = "/Volumes/ExternalSSD/huggingface_cache"
    os.environ["MLX_CACHE_DIR"] = "/Volumes/ExternalSSD/ai-cache"

    # List of MLX tools to install
    tools = [
        ("pip install mlx-lm", "MLX Language Models (mlx-lm)"),
        ("pip install mlx-vlm", "MLX Vision-Language Models (mlx-vlm)"),
        ("pip install transformers", "Hugging Face Transformers"),
        ("pip install torch", "PyTorch"),
        ("pip install numpy", "NumPy"),
        ("pip install sentencepiece", "SentencePiece tokenizer"),
        ("pip install accelerate", "Hugging Face Accelerate"),
        ("pip install datasets", "Hugging Face Datasets"),
    ]

    # Install mlx-knife from the correct GitHub repository
    mlxknife_installed = False
    print("Installing MLX-knife from correct GitHub repository...")
    if run_command(
        "pip install git+https://github.com/mzau/mlx-knife.git",
        "MLX-knife from mzau/mlx-knife",
    ):
        mlxknife_installed = True
    else:
        print("⚠️  MLX-knife installation failed, will use mlx-lm only")

    # Install main tools
    success_count = 0
    for cmd, desc in tools:
        if run_command(cmd, desc):
            success_count += 1

    print("\n📊 Installation Summary:")
    print(f"✅ Successfully installed: {success_count}/{len(tools)} tools")
    if mlxknife_installed:
        print("✅ MLXknife: Available")
    else:
        print("⚠️  MLXknife: Not available")

    # Test installations
    print("\n🧪 Testing installations...")

    test_commands = [
        (
            "python -c 'import mlx.core; print(\"MLX Core:\", mlx.core.__version__)'",
            "MLX Core",
        ),
        ("python -c 'import mlx_lm; print(\"MLX-LM: Available\")'", "MLX-LM"),
        ("python -c 'import mlx_vlm; print(\"MLX-VLM: Available\")'", "MLX-VLM"),
        (
            "python -c 'import transformers; print(\"Transformers:\", transformers.__version__)'",
            "Transformers",
        ),
    ]

    for cmd, name in test_commands:
        try:
            result = subprocess.run(
                cmd, shell=True, check=True, capture_output=True, text=True
            )
            print(f"✅ {name}: {result.stdout.strip()}")
        except subprocess.CalledProcessError:
            print(f"❌ {name}: Not working")

    print("\n🎉 MLX tools installation complete!")
    print("Cache directories:")
    print(f"  - HF_HOME: {os.environ.get('HF_HOME')}")
    print(f"  - MLX_CACHE_DIR: {os.environ.get('MLX_CACHE_DIR')}")


if __name__ == "__main__":
    main()
