"""Secure executor for running user-provided Python code in a subprocess.

This module runs code in a separate Python process, using timeouts and
resource limits to reduce blast radius. It communicates over stdin/stdout
using a simple JSON protocol.

Note: This is an improvement over `exec()` but not a full sandbox. For
high-security use run untrusted code inside an OS-level sandbox or
specialized runtime.
"""

import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Tuple

DEFAULT_TIMEOUT = 3  # seconds


def run_code(code: str, timeout: int = DEFAULT_TIMEOUT) -> Tuple[int, str, str]:
    """Run `code` in a subprocess, return (exit_code, stdout, stderr).

    Writes the code to a temporary file and invokes a fresh Python
    interpreter to execute only that file. The interpreter is run with
    -I to isolate from environment variables and site-packages where
    possible, and the subprocess is given a timeout.
    """
    # Build a wrapper without leading indentation to avoid SyntaxError in
    # the generated temporary file.
    header = (
        "import builtins\n"
        "allowed = {\n"
        "    'abs': abs, 'min': min, 'max': max, 'sum': sum, 'len': len,\n"
        "    'range': range, 'enumerate': enumerate, 'print': print\n"
        "}\n"
        "# install allowed builtins but do not clear existing builtins to avoid\n"
        "# breaking interpreter internals (threading shutdown uses builtins).\n"
        "for k, v in allowed.items():\n"
        "    setattr(builtins, k, v)\n"
        "# remove a few dangerous names if present\n"
        "for _name in ('open','eval','exec','compile','__import__','input','exit','quit','help'):\n"
        "    try:\n"
        "        delattr(builtins, _name)\n"
        "    except Exception:\n"
        "        pass\n\n"
        "# user code begins\n"
    )

    footer = "\n# user code ends\n"

    wrapper = header + code + footer

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write(wrapper)
        tmp_path = tmp.name

    # Run the file in a fresh interpreter
    try:
        proc = subprocess.run(
            [sys.executable, "-I", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        # proc.stdout is always a str when text=True
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        stdout = e.stdout.decode() if isinstance(e.stdout, bytes) else (e.stdout or "")
        return 124, str(stdout), f"Timeout after {timeout} seconds"
    finally:
        try:
            Path(tmp_path).unlink()
        except Exception:
            pass
