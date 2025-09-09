#!/usr/bin/env bats

setup() {
  export PATH="$BATS_TEST_TMPDIR:$PATH"
  cat <<'EOS' > "$BATS_TEST_TMPDIR/cloudflared"
#!/usr/bin/env bash
echo "$@" > "$BATS_TEST_TMPDIR/args"
echo "https://example.trycloudflare.com" >&2
exit 0
EOS
  chmod +x "$BATS_TEST_TMPDIR/cloudflared"
}

@test "defaults edge ip version to 4" {
  run bash "${BATS_TEST_DIRNAME}/../run-quick-tunnel.sh" mcp 8080
  args=$(cat "$BATS_TEST_TMPDIR/args")
  [[ "$args" == *"--edge-ip-version"*"4"* ]]
}

@test "allows EDGE_IP_VERSION override" {
  EDGE_IP_VERSION=6 run bash "${BATS_TEST_DIRNAME}/../run-quick-tunnel.sh" mcp 8080
  args=$(cat "$BATS_TEST_TMPDIR/args")
  [[ "$args" == *"--edge-ip-version"*"6"* ]]
}
