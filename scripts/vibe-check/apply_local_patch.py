#!/usr/bin/env python3
"""Reapply local patches to @pv-bhat/vibe-check-mcp after reinstall."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def npm_root() -> Path:
    if 'VIBE_CHECK_GLOBAL_PREFIX' in os.environ:
        return Path(os.environ['VIBE_CHECK_GLOBAL_PREFIX']).expanduser()
    result = subprocess.run(['npm', 'root', '-g'], check=True, capture_output=True, text=True)
    return Path(result.stdout.strip()) / '@pv-bhat' / 'vibe-check-mcp'


def patch_cli(cli_path: Path) -> bool:
    text = cli_path.read_text()
    original = text
    if "brAInwav-vibe-check: CLI invoked" not in text:
        marker = "const cliDir = dirname(fileURLToPath(import.meta.url));"
        if marker not in text:
            raise RuntimeError('CLI patch failed: marker not found')
        text = text.replace(marker, "console.log('brAInwav-vibe-check: CLI invoked');\n" + marker, 1)
    if "brAInwav-vibe-check: starting server" not in text:
        old_block = "    await execa(process.execPath, [entrypoint], {\n        stdio: 'inherit',\n        env: spawnEnv,\n    });"
        new_block = "    console.log(`brAInwav-vibe-check: starting server (transport=${transport})`);\n    for (const [key, value] of Object.entries(spawnEnv)) {\n        if (value !== undefined) {\n            process.env[key] = value;\n        }\n    }\n    await import(pathToFileURL(entrypoint).href);\n    console.log('brAInwav-vibe-check: server initialised');\n    await new Promise(() => { });"
        if old_block not in text:
            raise RuntimeError('CLI patch failed: spawn block not found')
        text = text.replace(old_block, new_block, 1)
    if "realpathSync(" not in text:
        old_tail = "const executedFile = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;\nif (executedFile === import.meta.url) {"
        new_tail = "const executedPath = process.argv[1] ? realpathSync(process.argv[1]) : undefined;\nconst modulePath = fileURLToPath(import.meta.url);\nif (!process.argv[1] || executedPath === modulePath) {"
        if old_tail not in text:
            raise RuntimeError('CLI patch failed: execution guard not found')
        text = text.replace(old_tail, new_tail, 1)
    if "import { execa } from 'execa';\n" in text:
        text = text.replace("import { execa } from 'execa';\n", "")
    if text != original:
        cli_path.write_text(text)
        return True
    return False


def patch_llm(llm_path: Path) -> bool:
    text = llm_path.read_text()
    original = text
    if 'defaultHybridBaseUrl' not in text:
        anchor = "const openrouterBaseUrl = 'https://openrouter.ai/api/v1';\n"
        if anchor not in text:
            raise RuntimeError('LLM patch failed: openrouter anchor missing')
        addition = "const openrouterBaseUrl = 'https://openrouter.ai/api/v1';\nconst defaultHybridBaseUrl = 'http://127.0.0.1:8081';\nlet hybridCooldownUntil = 0;\n"
        text = text.replace(anchor, addition, 1)
    if 'function resolveHybridConfig' not in text:
        marker = "// Main dispatcher function to generate responses from the selected LLM provider\n"
        insert = "function resolveHybridConfig() {\n    if (process.env.VIBE_CHECK_DISABLE_HYBRID === 'true') {\n        return null;\n    }\n    const baseUrl = process.env.VIBE_CHECK_MODEL_GATEWAY_URL\n        || process.env.MODEL_GATEWAY_URL\n        || process.env.CORTEX_MODEL_GATEWAY_URL\n        || (process.env.VIBE_CHECK_ENABLE_HYBRID === 'false' ? '' : defaultHybridBaseUrl);\n    if (!baseUrl) {\n        return null;\n    }\n    const path = process.env.VIBE_CHECK_MODEL_GATEWAY_PATH || '/chat';\n    const timeout = Number(process.env.VIBE_CHECK_MODEL_GATEWAY_TIMEOUT\n        ?? process.env.MODEL_GATEWAY_TIMEOUT\n        ?? 5000);\n    const apiKey = process.env.VIBE_CHECK_MODEL_GATEWAY_API_KEY || process.env.MODEL_GATEWAY_API_KEY;\n    const model = process.env.VIBE_CHECK_MODEL_GATEWAY_MODEL || process.env.CORTEX_MODEL_GATEWAY_MODEL;\n    return { baseUrl, path, timeout, apiKey, model };\n}\nasync function maybeCallHybridGateway(params) {\n    const config = resolveHybridConfig();\n    if (!config) {\n        return null;\n    }\n    const now = Date.now();\n    if (hybridCooldownUntil and now < hybridCooldownUntil):\n        return None\n}
