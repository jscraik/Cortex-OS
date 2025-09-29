from __future__ import annotations

import getpass
import secrets
from pathlib import Path

CONFIG_DIR = Path("config")
KEY_FILE = CONFIG_DIR / "cortex-search.key"

CONFIG_DIR.mkdir(exist_ok=True)

if KEY_FILE.exists():
    print("Existing key:", KEY_FILE.read_text().strip())
else:
    token = secrets.token_urlsafe(32)
    KEY_FILE.write_text(token)
    KEY_FILE.chmod(0o600)
    print("Generated API key saved to", KEY_FILE)

print("Set these variables for MCP server:")
print("  export CORTEX_MCP_CORTEX_SEARCH_URL='http://127.0.0.1:3124/search'")
print("  export CORTEX_MCP_CORTEX_DOCUMENT_BASE_URL='http://127.0.0.1:3124/documents'")
print("  export CORTEX_MCP_CORTEX_SEARCH_API_KEY=$(cat config/cortex-search.key)")
