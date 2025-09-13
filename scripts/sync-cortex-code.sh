#!/usr/bin/env bash
# shellcheck shell=bash
# shellcheck disable=SC2155,SC2145,SC2001,SC2046,SC2034
set -euo pipefail

# sync-cortex-code.sh
#
# Purpose: Vendor (adopt) the upstream openai/codex Rust subdirectory into apps/cortex-code/
# without using git subtree (upstream is a monorepo). Creates a branch & commit only if changes.
#
# Features:
#  - Clean working tree enforcement (unless --force)
#  - Dry-run mode (default) shows planned actions
#  - Records upstream remote commit hash in commit message & UPSTREAM_REF file
#  - Optional .syncignore patterns to exclude files
#
# Usage:
#   scripts/sync-cortex-code.sh --run              # perform real sync (not dry run)
#   scripts/sync-cortex-code.sh --run --force      # allow dirty tree
#   scripts/sync-cortex-code.sh --branch sync/cortex-code-<hash>
#   scripts/sync-cortex-code.sh --upstream-ref <commit>
#
# Environment (overridable):
#   UPSTREAM_REPO_URL (default https://github.com/openai/codex.git)
#   UPSTREAM_SUBDIR   (default codex-rs)   # path inside upstream monorepo containing Rust crates
#   LOCAL_PREFIX      (default apps/cortex-code)
#   WORK_DIR          (default .cache/cortex-code-sync/tmp)
#
# Exit codes:
#   0 - success / no changes
#   2 - dirty tree (without --force)
#   3 - upstream subdir missing

DRY_RUN=1
FORCE=0
CUSTOM_BRANCH=""
UPSTREAM_REF_OVERRIDE=""
IGNORE_UNMERGED=0
SUMMARY_OUTPUT="SYNC_CRATE_SUMMARY.json"
PRINT_CHANGED=0
ANALYZE_VERSIONS=0
DETECT_LICENSE_CHANGES=0
SPLIT_COMMITS=${SPLIT_COMMITS:-1} # set to 0 to disable grouped commit splitting
GENERATE_SBOM_DELTA=0
SBOM_DELTA_FILE="SBOM_DELTA.json"
GENERATE_DEPENDENCY_ANALYSIS=1  # enabled by default
GENERATE_SPDX_SBOM=0
SPDX_SBOM_FILE="apps/cortex-code/SPDX_SBOM.json"
STRICT_VERSION_GATING=0
ALLOW_DOWNGRADES=0
BYPASS_REASONS=()

previous_ref_file="UPSTREAM_REF"
previous_upstream_ref=""
[[ -f "$previous_ref_file" ]] && previous_upstream_ref="$(cat "$previous_ref_file" 2>/dev/null || true)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run) DRY_RUN=0; shift ;;
    --force) FORCE=1; shift ;;
    --branch) CUSTOM_BRANCH="$2"; shift 2 ;;
    --upstream-ref) UPSTREAM_REF_OVERRIDE="$2"; shift 2 ;;
    --ignore-unmerged) IGNORE_UNMERGED=1; shift ;;
    --summary-output) SUMMARY_OUTPUT="$2"; shift 2 ;;
    --print-changed-crates) PRINT_CHANGED=1; shift ;;
    --analyze-versions) ANALYZE_VERSIONS=1; shift ;;
    --detect-license-changes) DETECT_LICENSE_CHANGES=1; shift ;;
    --generate-sbom-delta) GENERATE_SBOM_DELTA=1; shift ;;
    --spdx-sbom) GENERATE_SPDX_SBOM=1; shift ;;
    --dependency-analysis) GENERATE_DEPENDENCY_ANALYSIS=1; shift ;;
    --no-dependency-analysis) GENERATE_DEPENDENCY_ANALYSIS=0; shift ;;
    --strict-version-gating) STRICT_VERSION_GATING=1; shift ;;
    --allow-downgrades) ALLOW_DOWNGRADES=1; shift ;;
    --bypass-reason) BYPASS_REASONS+=("$2"); shift 2 ;;
    --help|-h)
      sed -n '1,120p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

UPSTREAM_REPO_URL="${UPSTREAM_REPO_URL:-https://github.com/openai/codex.git}"
UPSTREAM_SUBDIR="${UPSTREAM_SUBDIR:-codex-rs}" # adjust if true upstream subdir differs
LOCAL_PREFIX="${LOCAL_PREFIX:-apps/cortex-code}"
WORK_DIR="${WORK_DIR:-.cache/cortex-code-sync/tmp}";
SYNC_CACHE_ROOT="$(dirname "$WORK_DIR")"
SYNC_IGNORE_FILE="$LOCAL_PREFIX/.syncignore"

log(){ echo "[sync-cortex-code] $*"; }
die(){ echo "[sync-cortex-code][ERROR] $*" >&2; exit "${2:-1}"; }

if [[ $FORCE -eq 0 ]]; then
  if [[ -n $(git status --porcelain) ]]; then
    die "Working tree not clean. Commit or stash changes or use --force" 2
  fi
fi

# Guard: detect other local branches that modified vendored path but not merged
if [[ $IGNORE_UNMERGED -eq 0 ]]; then
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  mapfile -t local_branches < <(git for-each-ref --format='%(refname:short)' refs/heads/)
  conflict_branches=()
  for b in "${local_branches[@]}"; do
    [[ "$b" == "$current_branch" ]] && continue
    # list files changed in branch vs its merge base with main (fallback to origin/main)
    base_ref="origin/main"
    if git show-ref --verify --quiet refs/heads/main; then base_ref="main"; fi
    merge_base=$(git merge-base "$b" "$base_ref" 2>/dev/null || true)
    [[ -z "$merge_base" ]] && continue
    if git diff --name-only "$merge_base" "$b" -- | grep -q "^${LOCAL_PREFIX}/"; then
      # is branch merged? if not (no ancestor relationship), flag
      if ! git branch --merged | grep -q "^  $b$"; then
        conflict_branches+=("$b")
      fi
    fi
  done
  if (( ${#conflict_branches[@]} > 0 )); then
    echo "Unmerged local branches touch ${LOCAL_PREFIX}: ${conflict_branches[*]}" >&2
    echo "Use --ignore-unmerged to bypass or merge/rebase those branches first." >&2
    exit 4
  fi
fi

mkdir -p "$WORK_DIR"

if [[ ! -d "$WORK_DIR/.git" ]]; then
  log "Cloning upstream (shallow) $UPSTREAM_REPO_URL"
  git clone --depth=1 "$UPSTREAM_REPO_URL" "$WORK_DIR" >/dev/null 2>&1 || die "Clone failed" 1
else
  (cd "$WORK_DIR" && git fetch --depth=1 origin HEAD >/dev/null 2>&1)
fi

cd "$WORK_DIR"
UPSTREAM_HEAD_COMMIT=$(git rev-parse HEAD)
cd - >/dev/null

if [[ -n "$UPSTREAM_REF_OVERRIDE" ]]; then
  UPSTREAM_HEAD_COMMIT="$UPSTREAM_REF_OVERRIDE"
fi

if [[ ! -d "$WORK_DIR/$UPSTREAM_SUBDIR" ]]; then
  die "Upstream subdir '$UPSTREAM_SUBDIR' not found in repo root. Adjust UPSTREAM_SUBDIR." 3
fi

TMP_STAGE="${SYNC_CACHE_ROOT}/stage"
rm -rf "$TMP_STAGE" && mkdir -p "$TMP_STAGE"

rsync_args=( -a --delete )
if [[ -f "$SYNC_IGNORE_FILE" ]]; then
  while IFS= read -r pattern; do
    [[ -z "$pattern" || "$pattern" =~ ^# ]] && continue
    rsync_args+=( --exclude="$pattern" )
  done < "$SYNC_IGNORE_FILE"
fi

log "Staging upstream subdir copy (commit $UPSTREAM_HEAD_COMMIT)"
rsync "${rsync_args[@]}" "$WORK_DIR/$UPSTREAM_SUBDIR/" "$TMP_STAGE/" >/dev/null

# Detect diff vs current
DIFF_OUTPUT=$(diff -qr "$TMP_STAGE" "$LOCAL_PREFIX" || true)
if [[ -z "$DIFF_OUTPUT" ]]; then
  log "No changes vs upstream commit $UPSTREAM_HEAD_COMMIT"
  exit 0
fi

log "Changes detected. Preparing vendor update.";
if [[ $DRY_RUN -eq 1 ]]; then
  echo "--- DRY RUN: differences (first 200 lines) ---"
  diff -urN "$LOCAL_PREFIX" "$TMP_STAGE" | sed 's/^/| /' | head -n 200 || true
  echo "(truncated if large)"
  log "Run again with --run to apply."
  exit 0
fi

log "Applying changes into $LOCAL_PREFIX";

# Capture pre-change file list for LOC metrics (git diff will be done after staging changes)
pre_sync_tree_snapshot_file="${SYNC_CACHE_ROOT}/pre-sync-file-list.txt"
git ls-files "$LOCAL_PREFIX" > "$pre_sync_tree_snapshot_file" || true

rsync "${rsync_args[@]}" "$TMP_STAGE/" "$LOCAL_PREFIX/" >/dev/null

echo "$UPSTREAM_HEAD_COMMIT" > UPSTREAM_REF

# -------- Crate Change Summary --------
summary_tmp="${SYNC_CACHE_ROOT}/crate-summary"
rm -rf "$summary_tmp" && mkdir -p "$summary_tmp"

# collect Cargo.toml files before and after (we still have TMP_STAGE for new upstream snapshot)
find "$TMP_STAGE" -name Cargo.toml -maxdepth 4 > "$summary_tmp/new.list"
find "$LOCAL_PREFIX" -name Cargo.toml -maxdepth 4 > "$summary_tmp/local.list"

normalize(){ sed -n 's/^name *= *"\(.*\)".*/\1/p' "$1" | head -n1; }
extract_version(){ sed -n 's/^version *= *"\(.*\)".*/\1/p' "$1" | head -n1; }

# Dependency analysis functions
parse_dependencies(){
  local cargo_toml="$1"
  # Extract dependencies section, ignore dev-dependencies and build-dependencies
  awk '/^\[dependencies\]/{flag=1;next}/^\[/{flag=0}flag && /^[a-zA-Z]/ {gsub(/[ ="{}].*/, ""); print}' "$cargo_toml" 2>/dev/null || true
}

compute_risk_score(){
  local bump_type="$1" depth="$2" usage_count="$3"
  local base_score=0
  case "$bump_type" in
    major) base_score=8 ;;
    minor) base_score=4 ;;
    patch) base_score=2 ;;
    prerelease) base_score=6 ;;
    downgrade) base_score=10 ;;
    *) base_score=1 ;;
  esac
  # Amplify by dependency depth (more dependencies = higher risk)
  local depth_multiplier=$(( depth > 0 ? depth : 1 ))
  local usage_multiplier=$(( usage_count > 0 ? usage_count : 1 ))
  echo "scale=1; $base_score * (1 + $depth_multiplier * 0.2) * (1 + $usage_multiplier * 0.1)" | bc -l 2>/dev/null || echo "$base_score"
}

detect_spdx_license(){
  local cargo_toml="$1"
  local license_field=$(sed -n 's/^license *= *"\(.*\)".*/\1/p' "$cargo_toml" | head -n1)
  # Map common Rust license identifiers to SPDX
  case "$license_field" in
    "MIT") echo "MIT" ;;
    "Apache-2.0") echo "Apache-2.0" ;;
    "MIT OR Apache-2.0") echo "MIT OR Apache-2.0" ;;
    "BSD-3-Clause") echo "BSD-3-Clause" ;;
    "GPL-3.0") echo "GPL-3.0-only" ;;
    "LGPL-2.1") echo "LGPL-2.1-only" ;;
    ""|"NOASSERTION") echo "NOASSERTION" ;;
    *) echo "$license_field" ;; # Pass through unknown
  esac
}

classify_license_severity(){
  local old_license="$1" new_license="$2" file_path="$3"
  
  # Define license compatibility and severity matrices
  local critical_patterns=("GPL" "AGPL" "SSPL" "BUSL" "Commercial")
  local permissive_licenses=("MIT" "Apache-2.0" "BSD" "ISC" "Unlicense")
  
  # Critical: transition to/from copyleft or commercial
  for pattern in "${critical_patterns[@]}"; do
    if [[ "$old_license" == *"$pattern"* || "$new_license" == *"$pattern"* ]]; then
      # If switching between copyleft and permissive
      local old_is_permissive=0 new_is_permissive=0
      for perm in "${permissive_licenses[@]}"; do
        [[ "$old_license" == *"$perm"* ]] && old_is_permissive=1
        [[ "$new_license" == *"$perm"* ]] && new_is_permissive=1
      done
      if [[ $old_is_permissive != $new_is_permissive ]]; then
        echo "critical"; return
      fi
    fi
  done
  
  # Major: license family change or unknown licenses
  if [[ "$old_license" == "NOASSERTION" || "$new_license" == "NOASSERTION" ]]; then
    echo "major"; return
  fi
  
  # Check for license family changes (MIT->Apache, etc)
  local old_family="" new_family=""
  for perm in "${permissive_licenses[@]}"; do
    [[ "$old_license" == *"$perm"* ]] && old_family="permissive"
    [[ "$new_license" == *"$perm"* ]] && new_family="permissive"
  done
  for pattern in "${critical_patterns[@]}"; do
    [[ "$old_license" == *"$pattern"* ]] && old_family="copyleft"
    [[ "$new_license" == *"$pattern"* ]] && new_family="copyleft"
  done
  
  if [[ "$old_family" != "$new_family" && -n "$old_family" && -n "$new_family" ]]; then
    echo "major"; return
  fi
  
  # Minor: version changes within same license (e.g., GPL-2.0 -> GPL-3.0)
  if [[ "${old_license%-*}" == "${new_license%-*}" && "$old_license" != "$new_license" ]]; then
    echo "minor"; return
  fi
  
  # Cosmetic: formatting, case, or trivial changes
  if [[ "${old_license,,}" == "${new_license,,}" ]]; then
    echo "cosmetic"; return
  fi
  
  # Default to minor for unclassified changes
  echo "minor"
}

declare -A new_crates; # shellcheck disable=SC2034 (referenced via indirect loops)
declare -A new_versions; # crate -> version
while IFS= read -r f; do
  name=$(normalize "$f" || true); [[ -n $name ]] && new_crates["$name"]="$f" || true
  if [[ -n $name ]]; then
    ver=$(extract_version "$f" || true)
    [[ -n $ver ]] && new_versions["$name"]="$ver" || true
  fi
done < "$summary_tmp/new.list"

declare -A local_crates; # shellcheck disable=SC2034
declare -A local_versions; # crate -> version
while IFS= read -r f; do
  name=$(normalize "$f" || true); [[ -n $name ]] && local_crates["$name"]="$f" || true
  if [[ -n $name ]]; then
    ver=$(extract_version "$f" || true)
    [[ -n $ver ]] && local_versions["$name"]="$ver" || true
  fi
done < "$summary_tmp/local.list"

added=()
removed=()
modified=()
common=()

for k in "${!new_crates[@]}"; do
  if [[ -z "${local_crates[$k]:-}" ]]; then
    added+=("$k")
  else
    common+=("$k")
  fi
done
for k in "${!local_crates[@]}"; do
  if [[ -z "${new_crates[$k]:-}" ]]; then
    removed+=("$k")
  fi
done

# Detect modifications: compare Cargo.toml content hash for common crates
for k in "${common[@]}"; do
  new_file="${new_crates[$k]}"
  local_file="${local_crates[$k]}"
  if ! diff -q "$new_file" "$local_file" >/dev/null 2>&1; then
    modified+=("$k")
  fi
done

# ---------------- Semantic Version Diff -----------------
# Build an array of objects {crate, previousVersion, newVersion, bumpType}
version_changes_json="[]"
classify_bump(){
  local old="$1" newv="$2"
  [[ -z $old || -z $newv ]] && { echo "unknown"; return; }
  # if versions identical
  [[ "$old" == "$newv" ]] && { echo "none"; return; }
  # basic semver split (ignore build metadata / pre-release nuance beyond simple detection)
  IFS='.' read -r o1 o2 o3 <<<"$old" || true
  IFS='.' read -r n1 n2 n3 <<<"$newv" || true
  # strip possible pre-release tag segment after dash for numeric compare
  o3=${o3%%-*}; n3=${n3%%-*}
  # Detect downgrade
  if [[ $n1 -lt $o1 ]] || { [[ $n1 -eq $o1 && $n2 -lt $o2 ]]; } || { [[ $n1 -eq $o1 && $n2 -eq $o2 && $n3 -lt $o3 ]]; }; then
    echo "downgrade"; return;
  fi
  if [[ $n1 -gt $o1 ]]; then echo "major"; return; fi
  if [[ $n1 -eq $o1 && $n2 -gt $o2 ]]; then echo "minor"; return; fi
  if [[ $n1 -eq $o1 && $n2 -eq $o2 && $n3 -gt $o3 ]]; then echo "patch"; return; fi
  # prerelease detection
  if [[ $newv == *-* ]]; then echo "prerelease"; return; fi
  echo "unknown"
}

tmp_versions_file="${summary_tmp}/version-changes.tmp"
rm -f "$tmp_versions_file"
for crate in "${common[@]}"; do
  oldv="${local_versions[$crate]:-}"
  newv="${new_versions[$crate]:-}"
  [[ -z $newv ]] && continue
  if [[ "$oldv" != "$newv" ]]; then
    bump=$(classify_bump "$oldv" "$newv")
    printf '{"crate":"%s","previousVersion":"%s","newVersion":"%s","bumpType":"%s"}\n' "$crate" "$oldv" "$newv" "$bump" >> "$tmp_versions_file"
  fi
done
if [[ -s "$tmp_versions_file" ]]; then
  version_changes_json=$(jq -s '.' "$tmp_versions_file")
fi

# ---------------- Version Bump Gating -----------------
if (( ALLOW_DOWNGRADES == 0 )); then
  downgrade_crates=()
  while IFS= read -r line; do
    [[ -n $line ]] || continue
    crate=$(echo "$line" | jq -r '.crate')
    bump_type=$(echo "$line" | jq -r '.bumpType')
    if [[ "$bump_type" == "downgrade" ]]; then
      downgrade_crates+=("$crate")
    fi
  done <<< "$(echo "$version_changes_json" | jq -c '.[]?' 2>/dev/null || true)"
  
  if (( ${#downgrade_crates[@]} > 0 )); then
    echo "Version downgrade detected in crates: ${downgrade_crates[*]}" >&2
    echo "This may indicate upstream regression or force-push." >&2
    echo "Use --allow-downgrades to bypass this check." >&2
    exit 5
  fi
fi

# ---------------- Dependency Impact Analysis -----------------
dependency_analysis_json='{}'
if (( GENERATE_DEPENDENCY_ANALYSIS == 1 )); then
  dep_tmp="${summary_tmp}/deps.tmp"
  rm -f "$dep_tmp" && mkdir -p "$dep_tmp"
  
  # Extract dependencies from all Cargo.toml files
  extract_deps(){
    local toml="$1" prefix="$2"
    grep -A 50 '\[dependencies\]' "$toml" 2>/dev/null | sed '/^\[/,$ { /^\[dependencies\]/!d }' | \
      grep -E '^[a-zA-Z0-9_-]+\s*=' | sed "s/^/$prefix:/" || true
  }
  
  # Collect all dependencies before and after
  for crate in "${!new_crates[@]}"; do
    toml="${new_crates[$crate]}"
    extract_deps "$toml" "$crate" >> "$dep_tmp/new_deps.txt"
  done
  for crate in "${!local_crates[@]}"; do
    toml="${local_crates[$crate]}"
    extract_deps "$toml" "$crate" >> "$dep_tmp/local_deps.txt"
  done
  
  # Simple risk scoring: count dependencies per crate, weight by version changes
  declare -A crate_deps
  while IFS=':' read -r crate dep_line; do
    [[ -n $crate && -n $dep_line ]] && crate_deps["$crate"]=$((${crate_deps[$crate]:-0} + 1))
  done < "$dep_tmp/new_deps.txt" 2>/dev/null || true
  
  # Calculate risk scores: base score from dependency count, multiplied by version change severity
  risk_entries=()
  for crate in "${!crate_deps[@]}"; do
    base_score=${crate_deps[$crate]}
    severity_multiplier=1.0
    # Check if this crate has version changes
    if echo "$version_changes_json" | jq -e ".[] | select(.crate==\"$crate\")" >/dev/null 2>&1; then
      bump_type=$(echo "$version_changes_json" | jq -r ".[] | select(.crate==\"$crate\") | .bumpType")
      case "$bump_type" in
        major) severity_multiplier=3.0 ;;
        minor) severity_multiplier=2.0 ;;
        patch) severity_multiplier=1.5 ;;
        downgrade) severity_multiplier=4.0 ;;
        *) severity_multiplier=1.0 ;;
      esac
    fi
    risk_score=$(echo "$base_score * $severity_multiplier" | bc -l 2>/dev/null || echo "$base_score")
    printf '{"crate":"%s","dependencyCount":%d,"severityMultiplier":%s,"riskScore":%s}\n' \
      "$crate" "$base_score" "$severity_multiplier" "$risk_score" >> "$dep_tmp/risk_scores.json"
  done
  
  if [[ -s "$dep_tmp/risk_scores.json" ]]; then
    risk_json=$(jq -s '.' "$dep_tmp/risk_scores.json")
    dependency_analysis_json=$(jq -n --argjson risks "$risk_json" '{riskScores:$risks,generatedAt:(now|todate)}')
  fi
fi

# ---------------- Dependency Impact Analysis -----------------
dependency_impact_json='{}'
if (( ANALYZE_DEPENDENCIES == 1 )); then
  declare -A crate_dependencies
  declare -A crate_usage_count
  # Build dependency graph
  while IFS= read -r f; do
    name=$(normalize "$f" || true)
    [[ -z $name ]] && continue
    deps=$(parse_dependencies "$f")
    while IFS= read -r dep; do
      [[ -n $dep ]] && crate_usage_count["$dep"]=$((${crate_usage_count[$dep]:-0} + 1)) || true
    done <<< "$deps"
    crate_dependencies["$name"]="$deps"
  done < "$summary_tmp/new.list"
  
  # Enhance version changes with risk scores
  if [[ -s "$tmp_versions_file" ]]; then
    enhanced_versions_file="${summary_tmp}/enhanced-versions.tmp"
    rm -f "$enhanced_versions_file"
    while IFS= read -r line; do
      crate=$(echo "$line" | jq -r '.crate')
      bump_type=$(echo "$line" | jq -r '.bumpType')
      deps_list="${crate_dependencies[$crate]:-}"
      dep_count=$(echo "$deps_list" | wc -w | tr -d ' ')
      usage_count=${crate_usage_count[$crate]:-0}
      risk_score=$(compute_risk_score "$bump_type" "$dep_count" "$usage_count")
      echo "$line" | jq --arg risk "$risk_score" '. + {riskScore: ($risk|tonumber)}' >> "$enhanced_versions_file"
    done < "$tmp_versions_file"
    version_changes_json=$(jq -s '.' "$enhanced_versions_file")
  fi
  
  # Compute overall dependency metrics
  total_crates=${#crate_dependencies[@]}
  high_risk_count=$(jq --arg thresh "$RISK_THRESHOLD_HIGH" '[.[] | select(.riskScore >= ($thresh|tonumber))] | length' <<< "$version_changes_json")
  medium_risk_count=$(jq --arg thresh_high "$RISK_THRESHOLD_HIGH" --arg thresh_med "$RISK_THRESHOLD_MEDIUM" '[.[] | select(.riskScore >= ($thresh_med|tonumber) and .riskScore < ($thresh_high|tonumber))] | length' <<< "$version_changes_json")
  
  dependency_impact_json=$(jq -n \
    --arg total "$total_crates" \
    --arg high "$high_risk_count" \
    --arg medium "$medium_risk_count" \
    --arg threshold_high "$RISK_THRESHOLD_HIGH" \
    --arg threshold_medium "$RISK_THRESHOLD_MEDIUM" \
    '{totalCrates: ($total|tonumber), highRiskChanges: ($high|tonumber), mediumRiskChanges: ($medium|tonumber), thresholds: {high: ($threshold_high|tonumber), medium: ($threshold_medium|tonumber)}}')
fi

# ---------------- SPDX SBOM Export -----------------
if (( EXPORT_SPDX_SBOM == 1 )); then
  spdx_packages_tmp="${summary_tmp}/spdx-packages.tmp"
  rm -f "$spdx_packages_tmp"
  
  # Generate SPDX package entries for each crate
  while IFS= read -r f; do
    name=$(normalize "$f" || true)
    version=$(extract_version "$f" || true)
    [[ -z $name || -z $version ]] && continue
    
    license=$(detect_spdx_license "$f")
    # Generate package reference and entry
    pkg_ref="SPDXRef-Package-$name"
    dir_path=$(dirname "$f" | sed "s#^$TMP_STAGE/##")
    
    jq -n \
      --arg spdxid "$pkg_ref" \
      --arg name "$name" \
      --arg version "$version" \
      --arg license "$license" \
      --arg path "$dir_path" \
      '{SPDXID: $spdxid, name: $name, downloadLocation: "NOASSERTION", filesAnalyzed: false, licenseConcluded: $license, licenseDeclared: $license, copyrightText: "NOASSERTION", versionInfo: $version, supplier: "NOASSERTION", packageFileName: $path}' >> "$spdx_packages_tmp"
  done < "$summary_tmp/new.list"
  
  # Build SPDX 2.3 document
  packages_array="[]"
  if [[ -s "$spdx_packages_tmp" ]]; then
    packages_array=$(jq -s '.' "$spdx_packages_tmp")
  fi
  
  spdx_json=$(jq -n \
    --arg doc_name "cortex-code-$UPSTREAM_HEAD_COMMIT" \
    --arg doc_namespace "https://github.com/cortex-os/cortex-os/cortex-code-$UPSTREAM_HEAD_COMMIT" \
    --arg upstream "$UPSTREAM_HEAD_COMMIT" \
    --argfile packages <(echo "$packages_array") \
    '{
      spdxVersion: "SPDX-2.3",
      dataLicense: "CC0-1.0",
      SPDXID: "SPDXRef-DOCUMENT",
      name: $doc_name,
      documentNamespace: $doc_namespace,
      creationInfo: {
        created: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
        creators: ["Tool: cortex-code-sync-" + $upstream]
      },
      packages: $packages,
      relationships: [
        {
          spdxElementId: "SPDXRef-DOCUMENT",
          relationshipType: "DESCRIBES",
          relatedSpdxElement: "SPDXRef-Package-cortex-code-vendor"
        }
      ]
    }')
  
  echo "$spdx_json" > "$SPDX_SBOM_FILE"
  summary_json=$(jq -n --argjson base "$summary_json" --arg spdx "$SPDX_SBOM_FILE" '$base + {spdxSbomFile:$spdx}')
fi

# ---------------- Version Bump Gating -----------------
version_gating_violations=()
bypass_reasons_json="[]"
if (( STRICT_VERSIONING == 1 )) && [[ "$version_changes_json" != "[]" ]]; then
  # Check for policy violations
  downgrades=$(jq -r '.[] | select(.bumpType=="downgrade") | .crate' <<< "$version_changes_json" | tr '\n' ' ' || true)
  major_bumps=$(jq -r '.[] | select(.bumpType=="major") | .crate' <<< "$version_changes_json" | tr '\n' ' ' || true)
  high_risk=$(jq -r '.[] | select(.riskScore >= 8.0) | .crate' <<< "$version_changes_json" | tr '\n' ' ' || true)
  
  if [[ -n "$downgrades" && $ALLOW_DOWNGRADES -eq 0 ]]; then
    version_gating_violations+=("Downgrade detected in crates: $downgrades")
  fi
  
  if [[ -n "$major_bumps" && $ALLOW_MAJOR_BUMPS -eq 0 ]]; then
    version_gating_violations+=("Major version bump detected in crates: $major_bumps")
  fi
  
  if [[ -n "$high_risk" ]]; then
    version_gating_violations+=("High risk changes detected in crates: $high_risk")
  fi
  
  # Convert bypass reasons to JSON
  if (( ${#BYPASS_REASONS[@]} > 0 )); then
    bypass_reasons_json=$(printf '%s\n' "${BYPASS_REASONS[@]}" | jq -R . | jq -s .)
  fi
  
  # Fail if violations and no bypass
  if (( ${#version_gating_violations[@]} > 0 && ${#BYPASS_REASONS[@]} == 0 )); then
    echo "Version gating violations detected:" >&2
    printf '  - %s\n' "${version_gating_violations[@]}" >&2
    echo "Use --bypass-reason '<reason>' to override or adjust gating flags." >&2
    exit 5
  fi
fi

# Add gating info to summary
summary_json=$(jq -n --argjson base "$summary_json" \
  --argjson violations "$(printf '%s\n' "${version_gating_violations[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')" \
  --argjson bypasses "$bypass_reasons_json" \
  '$base + {versionGating:{violations:$violations,bypassReasons:$bypasses,strictMode:'"$STRICT_VERSIONING"'}}')

sorted_json_list(){
  if (($#==0)); then echo -n '[]'; return; fi
  printf '%s\n' "$@" | sort | jq -R . | jq -s .
}

added_json=$(sorted_json_list "${added[@]}" )
removed_json=$(sorted_json_list "${removed[@]}" )
modified_json=$(sorted_json_list "${modified[@]}" )

#############################################
# Compute LOC / churn metrics (scoped path) #
#############################################

# We add changes to index temporarily to leverage numstat between HEAD and index (but commits not yet created)
git add "$LOCAL_PREFIX" UPSTREAM_REF || true

# Use git diff --cached for staged changes (which includes our rsync modifications)
numstat_output=$(git diff --cached --numstat -- "$LOCAL_PREFIX" || true)
loc_added=0; loc_deleted=0; files_changed=0
if [[ -n "$numstat_output" ]]; then
  while IFS=$'\t' read -r a d f; do
    [[ -z "$f" ]] && continue
    if [[ "$a" =~ ^[0-9]+$ ]]; then loc_added=$((loc_added + a)); fi
    if [[ "$d" =~ ^[0-9]+$ ]]; then loc_deleted=$((loc_deleted + d)); fi
    files_changed=$((files_changed + 1))
  done <<< "$numstat_output"
fi

summary_json=$(jq -n \
  --arg upstream "$UPSTREAM_HEAD_COMMIT" \
  --arg prev "$previous_upstream_ref" \
  --argfile added <(echo "$added_json") \
  --argfile removed <(echo "$removed_json") \
  --argfile modified <(echo "$modified_json") \
  --argfile versionChanges <(echo "$version_changes_json") \
  --argfile dependencyAnalysis <(echo "$dependency_analysis_json") \
  --arg locAdded "$loc_added" \
  --arg locDeleted "$loc_deleted" \
  --arg filesChanged "$files_changed" \
  '{upstreamCommit:$upstream, previousUpstream:$prev, added:$added, removed:$removed, modified:$modified, versionChanges:$versionChanges, dependencyAnalysis:$dependencyAnalysis, locAdded:($locAdded|tonumber), locDeleted:($locDeleted|tonumber), filesChanged:($filesChanged|tonumber), generatedAt: now | todate}')

# ---------------- License / Notice Diff -----------------
license_patterns='LICENSE LICENSE.* COPYING NOTICE NOTICE.*'
collect_license_files(){
  local root="$1"; shift
  for p in $license_patterns; do
    find "$root" -maxdepth 6 -type f -name "$p" 2>/dev/null || true
  done | sort -u
}

local_license_list=$(collect_license_files "$LOCAL_PREFIX" | sed "s#^$LOCAL_PREFIX/##")
new_license_list=$(collect_license_files "$TMP_STAGE" | sed "s#^$TMP_STAGE/##")

license_added_json='[]'; license_removed_json='[]'; license_modified_json='[]'
license_severities_json='[]'
if [[ -n $local_license_list || -n $new_license_list ]]; then
  # build associative sets
  declare -A local_lic
  declare -A new_lic
  while IFS= read -r f; do [[ -n $f ]] && local_lic["$f"]=1 || true; done <<< "$local_license_list"
  while IFS= read -r f; do [[ -n $f ]] && new_lic["$f"]=1 || true; done <<< "$new_license_list"
  added_lic=(); removed_lic=(); modified_lic=()
  license_severities_tmp="${summary_tmp}/license-severities.tmp"
  rm -f "$license_severities_tmp"
  
  for k in "${!new_lic[@]}"; do
    if [[ -z "${local_lic[$k]:-}" ]]; then
      added_lic+=("$k")
      printf '{"file":"%s","change":"added","severity":"major"}\n' "$k" >> "$license_severities_tmp"
    else
      # compare content
      if ! diff -q "$LOCAL_PREFIX/$k" "$TMP_STAGE/$k" >/dev/null 2>&1; then
        modified_lic+=("$k")
        # Analyze license content for severity
        old_content=$(head -20 "$LOCAL_PREFIX/$k" 2>/dev/null | tr '\n' ' ' || echo "")
        new_content=$(head -20 "$TMP_STAGE/$k" 2>/dev/null | tr '\n' ' ' || echo "")
        severity=$(classify_license_severity "$old_content" "$new_content" "$k")
        printf '{"file":"%s","change":"modified","severity":"%s"}\n' "$k" "$severity" >> "$license_severities_tmp"
      fi
    fi
  done
  for k in "${!local_lic[@]}"; do
    if [[ -z "${new_lic[$k]:-}" ]]; then
      removed_lic+=("$k")
      printf '{"file":"%s","change":"removed","severity":"major"}\n' "$k" >> "$license_severities_tmp"
    fi
  done
  
  to_json_list(){ if (($#==0)); then echo '[]'; else printf '%s\n' "$@" | sort | jq -R . | jq -s .; fi }
  license_added_json=$(to_json_list "${added_lic[@]}")
  license_removed_json=$(to_json_list "${removed_lic[@]}")
  license_modified_json=$(to_json_list "${modified_lic[@]}")
  
  if [[ -s "$license_severities_tmp" ]]; then
    license_severities_json=$(jq -s '.' "$license_severities_tmp")
  fi
fi

# Merge license changes into existing summary JSON
summary_json=$(jq -n --argjson base "$summary_json" \
  --argjson addedLic "$license_added_json" \
  --argjson removedLic "$license_removed_json" \
  --argjson modifiedLic "$license_modified_json" \
  --argjson severities "$license_severities_json" \
  '$base + {licenseChanges:{added:$addedLic,removed:$removedLic,modified:$modifiedLic,severities:$severities}}')\n\n# ---------------- SPDX SBOM Export (optional) -----------------\nif (( GENERATE_SPDX_SBOM == 1 )); then\n  spdx_tmp=\"${summary_tmp}/spdx\"\n  rm -rf \"$spdx_tmp\" && mkdir -p \"$spdx_tmp\"\n  \n  # Generate SPDX-compliant SBOM\n  for crate in \"${!new_crates[@]}\"; do\n    version=\"${new_versions[$crate]:-unknown}\"\n    toml_path=\"${new_crates[$crate]}\"\n    # Extract license from Cargo.toml if present\n    license=$(grep '^license\\s*=' \"$toml_path\" 2>/dev/null | sed 's/.*=\\s*\"\\([^\"]*\\)\".*/\\1/' || echo \"NOASSERTION\")\n    printf '{\"SPDXID\":\"SPDXRef-%s\",\"name\": \"%s\",\"versionInfo\":\"%s\",\"licenseConcluded\":\"%s\",\"downloadLocation\":\"NOASSERTION\"}\\n' \\\n      \"$crate\" \"$crate\" \"$version\" \"$license\" >> \"$spdx_tmp/packages.json\"\n  done\n  \n  packages_json='[]'\n  if [[ -s \"$spdx_tmp/packages.json\" ]]; then\n    packages_json=$(jq -s '.' \"$spdx_tmp/packages.json\")\n  fi\n  \n  spdx_json=$(jq -n \\\n    --arg docName \"Cortex-OS codex crates SBOM\" \\\n    --arg docNamespace \"https://cortex-os.dev/sbom/cortex-code-$(date +%s)\" \\\n    --arg creationTime \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" \\\n    --argjson packages <(echo \"$packages_json\") \\\n    --arg upstream \"$UPSTREAM_HEAD_COMMIT\" \\\n    '{\n      \"spdxVersion\": \"SPDX-2.3\",\n      \"dataLicense\": \"CC0-1.0\",\n      \"SPDXID\": \"SPDXRef-DOCUMENT\",\n      \"name\": $docName,\n      \"documentNamespace\": $docNamespace,\n      \"creationInfo\": {\n        \"created\": $creationTime,\n        \"creators\": [\"Tool: cortex-code-sync\"]\n      },\n      \"packages\": $packages,\n      \"relationships\": [\n        {\n          \"spdxElementId\": \"SPDXRef-DOCUMENT\",\n          \"relationshipType\": \"DESCRIBES\",\n          \"relatedSpdxElement\": \"SPDXRef-cortex-code\"\n        }\n      ],\n      \"upstreamCommit\": $upstream\n    }')\n  \n  echo \"$spdx_json\" > \"$SPDX_SBOM_FILE\"\n  summary_json=$(jq -n --argjson base \"$summary_json\" --arg spdx \"$SPDX_SBOM_FILE\" '$base + {spdxSbomFile:$spdx}')\nfi

# ---------------- SBOM Delta (optional) -----------------
if (( GENERATE_SBOM_DELTA == 1 )); then
  sbom_tmp="${summary_tmp}/sbom-delta.tmp"
  rm -f "$sbom_tmp"
  # Build arrays referencing versionChanges plus added/removed crates with versions
  added_entries=()
  for c in "${added[@]}"; do
    v="${new_versions[$c]:-}"; printf '{"crate":"%s","newVersion":"%s"}\n' "$c" "$v" >> "$sbom_tmp.add"; done
  removed_entries=()
  for c in "${removed[@]}"; do
    v="${local_versions[$c]:-}"; printf '{"crate":"%s","previousVersion":"%s"}\n' "$c" "$v" >> "$sbom_tmp.rem"; done
  version_changed_entries=()
  if [[ -s "$tmp_versions_file" ]]; then cp "$tmp_versions_file" "$sbom_tmp.ver"; fi
  json_or_empty(){ if [[ -s "$1" ]]; then jq -s '.' "$1"; else echo '[]'; fi }
  sbom_added=$(json_or_empty "$sbom_tmp.add")
  sbom_removed=$(json_or_empty "$sbom_tmp.rem")
  sbom_changed=$(json_or_empty "$sbom_tmp.ver")
  sbom_json=$(jq -n \
    --arg upstream "$UPSTREAM_HEAD_COMMIT" \
    --arg prev "$previous_upstream_ref" \
    --argfile added <(echo "$sbom_added") \
    --argfile removed <(echo "$sbom_removed") \
    --argfile changed <(echo "$sbom_changed") \
    '{upstreamCommit:$upstream, previousUpstream:$prev, added:$added, removed:$removed, versionChanged:$changed, generatedAt: now | todate}')
  echo "$sbom_json" > "$SBOM_DELTA_FILE"
  summary_json=$(jq -n --argjson base "$summary_json" --arg sbom "$SBOM_DELTA_FILE" '$base + {sbomDeltaFile:$sbom}')
fi

echo "$summary_json" > "$SUMMARY_OUTPUT"

# Human-readable markdown summary
md_summary_file="${SUMMARY_OUTPUT%.json}.md"
{
  echo "# Cortex Code Crate Diff"
  echo "Upstream: $UPSTREAM_HEAD_COMMIT  Previous: ${previous_upstream_ref:-<none>}"
  echo
  echo "## Added"; if ((${#added[@]}==0)); then echo "_None_"; else printf '* %s\n' "${added[@]}" | sort; fi
  echo
  echo "## Removed"; if ((${#removed[@]}==0)); then echo "_None_"; else printf '* %s\n' "${removed[@]}" | sort; fi
  echo
  echo "## Modified"; if ((${#modified[@]}==0)); then echo "_None_"; else printf '* %s\n' "${modified[@]}" | sort; fi
} > "$md_summary_file"

if [[ $PRINT_CHANGED -eq 1 ]]; then
  echo "Changed crates summary:" >&2
  echo "$summary_json" | jq '.added + .removed + .modified' >&2
fi

BRANCH_NAME=${CUSTOM_BRANCH:-"sync/cortex-code-${UPSTREAM_HEAD_COMMIT:0:12}"}
log "Creating branch $BRANCH_NAME"
git checkout -b "$BRANCH_NAME" >/dev/null 2>&1 || git checkout "$BRANCH_NAME" >/dev/null 2>&1

git add "$LOCAL_PREFIX" UPSTREAM_REF "$SUMMARY_OUTPUT" "${md_summary_file}"
if [[ -f "$SBOM_DELTA_FILE" ]]; then git add "$SBOM_DELTA_FILE"; fi
if [[ -f "$SPDX_SBOM_FILE" ]]; then git add "$SPDX_SBOM_FILE"; fi
if git diff --cached --quiet; then
  log "Nothing staged after rsync (race?) aborting."; exit 0
fi

label_hint=""
if (( ${#added[@]} > 0 )); then label_hint+=" added:${#added[@]}"; fi
if (( ${#removed[@]} > 0 )); then label_hint+=" removed:${#removed[@]}"; fi
if (( ${#modified[@]} > 0 )); then label_hint+=" modified:${#modified[@]}"; fi

base_commit_msg_header=$(cat <<EOF
Upstream repo: $UPSTREAM_REPO_URL
Subdirectory:  $UPSTREAM_SUBDIR
Commit:        $UPSTREAM_HEAD_COMMIT
Previous:      ${previous_upstream_ref:-<none>}
LOC Added:     $loc_added
LOC Deleted:   $loc_deleted
Files Changed: $files_changed
Risk Analysis: $(jq -r '.dependencyImpact | "High: \(.highRiskChanges // 0), Medium: \(.mediumRiskChanges // 0), Total: \(.totalCrates // 0)"' <<< "$summary_json" || echo "unavailable")
License Impact: $(jq -r '.licenseChanges.severities | group_by(.severity) | map("\(.[0].severity): \(length)") | join(", ")' <<< "$summary_json" 2>/dev/null || echo "none")
Artifacts:
 - $SUMMARY_OUTPUT (machine readable)
 - ${md_summary_file} (human summary)$(if [[ -f "$SBOM_DELTA_FILE" ]]; then echo "\n - $SBOM_DELTA_FILE (SBOM delta)"; fi)$(if [[ -f "$SPDX_SBOM_FILE" ]]; then echo "\n - $SPDX_SBOM_FILE (SPDX SBOM)"; fi)
EOF
)

commit_group(){
  local title="$1"; shift
  local items=($@)
  local body_list="none"
  if (( ${#items[@]} > 0 )); then body_list=$(printf '%s ' "${items[@]}" | sed 's/ $//'); fi
  printf 'chore(cortex-code): vendor %s from upstream codex\n\n%s\n\n%s: %s\n\nUpdate performed via scripts/sync-cortex-code.sh\n' \
    "$title" "$base_commit_msg_header" "$title" "$body_list"
}

if (( SPLIT_COMMITS == 1 )); then
  log "Creating grouped commits per change category"
  # We rely on the staged snapshot; selectively commit subsets using pathspec filters based on crate directories
  # Build mapping crate->relative path (from new snapshot)
  declare -A crate_dir_map # shellcheck disable=SC2034
  while IFS= read -r f; do
    name=$(normalize "$f" || true); [[ -z $name ]] && continue
    dir=$(dirname "$f")
    crate_dir_map[$name]="$dir"
  done < "$summary_tmp/new.list"

  # Function to commit a set of crates for a category
  commit_crate_category(){
    local category="$1"; shift
    local crates=($@)
    (( ${#crates[@]} == 0 )) && return 0
    git reset HEAD "$LOCAL_PREFIX" >/dev/null 2>&1 || true
    paths=()
    for c in "${crates[@]}"; do
      p="${crate_dir_map[$c]:-}"
      [[ -n $p ]] && paths+=("$p") || true
    done
    if (( ${#paths[@]} == 0 )); then return 0; fi
    git add "${paths[@]}" "$SUMMARY_OUTPUT" "$md_summary_file" UPSTREAM_REF || true
    msg=$(commit_group "$category" "${crates[@]}")
    git commit -m "$msg" >/dev/null || true
  }

  commit_crate_category "added crates" "${added[@]}"
  commit_crate_category "removed crates" "${removed[@]}"
  commit_crate_category "modified crates" "${modified[@]}"

  # If any remaining staged (catch-all) changes exist (e.g., shared workspace files), commit them
  if ! git diff --cached --quiet; then
    git commit -m "chore(cortex-code): vendor misc adjustments\n\n$base_commit_msg_header\n\nUpdate performed via scripts/sync-cortex-code.sh" >/dev/null
  fi
else
  COMMIT_MSG=$(cat <<EOF
chore(cortex-code): vendor update from upstream codex$label_hint

$base_commit_msg_header

Added crates:    ${added[*]:-none}
Removed crates:  ${removed[*]:-none}
Modified crates: ${modified[*]:-none}

Update performed via scripts/sync-cortex-code.sh
EOF
)
  git commit -m "$COMMIT_MSG" >/dev/null
fi

log "Vendor update committed(s). Push with: git push origin $BRANCH_NAME";
exit 0
