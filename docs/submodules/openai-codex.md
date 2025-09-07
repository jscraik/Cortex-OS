# OpenAI Codex Submodule Overlay

This document mirrors the local (previously untracked) `README.CORTEX.md` that lived inside the submodule directory `external/openai-codex/`.
It is now tracked in the main repository so guidance survives fresh clones and CI contexts without modifying upstream contents.

> Upstream repository: <https://github.com/openai/codex>

## Purpose

- Examine implementation patterns (Rust + CLI + orchestration)
- Selectively copy small, self-contained snippets (with attribution) into appropriate governed packages
- Track upstream changes explicitly via submodule commit pointer

## DO / DO NOT

| ✅ Do | ❌ Do Not |
| ----- | --------- |
| Use for learning + reference | Import code directly across feature boundaries |
| Copy minimal, audited snippets | Depend on internal build scripts of the submodule |
| Attribute copied code in commit messages | Modify upstream code in-place here |
| Bump the submodule intentionally | Leave local dirty changes uncommitted |

## Updating

```bash
# Fetch latest upstream commits (without changing pointer)
cd external/openai-codex
git fetch origin

# List recent tags
git tag --sort=-creatordate | head

# Inspect changes
git log --oneline -n 10 origin/main

# Update to a specific commit or tag
git checkout <tag-or-commit>
cd -
# Stage the new submodule pointer
git add external/openai-codex
git commit -m "chore(submodule): bump openai-codex to <sha>"
```

## Removal (if ever needed)

See root `README.md` submodule section for canonical removal steps.

## Attribution Guidance

When copying a snippet:

1. Add a comment at top citing original file path + commit SHA
2. Preserve original license headers where required
3. Reference the upstream project in the commit message body

Example commit message body excerpt:

```text
Co-authored-by: Upstream Project Authors
Source: external/openai-codex/path/to/file.rs @ <sha>
Change: Adapted for Cortex-OS event bus abstraction
```

## License

Refer to upstream `LICENSE` and `NOTICE` files for third-party terms.

---
Maintained by the Cortex-OS architecture/governance team.
