# Models templates and safe-run

<div align="center">

[![CI](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml/badge.svg)](https://github.com/cortex-os/cortex-os/actions/workflows/ci.yml)
[![GitHub Issues](https://img.shields.io/github/issues/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/cortex-os/cortex-os)](https://github.com/cortex-os/cortex-os/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

This folder contains lightweight model cards used by agents and docs. To validate your local MLX setup without heavy downloads, use the safe runner:

Safe-run (tiny, quick):

```bash
python3 scripts/run_mlx_lm_sample_safe.py \
  --prompt "Say hi in one sentence" \
  --model mlx-community/Phi-3-mini-4k-instruct-4bit \
  --max-tokens 32 --temperature 0.7 --json-only
```

Environment variables (point to your ExternalSSD caches):

- `HF_HOME` or `TRANSFORMERS_CACHE` -> e.g. `/Volumes/ExternalSSD/huggingface_cache`
- `MLX_CACHE_DIR` -> e.g. `/Volumes/ExternalSSD/ai-cache`

Notes:

- Keep runs short (max-tokens <= 64) to minimize time/memory.
- Models listed in cards align with the MLX adapter/router where applicable.

Available model cards:

- smollm-135m-mlx.md
- gpt-oss-20b-mlx.md
- llamaguard-mlx.md
