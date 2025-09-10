#!/usr/bin/env bash
set -euo pipefail

echo "[codex:doctor] Environment diagnostics"

REQ_RUST_MIN="1.82.0" # Anticipated stable for edition 2024; adjust if earlier stabilized

have() { command -v "$1" >/dev/null 2>&1; }

version_ge() { # returns 0 if $1 >= $2
  [ "$1" = "$2" ] && return 0
  local IFS=.
  local i ver1=($1) ver2=($2)
  # fill empty fields in ver1 with zeros
  for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
    ver1[i]=0
  done
  for ((i=0; i<${#ver1[@]}; i++)); do
    if [[ -z ${ver2[i]} ]]; then
      # fill empty fields in ver2 with zeros
      ver2[i]=0
    fi
    if ((10#${ver1[i]} > 10#${ver2[i]})); then
      return 0
    fi
    if ((10#${ver1[i]} < 10#${ver2[i]})); then
      return 1
    fi
  done
  return 0
}

rust_ver="(missing)"
if have rustc; then
  rust_ver=$(rustc --version | awk '{print $2}')
  echo "rustc version: $rust_ver"
else
  echo "rustc: MISSING"
fi

if have cargo; then
  echo "cargo version: $(cargo --version | awk '{print $2}')"
else
  echo "cargo: MISSING"
fi

if have rustup; then
  echo "active toolchain: $(rustup show active-toolchain 2>/dev/null || echo unknown)"
fi

if version_ge "$rust_ver" "$REQ_RUST_MIN"; then
  echo "rustc meets minimum ($REQ_RUST_MIN) for edition 2024"
else
  echo "WARNING: rustc < $REQ_RUST_MIN — edition 2024 crates may fail to compile. Run: rustup update stable OR use nightly."
fi

for tool in grcov cargo-llvm-cov llvm-profdata llvm-cov; do
  if have "$tool"; then
    echo "$tool: OK ($(command -v $tool))"
  else
    echo "$tool: MISSING"
  fi
done

echo
echo "Codex workspace edition declarations (unique values):"
grep -R "^edition = \"" apps/cortex-codex --include "Cargo.toml" | cut -d'=' -f2 | tr -d ' "' | sort -u || true

echo
echo "Suggested next steps:"
echo "  rustup toolchain install nightly --component clippy rustfmt rust-src"
echo "  rustup override set nightly (inside apps/cortex-codex)"
echo "  pnpm codex:test:unit"

echo "[codex:doctor] Done"
