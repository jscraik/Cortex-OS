# Streaming Modes (codex-cli)

The Rust `codex-cli` supports multiple streaming presentation modes for model output.

## Overview

| Mode      | Value       | Description                                                                                   | When to Use                                   |
| --------- | ----------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Auto      | `auto`      | Default; aggregates when provider returns only final messages, streams deltas when available. | General interactive usage.                    |
| Aggregate | `aggregate` | Force aggregation: suppress per-token deltas; only final assistant message printed once.      | Minimal output/logging.                       |
| Raw       | `raw`       | Per-token deltas are written as they arrive (unbuffered).                                     | Real‑time token visualization.                |
| JSON      | `json`      | Emits one JSON object per streaming event (`delta`, `item`, `completed`).                     | Programmatic consumption / piping into tools. |

## Selection & Precedence

`stream_mode` is resolved using **CLI > Env > Config > Default** precedence:

1. CLI flags: `--stream-mode <mode>` (preferred) or legacy `--json` / `--stream-json` > `--aggregate` > `--no-aggregate`
2. Environment variable: `CODEX_STREAM_MODE=auto|aggregate|raw|json`
3. Config file: `~/.codex/config.toml` (`stream_mode = "..."`)
4. Internal fallback: `auto`

**Note:** Legacy flags (--aggregate, --no-aggregate, --json, --stream-json) are deprecated and will show warnings.
Use the unified `--stream-mode` flag instead.

### Examples

```bash
# Default (auto)
codex chat "Hello?"

# Unified flag (preferred)
codex chat --stream-mode raw "Hello?"
codex chat --stream-mode aggregate "Hello?"
codex chat --stream-mode json "Explain streams" | jq '.type'

# Legacy flags (deprecated, show warnings)
codex chat --no-aggregate "Hello?"    # warns: use --stream-mode raw
codex chat --aggregate "Hello?"       # warns: use --stream-mode aggregate
codex chat --json "Explain streams"   # warns: use --stream-mode json

# Via env var (overrides config, overridden by CLI)
CODEX_STREAM_MODE=raw codex chat "Hi"

# config.toml (~/.codex/config.toml)
stream_mode = "aggregate"
```

## JSON Line Format

Each line is a compact JSON object (NDJSON). See the full schema at [`contracts/streaming-events.schema.json`](../contracts/streaming-events.schema.json).

```jsonl
{"type":"delta","delta":"Hel"}
{"type":"delta","delta":"lo"}
{"type":"item","item":{"Message":{"id":null,"role":"assistant","content":[{"OutputText":{"text":"Hello"}}]}}}
{"type":"completed"}
```

Fields:

- `type`: one of `delta`, `item`, `completed`
- `delta`: partial token text (present for `delta`)
- `item`: full `ResponseItem` (present for `item`)

## Backward Compatibility

Legacy flags (`--no-aggregate`, `--aggregate`, `--json`, `--stream-json`) still work but emit deprecation warnings.
The new unified `--stream-mode` flag is preferred and mutually exclusive with legacy flags.

## Notes

- In aggregated modes the core client may suppress token deltas and only emit a final message;
  the CLI prints the final assistant content once to preserve UX.
- JSON mode intentionally does not print a trailing newline after every delta to avoid
  surprising consumers; only `completed` events guarantee a newline flush.
- The unified `--stream-mode` flag prevents accidental flag combinations and provides clearer intent.

## Automation Examples

### jq Filtering

Extract only final item events (assistant messages):

```bash
codex chat --stream-mode json "Explain Rust ownership" \
  | jq -c 'select(.type=="item")'
```

Stream just the token deltas for a live progress bar:

```bash
codex chat --stream-mode json "Summarize the solar wind" \
  | jq -r 'select(.type=="delta") | .delta' \
  | tr -d '\n'; echo
```

Collect the final assembled text (joining deltas) using `awk`:

```bash
codex chat --stream-mode json "Write a haiku about streams" \
  | awk -F'"' '/"type":"delta"/ {for(i=1;i<=NF;i++) if($i=="delta"){print $(i+2)}}' | tr -d '\n'; echo
```

### Python Incremental Ingestion

```python
import json, subprocess

proc = subprocess.Popen(
    ["codex", "chat", "--stream-mode", "json", "Outline a test strategy"],
    stdout=subprocess.PIPE,
    text=True,
)

assembled = []
for line in proc.stdout:  # NDJSON stream
    line = line.strip()
    if not line:
        continue
    ev = json.loads(line)
    t = ev.get("type")
    if t == "delta":
        assembled.append(ev.get("delta", ""))
    elif t == "item":
        # Optionally inspect full structured item
        pass
    elif t == "completed":
        break

full_text = ''.join(assembled)
print("FINAL:\n" + full_text)
```

### Bash Function Wrapper

Reusable helper to capture final JSON result into a variable (accumulating deltas):

```bash
codex_json_run() {
  local prompt="$*"; local out="";
  while IFS= read -r line; do
    [[ -z $line ]] && continue
    case "$line" in
      *'"type":"delta"'*) out+=$(printf '%s' "$line" | sed -E 's/.*"delta":"([^"\\]*(\\.[^"\\]*)*)".*/\1/' | sed 's/\\n/\n/g');;
      *'"type":"completed"'*) break;;
    esac
  done < <(codex chat --stream-mode json "$prompt")
  printf '%s' "$out"
}

codex_json_run "Give me a motivational one-liner"
```

## Troubleshooting

| Scenario                     | Symptom                  | Cause                              | Resolution                                                              |
| ---------------------------- | ------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| No output until end          | Only final line appears  | Provider sent only a final chunk   | Expected; use `--stream-mode raw` if provider actually supports deltas. |
| Want machine-readable events | Need structure           | Plain text mode prints token chars | Use `--stream-mode json`.                                               |
| Env var ignored              | CLI flag active          | Precedence order                   | Remove CLI flag or rely solely on `CODEX_STREAM_MODE`.                  |
| High CPU / noisy logs        | Many tiny token prints   | Raw mode printing each delta       | Switch to `--stream-mode aggregate`.                                    |
| Piped output buffered oddly  | Delays before appearance | OS pipe buffering                  | Prefer `--stream-mode json` for deterministic line buffering.           |
| Mixed flags error            | Clap rejects combination | Mutually exclusive flags           | Use unified `--stream-mode` flag instead of legacy flags.               |
| Deprecation warnings         | Warning messages shown   | Using legacy flags                 | Switch to `--stream-mode <mode>` or set `CODEX_STREAM_MODE` env var.    |

### TTY vs Pipe Behavior

When stdout is a TTY, raw token mode (`raw` / `--stream-mode raw`) prints tokens immediately.
When piping (e.g., `| jq`) the OS or downstream tool may buffer output; `--stream-mode json` provides
clear line boundaries.

### Schema Validation

The JSON events conform to the schema defined in [`contracts/streaming-events.schema.json`](../contracts/streaming-events.schema.json).
Use this for:

- Generating type definitions in other languages
- Validating streaming output in tests
- Understanding the complete event structure

## Future Extensions

- Potential richer event metadata (timestamps, token indices)
- Backpressure-aware "/progress" events
- Optional final summary object with token counts
- Migration to remove legacy flags entirely

---

_Last updated: 2025-09-06._
