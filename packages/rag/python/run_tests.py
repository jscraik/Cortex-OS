#!/usr/bin/env python3
"""
Test runner for REF‑RAG MLX generation tests

This script runs pytest tests for the MLX generation functionality
without requiring MLX dependencies (uses mocking for testing).
"""

import os
import sys
import subprocess
import importlib.util
from pathlib import Path


def check_dependencies():
    """Check if testing dependencies are available."""
    try:
        import pytest
        print("✓ pytest is available")
        return True
    except ImportError:
        print("✗ pytest is not available. Install with: pip install pytest")
        return False


def run_tests():
    """Run the test suite."""
    # Get the directory containing this script
    script_dir = Path(__file__).parent
    test_file = script_dir / "test_mlx_generate.py"

    if not test_file.exists():
        print(f"✗ Test file not found: {test_file}")
        return False

    print("Running REF‑RAG MLX generation tests...")
    print("=" * 50)

    # Run pytest with specific options
    cmd = [
        sys.executable, "-m", "pytest",
        str(test_file),
        "-v",  # Verbose output
        "-x",  # Stop on first failure
        "--tb=short",  # Short traceback format
        "--color=yes"  # Colored output
    ]

    try:
        result = subprocess.run(cmd, cwd=script_dir, capture_output=True, text=True)

        if result.stdout:
            print(result.stdout)

        if result.stderr:
            print("STDERR:")
            print(result.stderr)

        if result.returncode == 0:
            print("=" * 50)
            print("✓ All tests passed!")
            return True
        else:
            print("=" * 50)
            print(f"✗ Tests failed with exit code: {result.returncode}")
            return False

    except Exception as e:
        print(f"✗ Error running tests: {e}")
        return False


def run_individual_test_function(test_function_name):
    """Run a specific test function directly."""
    script_dir = Path(__file__).parent
    test_file = script_dir / "test_mlx_generate.py"

    # Import the test module
    spec = importlib.util.spec_from_file_location("test_mlx_generate", test_file)
    test_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(test_module)

    # Find and run the test function
    if hasattr(test_module, test_function_name):
        test_func = getattr(test_module, test_function_name)
        print(f"Running {test_function_name}...")
        try:
            test_func()
            print(f"✓ {test_function_name} passed")
            return True
        except Exception as e:
            print(f"✗ {test_function_name} failed: {e}")
            return False
    else:
        print(f"✗ Test function '{test_function_name}' not found")
        return False


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        # Run specific test function
        test_function = sys.argv[1]
        success = run_individual_test_function(test_function)
        sys.exit(0 if success else 1)
    else:
        # Run all tests
        if not check_dependencies():
            sys.exit(1)

        success = run_tests()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()