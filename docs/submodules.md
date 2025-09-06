# Submodules

This repository uses Git submodules to vendor external code while keeping a clear, pinned provenance.

## OpenAI Codex

Path: `external/openai-codex`
Remote: <https://github.com/openai/codex.git>

### Cloning With Submodules

Fresh clone including submodules:

```bash
git clone --recurse-submodules <repo-url>
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

### Pinning / Updating

We pin to a specific commit for reproducibility. To update:

```bash
# Enter the submodule directory
git -C external/openai-codex fetch origin
# Option A: Checkout a specific tag or branch
git -C external/openai-codex checkout <ref>
# Option B: Fast-forward to origin/main
git -C external/openai-codex checkout main && git -C external/openai-codex pull --ff-only
# Stage the new commit reference (the SHA lives in the parent repo index)
git add external/openai-codex
```

Then commit in the parent repo with a message, e.g.:

```bash
git commit -m "chore(submodule): bump openai-codex to <short-sha>"
```

### Shallow / Sparse Strategies (Optional)

If clone size becomes an issue you can convert to a shallow submodule clone:

```bash
git submodule deinit -f external/openai-codex
rm -rf .git/modules/external/openai-codex
rm -rf external/openai-codex
# Re-add shallow
GIT_SSH_COMMAND="ssh" git submodule add --depth 1 https://github.com/openai/codex.git external/openai-codex
```

(Depth pinning means you may need to fetch unshallow before moving to an older commit.)

### Removing the Submodule

```bash
git submodule deinit -f external/openai-codex
rm -rf .git/modules/external/openai-codex
rm -rf external/openai-codex
# Remove the entry from .gitmodules and stage changes
$EDITOR .gitmodules
git add .gitmodules
```

### CI Considerations

Ensure CI workflows either:

- Use `git clone --recurse-submodules`
- Or run `git submodule update --init --recursive` before build/test

### Security / License Review

Treat submodule updates like dependency bumps: review diff, licenses, and security advisories.

### Sync Helper

Use the provided Make target to initialize and update all submodules:

```bash
make submodules-sync
```

This performs:

1. `git submodule sync --recursive` (refresh URLs)
2. `git submodule update --init --recursive` (ensure checkout)
3. `git submodule update --remote --recursive` (attempt remote tracking update; non-fatal if pinned)

Comment out step 3 in the `Makefile` if you prefer strict commit pinning without auto-advancing remote tracking branches.

---

For questions about submodule policy, contact maintainers.
