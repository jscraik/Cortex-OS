# Devcontainer Local Memory Stack – brAInwav Dual-Mode Guide

## ✅ What this setup delivers

- Forces the Cortex-OS devcontainer to run with an `linux/amd64` root image so the Local Memory CLI binary works consistently.
- Mounts developer-provided secrets from `.secrets/local-memory` into the container at `/opt/brAInwav-secrets/local-memory`.
- Installs the `local-memory-mcp` CLI during the post-create lifecycle step when `CORTEX_DEV_FULL=1` (default in the devcontainer).
- Boots the Local Memory daemon automatically from the post-start script, targeting port `3028` in dual MCP + REST mode and wiring Qdrant on `http://qdrant:6333`.
- Ships a health check and log location (`/tmp/local-memory.log`) so you can confirm the service is actually running inside the container.

## 📦 Pre-requisites

| Requirement | Why it matters |
| --- | --- |
| Apple Silicon hosts must install Rosetta (`softwareupdate --install-rosetta --agree-to-license`) | Docker Desktop runs the AMD64 image through Rosetta; without it the container fails to start. |
| Docker Desktop ≥ 4.30 with *Use Rosetta for x86/64 emulation* enabled | Ensures the AMD64 image builds without kernel panics. |
| Local Memory license JSON (`license.json`) | Required for the CLI to start in dual mode; stored outside the repo. |
| Qdrant volume size ≥ 2 GB | The devcontainer starts Qdrant by default; ensure disk space for the `local_memory_data` volume. |

## 🗂️ Secrets layout (host side)

1. Create the host folder once:
   ```bash
   mkdir -p .secrets/local-memory
   ```
2. Drop your license into that directory (file name is flexible; `license.json` recommended).
3. The folder is git-ignored and mounted read-only into the container as `/opt/brAInwav-secrets/local-memory`.
4. During `postCreate`, secrets are copied into `$HOME/.local-memory` inside the container with restrictive permissions.

## 🚀 Lifecycle summary

| Phase | Script | What happens |
| --- | --- | --- |
| `onCreate` | `scripts/development/dev-setup-oncreate.sh` | Bootstrap guard rails (unchanged by this work). |
| `postCreate` | `scripts/development/dev-setup-postcreate.sh` | Installs `local-memory-mcp@latest` (if missing), syncs secrets, links agent-toolkit tools. |
| `postStart` | `scripts/development/dev-setup-poststart.sh` | Starts Local Memory in dual mode, optionally spins up Qdrant when `CORTEX_DEV_FULL=1`, runs health checks. |

### Key environment defaults

```bash
LOCAL_MEMORY_PORT=3028
LOCAL_MEMORY_MODE=dual
LOCAL_MEMORY_BASE_URL=http://localhost:3028/api/v1
MEMORIES_SHORT_STORE=local
MEMORIES_ADAPTER=local
QDRANT_URL=http://qdrant:6333
```

## 🔍 Verifying Local Memory inside the container

Once VS Code reports *Container ready*:

1. Open a terminal inside the container (`Ctrl+Shift+\``).
2. Confirm the process is alive:
   ```bash
   pgrep -f "local-memory start-server"
   ```
3. Check the health endpoint:
   ```bash
   curl -fsSL http://localhost:3028/api/v1/health | jq
   ```
4. Tail the startup log if the health check fails:
   ```bash
   tail -f /tmp/local-memory.log
   ```
5. Validate Qdrant connectivity (optional but recommended):
   ```bash
   curl -fsSL http://qdrant:6333/healthz | jq
   ```

If any of these commands fail, consult the troubleshooting section below and confirm your license file was copied into `$HOME/.local-memory`.

## 🔄 Rebuilding the devcontainer safely

```bash
# From VS Code Command Palette
Dev Containers: Rebuild and Reopen in Container
```

Rebuilds automatically:
- Applies the amd64 image constraint.
- Copies any updated secrets into the container.
- Reinstalls the CLI when the version changes (`LOCAL_MEMORY_CLI_VERSION` override supported).

## 🛠️ Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `cd: /opt/cortex-home: No such file or directory` when running scripts on the host | Lifecycle scripts expect container paths. | Run them from inside the devcontainer or set up a disposable test container. |
| `Local Memory binary not found` log | CLI install failed or license missing. | Re-run `pnpm dlx local-memory-mcp@latest doctor` inside the container; ensure NPM registry reachable. |
| Health endpoint returns 403 | License file was not copied or has wrong permissions. | Confirm secret lives in `.secrets/local-memory`, rebuild container, and verify `$HOME/.local-memory/*.json` exists with `chmod 600`. |
| Qdrant health check fails | Qdrant container still starting or port conflict on host. | Wait for Docker health check to settle; ensure host port 6333 is free. |

## 🧭 Observing the status quickly

```bash
# Inside the devcontainer
just scout "Local Memory" scripts/development
curl -fsSL http://localhost:3028/api/v1/stats | jq '.memories.count'
```

## 📚 Related references

- `.devcontainer/docker-compose.devcontainer.yml` – adds the amd64 platform pin, secrets mount, and persistent Local Memory volume.
- `scripts/development/dev-setup-postcreate.sh` – secret sync + CLI installation.
- `scripts/development/dev-setup-poststart.sh` – Local Memory bootstrap and health checks.
- `.secrets/README.md` – describes host-side secret expectations.

Maintaining brAInwav brand compliance: every lifecycle log path begins with `[brAInwav]` prefixes so operators see consistent messaging during container startup.
