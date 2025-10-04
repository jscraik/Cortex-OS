#!/bin/bash
# cleanup-duplicate-configs.sh
# Remove duplicate config.rs files that don't match the canonical version

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CANONICAL_CONFIG="$REPO_ROOT/apps/cortex-code/core/src/config.rs"

echo "🔍 Scanning for duplicate config.rs files..."

# Find all config.rs files
duplicates=$(find "$REPO_ROOT" -name "config.rs" -path "*/core/src/config.rs" -not -path "$CANONICAL_CONFIG" | sort)

if [[ -z "$duplicates" ]]; then
    echo "✅ No duplicate config.rs files found"
    exit 0
fi

echo "📋 Found duplicate config.rs files:"
echo "$duplicates"
echo ""

# Check if they differ from canonical
different_files=()
identical_files=()

while IFS= read -r file; do
    if [[ -n "$file" ]]; then
        if ! diff -q "$CANONICAL_CONFIG" "$file" >/dev/null 2>&1; then
            different_files+=("$file")
        else
            identical_files+=("$file")
        fi
    fi
done <<< "$duplicates"

# Handle identical files (safe to remove)
if [[ ${#identical_files[@]} -gt 0 ]]; then
    echo "🗑️  Removing identical duplicate files:"
    for file in "${identical_files[@]}"; do
        echo "  - $file"
        rm -f "$file"
    done
    echo ""
fi

# Handle different files (require manual review)
if [[ ${#different_files[@]} -gt 0 ]]; then
    echo "⚠️  Found files that differ from canonical version:"
    for file in "${different_files[@]}"; do
        echo "  - $file"

        # Show diff summary
        echo "    Differences:"
        diff --unified=1 "$CANONICAL_CONFIG" "$file" | head -20 | sed 's/^/      /' || true
        echo ""

        # Move to .bak for manual review
        backup_file="${file}.bak"
        mv "$file" "$backup_file"
        echo "    → Moved to $backup_file for manual review"
        echo ""
    done

    echo "📝 Manual action required:"
    echo "   Review .bak files and either:"
    echo "   1. Delete them if changes are obsolete"
    echo "   2. Merge important changes back to canonical config"
    echo "   3. Document why they need to differ (if they should)"
    echo ""
fi

# Check for any Cargo.toml files that might reference removed configs
echo "🔍 Checking for stale Cargo.toml references..."
stale_refs=$(find "$REPO_ROOT" -name "Cargo.toml" -exec grep -l "codex-core.*path.*core" {} \; | sort)

if [[ -n "$stale_refs" ]]; then
    echo "📋 Cargo.toml files with codex-core path dependencies:"
    echo "$stale_refs"
    echo ""
    echo "💡 Verify these still reference valid paths after cleanup"
else
    echo "✅ No stale Cargo.toml references found"
fi

echo "🎉 Config cleanup completed!"
