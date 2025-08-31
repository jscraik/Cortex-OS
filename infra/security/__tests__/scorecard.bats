#!/usr/bin/env bats

setup() {
  tmpdir=$(mktemp -d)
  PATH="$tmpdir:$PATH"
}

teardown() {
  rm -rf "$tmpdir"
}

@test "scorecard aggregates audit counts" {
  cat >"$tmpdir/pnpm" <<'SCRIPT'
#!/usr/bin/env bash
echo '{"advisories":[1,2]}'
SCRIPT
  chmod +x "$tmpdir/pnpm"
  cat >"$tmpdir/pip-audit" <<'SCRIPT'
#!/usr/bin/env bash
echo '[{"id":1}]'
SCRIPT
  chmod +x "$tmpdir/pip-audit"
  run bash "${BATS_TEST_DIRNAME}/../scorecard.sh"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "SECURITY_SCORE=97" ]]
}

@test "scorecard handles non-numeric audit output" {
  cat >"$tmpdir/pnpm" <<'SCRIPT'
#!/usr/bin/env bash
echo 'not-json'
SCRIPT
  chmod +x "$tmpdir/pnpm"
  run bash "${BATS_TEST_DIRNAME}/../scorecard.sh"
  [ "$status" -eq 0 ]
  [[ "$output" =~ "SECURITY_SCORE=100" ]]
}
