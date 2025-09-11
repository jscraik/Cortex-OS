# Contributor Setup

1. Clone the repository and navigate to the package:
   ```bash
   git clone https://github.com/cortexso/Cortex-OS.git
   cd Cortex-OS/packages/mcp-bridge
   ```
2. Create a virtual environment and install dev deps:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -e .[dev]
   ```
3. Run tests:
   ```bash
   pytest
   ```
