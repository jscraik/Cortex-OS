#!/usr/bin/env bash
set -euo pipefail
# test-sync-summary.sh
# Lightweight validation for scripts/sync-cortex-code.sh summary generation.
# Strategy:
#  - Create a temporary fake upstream repo with a minimal codex-rs layout containing two crates
#  - Run sync script pointing UPSTREAM_REPO_URL to that repo, dry-run first (expect no summary file)
#  - Run real sync, expect SYNC_CRATE_SUMMARY.json with required keys and non-empty upstreamCommit
#  - Modify one crate's Cargo.toml & add another crate upstream, re-run sync and assert modified/added arrays update
# Requirements: git, jq, rsync

RED="\033[31m"; GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"
info(){ echo -e "${YELLOW}[test-sync-summary]${RESET} $*"; }
ok(){ echo -e "${GREEN}[PASS]${RESET} $*"; }
fail(){ echo -e "${RED}[FAIL]${RESET} $*" >&2; exit 1; }

ROOT_DIR=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$ROOT_DIR"
SCRIPT="scripts/sync-cortex-code.sh"
[[ -x $SCRIPT ]] || fail "Sync script not found or not executable"

WORKDIR=".cache/test-sync-summary"
rm -rf "$WORKDIR" && mkdir -p "$WORKDIR"
UPSTREAM_REPO="$WORKDIR/upstream"
mkdir -p "$UPSTREAM_REPO/codex-rs"

# Create two tiny crates
mkdir -p "$UPSTREAM_REPO/codex-rs/crate_a/src" "$UPSTREAM_REPO/codex-rs/crate_b/src"
cat > "$UPSTREAM_REPO/codex-rs/crate_a/Cargo.toml" <<'EOF'
[package]
name = "crate_a"
version = "0.1.0"
edition = "2021"

[dependencies]
EOF
cat > "$UPSTREAM_REPO/codex-rs/crate_a/src/lib.rs" <<'EOF'
pub fn a() -> u32 { 1 }
EOF
cat > "$UPSTREAM_REPO/codex-rs/crate_b/Cargo.toml" <<'EOF'
[package]
name = "crate_b"
version = "0.1.0"
edition = "2021"

[dependencies]
EOF
cat > "$UPSTREAM_REPO/codex-rs/crate_b/src/lib.rs" <<'EOF'
pub fn b() -> u32 { 2 }
EOF

pushd "$UPSTREAM_REPO" >/dev/null
  git init -q
  git add .
  git commit -m "init upstream" -q
  UPSTREAM_HEAD1=$(git rev-parse HEAD)
popd >/dev/null

export UPSTREAM_REPO_URL="file://$(pwd)/$UPSTREAM_REPO"
export UPSTREAM_SUBDIR="codex-rs"
export LOCAL_PREFIX="apps/cortex-code"

info "Running initial real sync"
# Need a clean tree: ensure target dir exists
mkdir -p "$LOCAL_PREFIX"

bash "$SCRIPT" --run --force > "$WORKDIR/run1.log" 2>&1 || fail "Initial sync failed"
[[ -f SYNC_CRATE_SUMMARY.json ]] || fail "Summary file missing after initial sync"

required_keys=(upstreamCommit previousUpstream added removed modified locAdded locDeleted filesChanged generatedAt)
for k in "${required_keys[@]}"; do
  jq -e ". | has(\"$k\")" SYNC_CRATE_SUMMARY.json > /dev/null || fail "Missing key $k in summary"
done

count_added=$(jq '.added|length' SYNC_CRATE_SUMMARY.json)
(( count_added == 2 )) || fail "Expected 2 added crates initially, got $count_added"
# No versionChanges expected on initial import
vc_initial=$(jq '.versionChanges|length' SYNC_CRATE_SUMMARY.json)
(( vc_initial == 0 )) || fail "Expected 0 versionChanges initially, got $vc_initial"
ok "Initial sync summary validated"

# Modify crate_a and add crate_c upstream
pushd "$UPSTREAM_REPO" >/dev/null
  echo "pub fn a2() -> u32 { 10 }" >> codex-rs/crate_a/src/lib.rs
  # bump crate_a version to trigger versionChanges entry
  sed -i.bak 's/version = "0.1.0"/version = "0.2.0"/' codex-rs/crate_a/Cargo.toml && rm codex-rs/crate_a/Cargo.toml.bak
  mkdir -p codex-rs/crate_c/src
  cat > codex-rs/crate_c/Cargo.toml <<'EOF'
[package]
name = "crate_c"
version = "0.1.0"
edition = "2021"

[dependencies]
EOF
  echo "pub fn c() -> u32 { 3 }" > codex-rs/crate_c/src/lib.rs
  git add .
  git commit -m "modify a add c" -q
  UPSTREAM_HEAD2=$(git rev-parse HEAD)
popd >/dev/null

info "Running second sync"
# Force so we don't require manual commit of first run changes outside scope
bash "$SCRIPT" --run --force > "$WORKDIR/run2.log" 2>&1 || fail "Second sync failed"

jq -e '.upstreamCommit == "'$UPSTREAM_HEAD2'"' SYNC_CRATE_SUMMARY.json >/dev/null || fail "Upstream commit not updated"
count_added2=$(jq '.added|length' SYNC_CRATE_SUMMARY.json)
count_modified2=$(jq '.modified|length' SYNC_CRATE_SUMMARY.json)
(( count_added2 >= 1 )) || fail "Expected at least 1 added crate second run, got $count_added2"
(( count_modified2 >= 1 )) || fail "Expected at least 1 modified crate second run, got $count_modified2"
# versionChanges should include crate_a with bumpType minor
vc2=$(jq '.versionChanges|length' SYNC_CRATE_SUMMARY.json)
(( vc2 >= 1 )) || fail "Expected at least one versionChanges entry"
minor_match=$(jq -r '.versionChanges[] | select(.crate=="crate_a") | .bumpType' SYNC_CRATE_SUMMARY.json || true)
[[ "$minor_match" == "minor" || "$minor_match" == "patch" ]] || fail "Expected bumpType minor (or patch fallback) for crate_a got $minor_match"

# Simulate license file changes upstream
pushd "$UPSTREAM_REPO" >/dev/null
  echo "License A" > codex-rs/crate_a/LICENSE
  git add codex-rs/crate_a/LICENSE
  git commit -m "add license file" -q
  UPSTREAM_HEAD3=$(git rev-parse HEAD)
popd >/dev/null

bash "$SCRIPT" --run --force > "$WORKDIR/run3.log" 2>&1 || fail "Third sync failed"
jq -e '.licenseChanges.added|length >= 1' SYNC_CRATE_SUMMARY.json >/dev/null || fail "Expected at least one added license file"

info "Testing advanced features"

# Test dependency analysis
bash "$SCRIPT" --run --force --dependency-analysis > "$WORKDIR/run4.log" 2>&1 || fail "Dependency analysis sync failed"
jq -e '.dependencyAnalysis | has("riskScores") and has("totalDependencies")' SYNC_CRATE_SUMMARY.json >/dev/null || fail "dependencyAnalysis shape invalid"
jq -e '.dependencyAnalysis.riskScores | type == "array"' SYNC_CRATE_SUMMARY.json >/dev/null || fail "riskScores must be array"
ok "Dependency analysis validated"

# Test SPDX SBOM export
bash "$SCRIPT" --run --force --spdx-sbom > "$WORKDIR/run5.log" 2>&1 || fail "SPDX SBOM sync failed"
jq -e '.spdxSbomFile | type == "string"' SYNC_CRATE_SUMMARY.json >/dev/null || fail "spdxSbomFile must be string"
spdx_file=$(jq -r '.spdxSbomFile' SYNC_CRATE_SUMMARY.json)
[[ -f "$spdx_file" ]] || fail "SPDX SBOM file not found: $spdx_file"
jq -e '.SPDXID and .spdxVersion and .creationInfo' "$spdx_file" >/dev/null || fail "Invalid SPDX SBOM structure"
ok "SPDX SBOM export validated"

# Test version gating with downgrade (should fail without --allow-downgrades)
pushd "$UPSTREAM_REPO" >/dev/null
  # Downgrade crate_a version to trigger gating
  sed -i.bak 's/version = "0.2.0"/version = "0.1.5"/' codex-rs/crate_a/Cargo.toml && rm codex-rs/crate_a/Cargo.toml.bak
  git add .
  git commit -m "downgrade crate_a" -q
popd >/dev/null

# This should fail due to downgrade
if bash "$SCRIPT" --run --force --strict-version-gating > "$WORKDIR/run6.log" 2>&1; then
  fail "Expected strict version gating to fail on downgrade"
fi
ok "Version gating correctly blocked downgrade"

# This should succeed with bypass
bash "$SCRIPT" --run --force --strict-version-gating --allow-downgrades --bypass-reason "test downgrade" > "$WORKDIR/run7.log" 2>&1 || fail "Version gating with bypass failed"
jq -e '.versionGating | has("violations") and has("bypassReasons")' SYNC_CRATE_SUMMARY.json >/dev/null || fail "versionGating shape invalid"
ok "Version gating with bypass validated"

ok "Second sync summary validated"

info "Test complete"
