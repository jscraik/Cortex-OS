#!/usr/bin/env bats

setup() {
  tmpdir=$(mktemp -d)
  repo="$tmpdir/repo"
  mkdir "$repo"
  cd "$repo"
  git init >/dev/null
  echo '{}' > package.json
  git add package.json
  git commit -m "init" >/dev/null
  mockbin="$tmpdir/bin"
  mkdir "$mockbin"
  PATH="$mockbin:$PATH"
  cat >"$mockbin/gh" <<'SCRIPT'
#!/usr/bin/env bash
exit 0
SCRIPT
  chmod +x "$mockbin/gh"
  cat >"$mockbin/pnpm" <<'SCRIPT'
#!/usr/bin/env bash
echo pnpm up
SCRIPT
  chmod +x "$mockbin/pnpm"
}

teardown() {
  cd /
  rm -rf "$tmpdir"
}

@test "auto_remediate exits when no changes" {
  run bash "${BATS_TEST_DIRNAME}/../auto_remediate.sh"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "No changes to remediate" ]]
}
