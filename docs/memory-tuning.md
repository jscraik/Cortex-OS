# Workspace Memory Tuning Guide

> Status: ACTIVE (temporary mitigations)  
> L### Next Deep-Dive Options
- Take heap snapshots with `node --inspect` on the largest build process.
- Use `clinic flame` or `0x` (selectively) to ensure CPU-bound phases are not masking memory issues.
- Inspect watch counts: `lsof -p <pid> | wc -l` for suspect processes.

---

## Newly Added Hygiene Scripts (2025-09-13)

These scripts were introduced to rapidly curb runaway `pnpm` / Node process proliferation and enforce a soft memory ceiling during local workflows.

| Script / Command | Location | Purpose | Typical Use |
|------------------|----------|---------|-------------|
| `pnpm memory:budget` | `scripts/check-memory-budget.sh` | Validate current peak RSS vs. threshold (warn/fail) | Run before/after heavy operations |
| `pnpm install:budget` | wrapper + same script | Enforce memory budget around an install (pre & post snapshot) | Safer repeated install loops |
| `pnpm pnpm:orphan:kill` | `scripts/kill-orphan-pnpm.sh` | Terminate defunct pnpm / node processes exceeding age/grace | When Activity Monitor shows dozens of idle pnpm processes |
| `pnpm node:enforce-version` | `scripts/enforce-node-version.sh` | Ensure single major Node runtime (e.g., 20) | Before collaborative / agent runs |
| `pnpm process:snapshot` | `scripts/process-snapshot.sh` | Capture prioritized process table (Node/pnpm focused) | Baseline + compare after tasks |
| `pnpm dev:no-daemon` | env wrapper in `package.json` | Run Nx build smart mode with daemon disabled to avoid lingering watchers | Low-memory constrained dev cycle |

### Quick Triage Workflow (CLI)

```bash
# 1. Snapshot processes (pre)
pnpm process:snapshot

# 2. Kill obvious orphaned pnpm / node processes (idle, >15m age)
pnpm pnpm:orphan:kill

# 3. Enforce node version consistency
pnpm node:enforce-version

# 4. Execute a low‑overhead build without Nx daemon
pnpm dev:no-daemon

# 5. Check memory budget after build
pnpm memory:budget || echo 'Over budget – investigate'

# 6. (Optional) Run instrumented install cycle
pnpm install:budget

# 7. Snapshot processes (post) and diff
pnpm process:snapshot
diff <(ls -1t logs/process-snapshot-*.txt | head -2 | tail -1) \
     <(ls -1t logs/process-snapshot-*.txt | head -1) || true
```

### Budget Script Parameters
`scripts/check-memory-budget.sh <absoluteThresholdMB> <percentThreshold> [--pre|--post]`

Current defaults used in `package.json` examples: `32000 85` (treating physical 32GB with 85% pressure alert). Tune downward if you want earlier warnings (e.g., `24000 75`).

### Orphan Killer Logic Highlights
- Targets processes matching `(pnpm|node)` whose parent no longer exists OR exceed `--max-age` seconds.
- Grace period (`--grace`) allows inflight spawns to settle.
- Skips current shell / safety filtered by session TTY.

> NOTE: Use conservatively; if running long-lived local dev servers ensure they are excluded or under `--max-age`.

### Integration With Agents / CI
Agents SHOULD prefix invasive operations with:
1. `pnpm node:enforce-version`
2. `pnpm pnpm:orphan:kill`
3. Optional sampling run (see earlier sections)

CI can call `pnpm memory:budget` after strategic stages (post-install, post-build, post-test) and aggregate results as part of a governance gate.

### Future Hardening Ideas (Not Yet Implemented)
- Add a daemon health checker rejecting stale `.nx` daemon socket entries.
- Introduce a lightweight lock around `pnpm install` to prevent accidental parallel installs.
- Persist sampler peak summary to an artifact and plot rolling averages.

**Updated: 2025-09-13**

### Future Hardening Ideas (Not Yet Implemented)
- Add a daemon health checker rejecting stale `.nx` daemon socket entries.
- Introduce a lightweight lock around `pnpm install` to prevent accidental parallel installs.
- Persist sampler peak summary to an artifact and plot rolling averages.

````Updated: 2025-09-13

This document summarizes temporary memory–footprint mitigation changes applied to the repository and how to use / revert them.

## Overview
A set of lightweight adjustments were introduced to reduce peak RSS during `pnpm install` and Nx task execution while investigating a runaway memory issue.

| Area | Change | Intent | Rollback |
|------|--------|--------|----------|
| `pnpm-workspace.yaml` | `childConcurrency: 2` | Limit concurrent build script child processes during install | Remove key or raise value (default is dynamic) |
| `pnpm-workspace.yaml` | `useNodeVersion: 24.7.0` + `engineStrict: true` | Enforce single Node runtime to avoid duplicate language servers / watchers | Remove / relax; ensure `.nvmrc` or tooling consistency |
| `pnpm-workspace.yaml` | `ignoredOptionalDependencies: []` | Placeholder (explicitly empty) to communicate optional dep policy | Remove if undesired |
| `nx.json` | `parallel: 1`, `maxParallel: 1` | Prevent simultaneous high‑memory builds/tests | Restore previous values (2) or tune upward gradually |
| `.nxignore` | Added patterns for `dist`, `coverage`, logs, caches, temp, data, etc. | Reduce file hashing & watcher overhead | Remove lines selectively |
| `scripts/sample-memory.mjs` | New script | Provide consistent memory sampling facility | Delete file |

## Using the Memory Sampler
Sample memory for an install:
```bash
node scripts/sample-memory.mjs --tag install --interval 1500 --out .memory/install.jsonl -- pnpm install
```
Sample a build:
```bash
node scripts/sample-memory.mjs --tag build --interval 2000 --out .memory/build.jsonl -- pnpm nx run cortex-os:build
```
Self-sampling (no child command):
```bash
node scripts/sample-memory.mjs --interval 1000
```
Tail results:
```bash
tail -f .memory/install.jsonl | jq '.rssMB, .heapUsedMB'
```

Each JSONL record example:
```json
{
  "time": "2025-09-13T12:34:56.789Z",
  "pid": 12345,
  "tag": "install",
  "rssMB": 512.42,
  "heapUsedMB": 142.77,
  "externalMB": 8.13,
  "arrayBuffersMB": 1.02,
  "loadAvg": [2.15, 2.31, 2.08]
}
```

## Incremental Re-Tuning Strategy
1. Confirm baseline improvement (two consecutive full installs + typical task runs < target RSS threshold).
2. Increase Nx `parallel` to 2; re-measure.
3. If stable, consider removing `childConcurrency` (allow pnpm to autobalance) and compare.
4. Only then raise parallelism further or reintroduce optional dependencies if needed.

## Rollback Quick Steps
```bash
# Restore Nx parallelism
sed -i.bak 's/"parallel": 1/"parallel": 2/' nx.json
sed -i.bak 's/"maxParallel": 1/"maxParallel": 2/' nx.json

# Remove childConcurrency & engine enforcement (edit pnpm-workspace.yaml)
#   - delete lines: childConcurrency, useNodeVersion, engineStrict

# (Optional) prune .nxignore entries if they hide required inputs
```
Verify after rollback:
```bash
pnpm install
pnpm nx graph --focus cortex-os
```

## Diagnostic Tips
- If memory still climbs steadily, run one task at a time with sampler attached to isolate the offender.
- Use `NODE_OPTIONS="--max-old-space-size=2048"` only as a guardrail, not as a fix—identify leaks.
- Check for lingering watch processes: `ps -Ao pid,rss,command | grep node`.

## Next Investigation Candidates (if needed)
- Inspect large dependency postinstall scripts.
- Audit active language servers (TS/ESLint/Biome duplication).
- Profile a single long-running build with `--inspect` and Chrome DevTools heap snapshots.

---
Maintainer note: Remove this document once permanent resolution is in place and tuning no longer required.

---

## Agent & LLM Integration Guidance

Agents (automated assistants, batch jobs, LLM-driven refactors) MUST adhere to the following while mitigations are active:

### Do
- Use `@cortex-os/agent-toolkit` for multi-file searches (`multiSearch`) instead of raw recursive `grep` / `rg`.
- Attach the memory sampler to long-running install/build/test sequences.
- Emit a short summary line: `MEMORY_PEAK <tag> rssMB=<value>` after parsing JSONL for CI log scraping.
- Batch structural changes to avoid triggering multiple full Nx graph recalculations (prefer a single codemod + validate run).
- Respect current Nx serialization (`parallel:1`)—do not force parallel flags.

### Do Not
- Increase parallelism or remove `childConcurrency` without a before/after sampler diff.
- Spawn multiple overlapping installs; serialize `pnpm install` and graph-affecting tasks.
- Run redundant global `find` / `grep` passes—prefer toolkit contextual search.
- Cache large binary artefacts in the repo root (causes watcher churn and memory growth).

### Recommended Automation Pattern
Example wrapper (pseudocode) for an agent applying code changes:
```ts
const runWithSampling = async (tag, cmd) => {
  await exec(`node scripts/sample-memory.mjs --tag ${tag} --out .memory/${tag}.jsonl -- ${cmd}`);
  const peak = await parsePeak(`.memory/${tag}.jsonl`);
  console.log(`MEMORY_PEAK ${tag} rssMB=${peak}`);
};
await runWithSampling('install-pre-change', 'pnpm install');
// apply codemod
await runWithSampling('install-post-change', 'pnpm install');
```

### Cross-Link
Primary summary for developers: see **README section: "Memory Management & Agent Guidance"**.

---

## Changelog (Memory Mitigations)

| Date       | Change | Notes |
|------------|--------|-------|
| 2025-09-13 | Initial mitigation doc created | Added sampler + config tuning |
| 2025-09-13 | Agent guidance section added | Formalized Do / Do Not rules |

---

## Advanced Triage & Budget Enforcement

### Rapid Process Snapshot
Capture top Node / pnpm / tsserver processes:
```bash
scripts/process-snapshot.sh > .memory/process-snapshot-$(date +%s).txt
```
Columns include PID, RSS (MB), CPU %, elapsed time, command. Use diff between snapshots to detect runaway processes.

### Aggregating Peaks Across Runs
Summarize peak memory across sampler outputs:
```bash
node scripts/aggregate-memory-peaks.mjs .memory/*.jsonl | tee .memory/peaks-summary.txt
```
Add to a PR comment manually or automate via CI.

### Establishing a Soft Budget
1. Run two clean installs + key builds and record `TOTAL_MAX_RSS_MB`.
2. Set a soft budget = baseline * 1.35 (example).
3. Fail locally if exceeded:
```bash
MAX=1400 # MB
PEAK=$(node scripts/aggregate-memory-peaks.mjs .memory/install-*.jsonl | grep TOTAL_MAX_RSS_MB | cut -d= -f2)
awk -v p="$PEAK" -v m="$MAX" 'BEGIN{ if (p>m){ printf("Memory budget exceeded: %.2fMB > %dMB\n",p,m); exit 1 } else { printf("Memory within budget: %.2fMB <= %dMB\n",p,m); }}'
```

### Suggested CI Pattern (Pseudo)
```yaml
steps:
  - name: Sample install
    run: node scripts/sample-memory.mjs --tag ci-install --out .memory/ci-install.jsonl -- pnpm install
  - name: Aggregate
    run: node scripts/aggregate-memory-peaks.mjs .memory/ci-install.jsonl > .memory/ci-summary.txt
  - name: Enforce budget
    run: |
      PEAK=$(grep TOTAL_MAX_RSS_MB .memory/ci-summary.txt | cut -d= -f2)
      test "$(echo "$PEAK < 1500" | bc)" -eq 1 || (echo "Peak RSS $PEAK exceeded 1500MB" && exit 1)
```

### When to Escalate Further
- Peaks persistently growing despite unchanged dependency graph
- RSS remains high after process termination (indicates OS pressure / possible leak in long-lived daemon)
- Memory pressure triggers swap thrash (observe via Activity Monitor or `vm_stat`)

### Next Deep-Dive Options
- Take heap snapshots with `node --inspect` on the largest build process.
- Use `clinic flame` or `0x` (selectively) to ensure CPU-bound phases are not masking memory issues.
- Inspect watch counts: `lsof -p <pid> | wc -l` for suspect processes.
